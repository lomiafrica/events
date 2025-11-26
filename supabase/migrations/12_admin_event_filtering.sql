-- Migration: Admin Event Filtering
-- Add functions to support event-based filtering in admin dashboard

-- Function to get list of events with purchase counts
CREATE OR REPLACE FUNCTION public.get_admin_events_list()
RETURNS TABLE(
    event_id TEXT,
    event_title TEXT,
    event_date_text TEXT,
    total_purchases BIGINT,
    total_tickets BIGINT,
    scanned_tickets BIGINT,
    last_purchase_date TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.event_id,
        MAX(p.event_title) as event_title,
        MAX(p.event_date_text) as event_date_text,
        COUNT(DISTINCT p.id) as total_purchases,
        SUM(p.quantity) as total_tickets,
        COUNT(CASE WHEN p.is_used = TRUE THEN 1 END) as scanned_tickets,
        MAX(p.created_at) as last_purchase_date
    FROM public.purchases p
    WHERE p.status = 'paid'
    GROUP BY p.event_id
    ORDER BY last_purchase_date DESC;
END;
$$;

-- Function to get purchases filtered by event
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
    WHERE p.event_id = p_event_id
    ORDER BY p.created_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_admin_events_list() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_purchases_by_event(TEXT) TO service_role;

-- Also grant to authenticated for admin panel access
GRANT EXECUTE ON FUNCTION public.get_admin_events_list() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_purchases_by_event(TEXT) TO authenticated;

-- Comments
COMMENT ON FUNCTION public.get_admin_events_list()
IS 'Returns list of all events with purchase statistics for admin filtering';

COMMENT ON FUNCTION public.get_admin_purchases_by_event(TEXT)
IS 'Returns purchases filtered by specific event ID';
