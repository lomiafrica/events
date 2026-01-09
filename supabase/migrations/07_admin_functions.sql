-- Migration: Admin Functions
-- This adds the necessary RPC functions for the admin panel

-- Function to get all purchases for admin view
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
    verified_by TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as purchase_id,
        p.customer_id,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
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
        p.verified_by
    FROM public.purchases p
    INNER JOIN public.customers c ON p.customer_id = c.id
    ORDER BY p.created_at DESC
    LIMIT 100; -- Limit to prevent performance issues
END;
$$;

-- Function to search purchases for admin view
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
    verified_by TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as purchase_id,
        p.customer_id,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
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
        p.verified_by
    FROM public.purchases p
    INNER JOIN public.customers c ON p.customer_id = c.id
    WHERE 
        LOWER(c.name) LIKE LOWER('%' || p_search_query || '%') OR
        LOWER(c.email) LIKE LOWER('%' || p_search_query || '%') OR
        LOWER(p.event_title) LIKE LOWER('%' || p_search_query || '%') OR
        LOWER(p.id::text) LIKE LOWER('%' || p_search_query || '%') OR
        LOWER(p.unique_ticket_identifier) LIKE LOWER('%' || p_search_query || '%')
    ORDER BY p.created_at DESC
    LIMIT 50; -- Limit search results
END;
$$;

-- Function to update customer information for resending emails
-- Handles the case where the target email already exists for another customer
CREATE OR REPLACE FUNCTION public.update_customer_for_resend(
    p_customer_id UUID,
    p_new_email TEXT,
    p_new_name TEXT,
    p_new_phone TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    existing_customer_id UUID;
    current_customer_record RECORD;
BEGIN
    -- Get current customer details
    SELECT id, name, email, phone INTO current_customer_record
    FROM public.customers
    WHERE id = p_customer_id;

    IF NOT FOUND THEN
        RAISE WARNING 'Customer ID % not found during update_customer_for_resend', p_customer_id;
        RETURN;
    END IF;

    -- Check if the new email already exists for another customer
    SELECT id INTO existing_customer_id
    FROM public.customers
    WHERE email = p_new_email AND id != p_customer_id;

    IF FOUND THEN
        -- Email exists for another customer, check if details are very similar
        -- (same name, same phone number - suggesting it's the same person)
        IF LOWER(TRIM(COALESCE(current_customer_record.name, ''))) = LOWER(TRIM(COALESCE(p_new_name, '')))
           AND (
               (current_customer_record.phone IS NULL AND (p_new_phone IS NULL OR p_new_phone = '')) OR
               (p_new_phone IS NOT NULL AND p_new_phone != '' AND current_customer_record.phone = p_new_phone)
           ) THEN
            -- Very similar customer details, assume it's the same person
            -- Reassign this purchase to the existing customer and delete the duplicate
            UPDATE public.purchases
            SET customer_id = existing_customer_id, updated_at = NOW()
            WHERE customer_id = p_customer_id;

            -- Delete the duplicate customer record
            DELETE FROM public.customers WHERE id = p_customer_id;

            RAISE NOTICE 'Merged duplicate customer % into existing customer % (same email and matching details)', p_customer_id, existing_customer_id;
        ELSE
            -- Email exists but details don't match - cannot automatically merge
            RAISE EXCEPTION 'Email % already exists for a different customer. Manual review required.', p_new_email;
        END IF;
    ELSE
        -- Email doesn't exist, safe to update normally
        UPDATE public.customers
        SET
            email = p_new_email,
            name = p_new_name,
            phone = COALESCE(NULLIF(p_new_phone, ''), phone),
            updated_at = NOW()
        WHERE id = p_customer_id;
    END IF;
END;
$$;

-- Function to reset email dispatch status to allow resending
CREATE OR REPLACE FUNCTION public.reset_email_dispatch_status(
    p_purchase_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.purchases
    SET 
        email_dispatch_status = 'PENDING_DISPATCH',
        email_dispatch_error = NULL,
        updated_at = NOW()
    WHERE id = p_purchase_id;

    IF NOT FOUND THEN
        RAISE WARNING 'Purchase ID % not found during reset_email_dispatch_status', p_purchase_id;
    END IF;
END;
$$;

-- Function to get purchases data for CSV export
CREATE OR REPLACE FUNCTION public.export_admin_purchases_csv()
RETURNS TABLE(
    purchase_id TEXT,
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    event_title TEXT,
    ticket_name TEXT,
    quantity TEXT,
    total_amount TEXT,
    currency_code TEXT,
    status TEXT,
    email_dispatch_status TEXT,
    email_sent_at TEXT,
    ticket_scanned_at TEXT,
    purchase_date TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id::TEXT as purchase_id,
        c.name as customer_name,
        c.email as customer_email,
        COALESCE(c.phone, '') as customer_phone,
        p.event_title,
        p.ticket_name,
        p.quantity::TEXT,
        p.total_amount::TEXT,
        p.currency_code,
        p.status,
        p.email_dispatch_status,
        COALESCE(p.pdf_ticket_sent_at::TEXT, '') as email_sent_at,
        COALESCE(p.used_at::TEXT, '') as ticket_scanned_at,
        p.created_at::TEXT as purchase_date
    FROM public.purchases p
    INNER JOIN public.customers c ON p.customer_id = c.id
    ORDER BY p.created_at DESC;
END;
$$;

-- Grant execute permissions to service_role
GRANT EXECUTE ON FUNCTION public.get_admin_purchases() TO service_role;
GRANT EXECUTE ON FUNCTION public.search_admin_purchases(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_customer_for_resend(UUID, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.reset_email_dispatch_status(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.export_admin_purchases_csv() TO service_role;

-- Comments
COMMENT ON FUNCTION public.get_admin_purchases()
IS 'Retrieves all purchases for admin panel with customer information';

COMMENT ON FUNCTION public.search_admin_purchases(TEXT)
IS 'Searches purchases by customer name, email, event title, or purchase ID';

COMMENT ON FUNCTION public.update_customer_for_resend(UUID, TEXT, TEXT, TEXT)
IS 'Updates customer information when resending emails. Handles duplicate emails by merging customers with matching details.';

COMMENT ON FUNCTION public.reset_email_dispatch_status(UUID)
IS 'Resets email dispatch status to allow resending ticket emails'; 

COMMENT ON FUNCTION public.export_admin_purchases_csv()
IS 'Exports all purchases data in CSV-friendly format for admin download'; 