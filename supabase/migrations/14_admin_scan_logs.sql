-- Migration: Admin Scan Logs Function
-- Adds RPC to fetch all verification logs for the admin dashboard

-- Function to get verification logs (both success and failure)
CREATE OR REPLACE FUNCTION public.get_admin_verification_logs(
    p_event_id TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    id UUID,
    ticket_identifier TEXT,
    event_id TEXT,
    event_title TEXT,
    customer_name TEXT,
    customer_email TEXT,
    attempt_timestamp TIMESTAMPTZ,
    success BOOLEAN,
    error_code TEXT,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT
        va.id,
        va.ticket_identifier,
        va.event_id,
        va.event_title,
        COALESCE(c.name, 'Unknown Customer') as customer_name,
        COALESCE(c.email, '') as customer_email,
        va.attempt_timestamp,
        va.success,
        va.error_code,
        va.error_message
    FROM public.verification_attempts va
    LEFT JOIN public.purchases p ON va.ticket_identifier = p.unique_ticket_identifier
    LEFT JOIN public.customers c ON p.customer_id = c.id
    WHERE (p_event_id IS NULL OR va.event_id = p_event_id)
    ORDER BY va.attempt_timestamp DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_admin_verification_logs(TEXT, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_verification_logs(TEXT, INTEGER, INTEGER) TO authenticated;

COMMENT ON FUNCTION public.get_admin_verification_logs(TEXT, INTEGER, INTEGER) IS 'Returns paginated verification logs for admin review';
