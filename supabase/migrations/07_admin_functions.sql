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
    created_at TIMESTAMPTZ
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
        p.created_at
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
    created_at TIMESTAMPTZ
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
        p.created_at
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
BEGIN
    UPDATE public.customers
    SET 
        email = p_new_email,
        name = p_new_name,
        phone = COALESCE(p_new_phone, phone),
        updated_at = NOW()
    WHERE id = p_customer_id;

    IF NOT FOUND THEN
        RAISE WARNING 'Customer ID % not found during update_customer_for_resend', p_customer_id;
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

-- Grant execute permissions to service_role
GRANT EXECUTE ON FUNCTION public.get_admin_purchases() TO service_role;
GRANT EXECUTE ON FUNCTION public.search_admin_purchases(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_customer_for_resend(UUID, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.reset_email_dispatch_status(UUID) TO service_role;

-- Comments
COMMENT ON FUNCTION public.get_admin_purchases()
IS 'Retrieves all purchases for admin panel with customer information';

COMMENT ON FUNCTION public.search_admin_purchases(TEXT)
IS 'Searches purchases by customer name, email, event title, or purchase ID';

COMMENT ON FUNCTION public.update_customer_for_resend(UUID, TEXT, TEXT, TEXT)
IS 'Updates customer information when resending emails with corrected details';

COMMENT ON FUNCTION public.reset_email_dispatch_status(UUID)
IS 'Resets email dispatch status to allow resending ticket emails'; 