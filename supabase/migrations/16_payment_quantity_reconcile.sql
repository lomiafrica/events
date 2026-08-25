-- Migration: Reconcile purchase quantity with amount paid on Lomi webhook,
-- and surface remaining paid amount vs quantity mismatches in admin.

CREATE OR REPLACE FUNCTION public.record_event_lomi_payment(
    p_purchase_id UUID,
    p_lomi_payment_id TEXT,
    p_lomi_checkout_session_id TEXT,
    p_payment_status TEXT,
    p_lomi_event_payload JSONB,
    p_amount_paid NUMERIC,
    p_currency_paid TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_current_status TEXT;
    v_checkout_session TEXT;
    v_price NUMERIC;
    v_qty INTEGER;
    v_lomi_qty INTEGER;
    v_implied_qty INTEGER;
    v_new_qty INTEGER;
    v_qty_raw TEXT;
BEGIN
    v_checkout_session := NULLIF(p_lomi_checkout_session_id, '');

    SELECT status, price_per_ticket, quantity
    INTO v_current_status, v_price, v_qty
    FROM public.purchases
    WHERE id = p_purchase_id;

    IF NOT FOUND THEN
        RAISE WARNING 'Purchase ID % not found during record_event_lomi_payment. Lomi Event: %', p_purchase_id, p_lomi_event_payload;
        RETURN;
    END IF;

    IF v_current_status = 'paid' AND p_payment_status = 'paid' THEN
        RAISE NOTICE 'Purchase % already marked as paid, skipping duplicate payment recording', p_purchase_id;
        RETURN;
    END IF;

    v_new_qty := v_qty;

    IF p_payment_status = 'paid'
       AND COALESCE(v_price, 0) > 0
       AND COALESCE(p_amount_paid, 0) > 0 THEN
        IF (p_amount_paid % v_price) = 0 THEN
            v_implied_qty := (p_amount_paid / v_price)::INTEGER;
            IF v_implied_qty < 1 THEN
                v_implied_qty := NULL;
            END IF;
        END IF;

        v_qty_raw := NULLIF(TRIM(p_lomi_event_payload #>> '{data,quantity}'), '');
        IF v_qty_raw IS NOT NULL THEN
            BEGIN
                v_lomi_qty := FLOOR(v_qty_raw::NUMERIC)::INTEGER;
                IF v_lomi_qty < 1 THEN
                    v_lomi_qty := NULL;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                v_lomi_qty := NULL;
            END;
        END IF;

        IF v_lomi_qty IS NOT NULL AND v_implied_qty IS NOT NULL AND v_lomi_qty = v_implied_qty THEN
            v_new_qty := v_lomi_qty;
        ELSIF v_implied_qty IS NOT NULL THEN
            v_new_qty := v_implied_qty;
        ELSIF v_lomi_qty IS NOT NULL AND (v_lomi_qty::NUMERIC * v_price) = p_amount_paid THEN
            v_new_qty := v_lomi_qty;
        ELSE
            RAISE NOTICE 'Purchase % paid amount % does not reconcile with unit price % (recorded qty %); leaving quantity unchanged',
                p_purchase_id, p_amount_paid, v_price, v_qty;
        END IF;

        IF v_new_qty IS DISTINCT FROM v_qty THEN
            RAISE NOTICE 'Purchase % quantity reconciled from % to % based on amount paid %',
                p_purchase_id, v_qty, v_new_qty, p_amount_paid;
        END IF;
    END IF;

    UPDATE public.purchases
    SET
        status = p_payment_status,
        lomi_session_id = COALESCE(v_checkout_session, lomi_session_id),
        quantity = v_new_qty,
        total_amount = p_amount_paid,
        currency_code = p_currency_paid,
        payment_processor_details = p_lomi_event_payload,
        updated_at = NOW()
    WHERE id = p_purchase_id;

    RAISE NOTICE 'Purchase % status updated to % via Lomi webhook', p_purchase_id, p_payment_status;
END;
$$;

COMMENT ON FUNCTION public.record_event_lomi_payment(UUID, TEXT, TEXT, TEXT, JSONB, NUMERIC, TEXT)
IS 'Records Lomi payment. When paid amount is a clean multiple of unit price (or matches Lomi quantity), updates purchases.quantity so tickets issued match money collected.';

GRANT EXECUTE ON FUNCTION public.record_event_lomi_payment(UUID, TEXT, TEXT, TEXT, JSONB, NUMERIC, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_purchase_amount_quantity_mismatch(
    p_status TEXT,
    p_event_id TEXT,
    p_quantity INTEGER,
    p_price_per_ticket NUMERIC,
    p_total_amount NUMERIC
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
    SELECT
        p_status = 'paid'
        AND COALESCE(TRIM(p_event_id), '') <> ''
        AND COALESCE(p_price_per_ticket, 0) > 0
        AND COALESCE(p_quantity, 0) > 0
        AND COALESCE(p_total_amount, 0) <> (p_quantity::NUMERIC * p_price_per_ticket);
$$;

COMMENT ON FUNCTION public.admin_purchase_amount_quantity_mismatch(TEXT, TEXT, INTEGER, NUMERIC, NUMERIC)
IS 'TRUE when a paid event ticket row has total_amount not equal to quantity * price_per_ticket.';

DROP FUNCTION IF EXISTS public.get_admin_purchases();

CREATE OR REPLACE FUNCTION public.get_admin_purchases()
RETURNS TABLE(
    purchase_id UUID,
    customer_id UUID,
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    event_id TEXT,
    event_title TEXT,
    event_date_text TEXT,
    event_time_text TEXT,
    event_venue_name TEXT,
    ticket_type_id TEXT,
    ticket_name TEXT,
    quantity INTEGER,
    price_per_ticket NUMERIC,
    total_amount NUMERIC,
    currency_code TEXT,
    status TEXT,
    email_dispatch_status TEXT,
    email_dispatch_attempts INTEGER,
    email_dispatch_error TEXT,
    unique_ticket_identifier TEXT,
    created_at TIMESTAMPTZ,
    pdf_ticket_sent_at TIMESTAMPTZ,
    used_at TIMESTAMPTZ,
    is_used BOOLEAN,
    verified_by TEXT,
    scanned_count BIGINT,
    is_bundle BOOLEAN,
    tickets_per_bundle INTEGER,
    admission_total INTEGER,
    abandonment_resolved_by_paid_order BOOLEAN,
    recovery_email_eligible BOOLEAN,
    amount_quantity_mismatch BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id AS purchase_id,
        p.customer_id,
        c.name AS customer_name,
        c.email AS customer_email,
        c.phone AS customer_phone,
        p.event_id,
        p.event_title,
        p.event_date_text,
        p.event_time_text,
        p.event_venue_name,
        p.ticket_type_id,
        p.ticket_name,
        p.quantity,
        p.price_per_ticket,
        p.total_amount,
        p.currency_code,
        p.status,
        p.email_dispatch_status,
        p.email_dispatch_attempts,
        p.email_dispatch_error,
        p.unique_ticket_identifier,
        p.created_at,
        p.pdf_ticket_sent_at,
        p.used_at,
        p.is_used,
        p.verified_by,
        (
            CASE
                WHEN EXISTS (
                    SELECT 1 FROM public.individual_tickets it0 WHERE it0.purchase_id = p.id
                ) THEN
                    (
                        SELECT COUNT(*)::BIGINT
                        FROM public.individual_tickets it
                        WHERE it.purchase_id = p.id AND it.is_used = TRUE
                    )
                ELSE
                    p.use_count::BIGINT
            END
        ) AS scanned_count,
        COALESCE(p.is_bundle, FALSE) AS is_bundle,
        COALESCE(NULLIF(p.tickets_per_bundle, 0), 1) AS tickets_per_bundle,
        (
            CASE
                WHEN COALESCE(p.is_bundle, FALSE) THEN
                    p.quantity * GREATEST(COALESCE(NULLIF(p.tickets_per_bundle, 0), 1), 1)
                ELSE
                    GREATEST(p.quantity, 1)
            END
        )::INTEGER AS admission_total,
        public.admin_purchase_has_paid_counterpart(p.id, p.event_id, p.customer_id, c.email)
          AS abandonment_resolved_by_paid_order,
        (
          p.status = 'payment_failed'
          AND NOT public.admin_purchase_has_paid_counterpart(p.id, p.event_id, p.customer_id, c.email)
          AND public.admin_email_is_valid_for_recovery(c.email)
        ) AS recovery_email_eligible,
        public.admin_purchase_amount_quantity_mismatch(
            p.status, p.event_id, p.quantity, p.price_per_ticket, p.total_amount
        ) AS amount_quantity_mismatch
    FROM public.purchases p
    INNER JOIN public.customers c ON p.customer_id = c.id
    ORDER BY p.created_at DESC
    LIMIT 100;
END;
$$;

DROP FUNCTION IF EXISTS public.search_admin_purchases(text);

CREATE OR REPLACE FUNCTION public.search_admin_purchases(
    p_search_query TEXT
)
RETURNS TABLE(
    purchase_id UUID,
    customer_id UUID,
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    event_id TEXT,
    event_title TEXT,
    event_date_text TEXT,
    event_time_text TEXT,
    event_venue_name TEXT,
    ticket_type_id TEXT,
    ticket_name TEXT,
    quantity INTEGER,
    price_per_ticket NUMERIC,
    total_amount NUMERIC,
    currency_code TEXT,
    status TEXT,
    email_dispatch_status TEXT,
    email_dispatch_attempts INTEGER,
    email_dispatch_error TEXT,
    unique_ticket_identifier TEXT,
    created_at TIMESTAMPTZ,
    pdf_ticket_sent_at TIMESTAMPTZ,
    used_at TIMESTAMPTZ,
    is_used BOOLEAN,
    verified_by TEXT,
    scanned_count BIGINT,
    is_bundle BOOLEAN,
    tickets_per_bundle INTEGER,
    admission_total INTEGER,
    abandonment_resolved_by_paid_order BOOLEAN,
    recovery_email_eligible BOOLEAN,
    amount_quantity_mismatch BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id AS purchase_id,
        p.customer_id,
        c.name AS customer_name,
        c.email AS customer_email,
        c.phone AS customer_phone,
        p.event_id,
        p.event_title,
        p.event_date_text,
        p.event_time_text,
        p.event_venue_name,
        p.ticket_type_id,
        p.ticket_name,
        p.quantity,
        p.price_per_ticket,
        p.total_amount,
        p.currency_code,
        p.status,
        p.email_dispatch_status,
        p.email_dispatch_attempts,
        p.email_dispatch_error,
        p.unique_ticket_identifier,
        p.created_at,
        p.pdf_ticket_sent_at,
        p.used_at,
        p.is_used,
        p.verified_by,
        (
            CASE
                WHEN EXISTS (
                    SELECT 1 FROM public.individual_tickets it0 WHERE it0.purchase_id = p.id
                ) THEN
                    (
                        SELECT COUNT(*)::BIGINT
                        FROM public.individual_tickets it
                        WHERE it.purchase_id = p.id AND it.is_used = TRUE
                    )
                ELSE
                    p.use_count::BIGINT
            END
        ) AS scanned_count,
        COALESCE(p.is_bundle, FALSE) AS is_bundle,
        COALESCE(NULLIF(p.tickets_per_bundle, 0), 1) AS tickets_per_bundle,
        (
            CASE
                WHEN COALESCE(p.is_bundle, FALSE) THEN
                    p.quantity * GREATEST(COALESCE(NULLIF(p.tickets_per_bundle, 0), 1), 1)
                ELSE
                    GREATEST(p.quantity, 1)
            END
        )::INTEGER AS admission_total,
        public.admin_purchase_has_paid_counterpart(p.id, p.event_id, p.customer_id, c.email)
          AS abandonment_resolved_by_paid_order,
        (
          p.status = 'payment_failed'
          AND NOT public.admin_purchase_has_paid_counterpart(p.id, p.event_id, p.customer_id, c.email)
          AND public.admin_email_is_valid_for_recovery(c.email)
        ) AS recovery_email_eligible,
        public.admin_purchase_amount_quantity_mismatch(
            p.status, p.event_id, p.quantity, p.price_per_ticket, p.total_amount
        ) AS amount_quantity_mismatch
    FROM public.purchases p
    INNER JOIN public.customers c ON p.customer_id = c.id
    WHERE
        LOWER(c.name) LIKE LOWER('%' || p_search_query || '%') OR
        LOWER(c.email) LIKE LOWER('%' || p_search_query || '%') OR
        LOWER(p.event_title) LIKE LOWER('%' || p_search_query || '%') OR
        LOWER(p.id::text) LIKE LOWER('%' || p_search_query || '%') OR
        LOWER(p.unique_ticket_identifier) LIKE LOWER('%' || p_search_query || '%')
    ORDER BY p.created_at DESC
    LIMIT 50;
END;
$$;

DROP FUNCTION IF EXISTS public.get_admin_purchases_by_event(text);

CREATE OR REPLACE FUNCTION public.get_admin_purchases_by_event(
    p_event_id TEXT
)
RETURNS TABLE(
    purchase_id UUID,
    customer_id UUID,
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    event_id TEXT,
    event_title TEXT,
    event_date_text TEXT,
    event_time_text TEXT,
    event_venue_name TEXT,
    ticket_type_id TEXT,
    ticket_name TEXT,
    quantity INTEGER,
    price_per_ticket NUMERIC,
    total_amount NUMERIC,
    currency_code TEXT,
    status TEXT,
    email_dispatch_status TEXT,
    email_dispatch_attempts INTEGER,
    email_dispatch_error TEXT,
    unique_ticket_identifier TEXT,
    created_at TIMESTAMPTZ,
    pdf_ticket_sent_at TIMESTAMPTZ,
    used_at TIMESTAMPTZ,
    is_used BOOLEAN,
    verified_by TEXT,
    scanned_count BIGINT,
    is_bundle BOOLEAN,
    tickets_per_bundle INTEGER,
    admission_total INTEGER,
    abandonment_resolved_by_paid_order BOOLEAN,
    recovery_email_eligible BOOLEAN,
    amount_quantity_mismatch BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id AS purchase_id,
        p.customer_id,
        c.name AS customer_name,
        c.email AS customer_email,
        c.phone AS customer_phone,
        p.event_id,
        p.event_title,
        p.event_date_text,
        p.event_time_text,
        p.event_venue_name,
        p.ticket_type_id,
        p.ticket_name,
        p.quantity,
        p.price_per_ticket,
        p.total_amount,
        p.currency_code,
        p.status,
        p.email_dispatch_status,
        p.email_dispatch_attempts,
        p.email_dispatch_error,
        p.unique_ticket_identifier,
        p.created_at,
        p.pdf_ticket_sent_at,
        p.used_at,
        p.is_used,
        p.verified_by,
        (
            CASE
                WHEN EXISTS (
                    SELECT 1 FROM public.individual_tickets it0 WHERE it0.purchase_id = p.id
                ) THEN
                    (
                        SELECT COUNT(*)::BIGINT
                        FROM public.individual_tickets it
                        WHERE it.purchase_id = p.id AND it.is_used = TRUE
                    )
                ELSE
                    p.use_count::BIGINT
            END
        ) AS scanned_count,
        COALESCE(p.is_bundle, FALSE) AS is_bundle,
        COALESCE(NULLIF(p.tickets_per_bundle, 0), 1) AS tickets_per_bundle,
        (
            CASE
                WHEN COALESCE(p.is_bundle, FALSE) THEN
                    p.quantity * GREATEST(COALESCE(NULLIF(p.tickets_per_bundle, 0), 1), 1)
                ELSE
                    GREATEST(p.quantity, 1)
            END
        )::INTEGER AS admission_total,
        public.admin_purchase_has_paid_counterpart(p.id, p.event_id, p.customer_id, c.email)
          AS abandonment_resolved_by_paid_order,
        (
          p.status = 'payment_failed'
          AND NOT public.admin_purchase_has_paid_counterpart(p.id, p.event_id, p.customer_id, c.email)
          AND public.admin_email_is_valid_for_recovery(c.email)
        ) AS recovery_email_eligible,
        public.admin_purchase_amount_quantity_mismatch(
            p.status, p.event_id, p.quantity, p.price_per_ticket, p.total_amount
        ) AS amount_quantity_mismatch
    FROM public.purchases p
    INNER JOIN public.customers c ON p.customer_id = c.id
    WHERE p.event_id = p_event_id
    ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_purchase_amount_quantity_mismatch(TEXT, TEXT, INTEGER, NUMERIC, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_purchases() TO service_role;
GRANT EXECUTE ON FUNCTION public.search_admin_purchases(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_purchases_by_event(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_purchases() TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_admin_purchases(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_purchases_by_event(TEXT) TO authenticated;

COMMENT ON FUNCTION public.get_admin_purchases()
IS 'Admin purchases list; admission_total expands bundles; amount_quantity_mismatch flags paid event tickets whose total does not match quantity * unit price.';

COMMENT ON FUNCTION public.search_admin_purchases(TEXT)
IS 'Search admin purchases; includes amount_quantity_mismatch for paid event tickets.';

COMMENT ON FUNCTION public.get_admin_purchases_by_event(TEXT)
IS 'Purchases for one event; includes amount_quantity_mismatch for paid event tickets.';
