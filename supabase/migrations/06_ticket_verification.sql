-- Migration: Ticket Verification System
-- This adds the necessary columns and functions for QR code ticket verification

-- Add verification columns to purchases table
ALTER TABLE public.purchases
ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verified_by TEXT; -- Staff member who verified the ticket

-- Add indexes for verification queries
CREATE INDEX IF NOT EXISTS idx_purchases_unique_ticket_identifier ON public.purchases(unique_ticket_identifier);
CREATE INDEX IF NOT EXISTS idx_purchases_is_used ON public.purchases(is_used);

-- Comments
COMMENT ON COLUMN public.purchases.is_used IS 'Whether the ticket has been used for entry';
COMMENT ON COLUMN public.purchases.used_at IS 'Timestamp when the ticket was used for entry';
COMMENT ON COLUMN public.purchases.verified_by IS 'Staff member or system that verified the ticket';

-- Create verification config table for storing secure settings
CREATE TABLE IF NOT EXISTS public.verification_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key TEXT UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on the verification_config table
ALTER TABLE public.verification_config ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for verification_config
CREATE POLICY "Allow service_role full access on verification_config"
ON public.verification_config
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow authenticated users to read verification config (needed for staff PIN verification)
CREATE POLICY "Allow authenticated read on verification_config"
ON public.verification_config
FOR SELECT
TO authenticated
USING (true);

-- Insert the verification PIN (can be updated later)
INSERT INTO public.verification_config (config_key, config_value) 
VALUES ('staff_verification_pin', '2603')
ON CONFLICT (config_key) DO UPDATE SET 
    config_value = EXCLUDED.config_value,
    updated_at = NOW();

-- RPC Function to verify staff PIN
CREATE OR REPLACE FUNCTION public.verify_staff_pin(
    p_pin TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    stored_pin TEXT;
BEGIN
    -- Get the stored PIN from config
    SELECT config_value INTO stored_pin
    FROM public.verification_config
    WHERE config_key = 'staff_verification_pin';
    
    -- Return true if PIN matches
    RETURN (stored_pin = p_pin);
END;
$$;

-- RPC Function to verify a ticket by its unique identifier
CREATE OR REPLACE FUNCTION public.verify_ticket(
    p_ticket_identifier TEXT
)
RETURNS TABLE(
    purchase_id UUID,
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
    is_used BOOLEAN,
    used_at TIMESTAMPTZ,
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
        p.is_used,
        p.used_at,
        p.verified_by
    FROM public.purchases p
    INNER JOIN public.customers c ON p.customer_id = c.id
    WHERE p.unique_ticket_identifier = p_ticket_identifier
    AND p.status = 'paid'; -- Only return paid tickets
END;
$$;

-- RPC Function to mark a ticket as used
CREATE OR REPLACE FUNCTION public.mark_ticket_used(
    p_ticket_identifier TEXT,
    p_verified_by TEXT DEFAULT 'system'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.purchases
    SET 
        is_used = TRUE,
        used_at = NOW(),
        verified_by = p_verified_by,
        updated_at = NOW()
    WHERE unique_ticket_identifier = p_ticket_identifier
    AND status = 'paid'
    AND is_used = FALSE; -- Prevent double-marking

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ticket not found, already used, or not paid';
    END IF;
END;
$$;

-- RPC Function to get ticket verification stats for an event
CREATE OR REPLACE FUNCTION public.get_event_verification_stats(
    p_event_id TEXT
)
RETURNS TABLE(
    total_tickets INTEGER,
    used_tickets INTEGER,
    unused_tickets INTEGER,
    total_attendees INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_tickets,
        COUNT(CASE WHEN is_used = TRUE THEN 1 END)::INTEGER as used_tickets,
        COUNT(CASE WHEN is_used = FALSE THEN 1 END)::INTEGER as unused_tickets,
        COALESCE(SUM(CASE WHEN is_used = TRUE THEN quantity ELSE 0 END), 0)::INTEGER as total_attendees
    FROM public.purchases
    WHERE event_id = p_event_id
    AND status = 'paid';
END;
$$;

-- Grant execute permissions to service_role
GRANT EXECUTE ON FUNCTION public.verify_staff_pin(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_ticket(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_ticket_used(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_event_verification_stats(TEXT) TO service_role;

-- Also grant to authenticated role for staff app
GRANT EXECUTE ON FUNCTION public.verify_staff_pin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_ticket(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_ticket_used(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_verification_stats(TEXT) TO authenticated;

-- Grant access to verification_config table
GRANT SELECT ON public.verification_config TO service_role;
GRANT SELECT ON public.verification_config TO authenticated;

-- Comments
COMMENT ON FUNCTION public.verify_staff_pin(TEXT)
IS 'Securely verifies staff PIN against stored value';

COMMENT ON FUNCTION public.verify_ticket(TEXT)
IS 'Verifies a ticket by its unique identifier and returns ticket details';

COMMENT ON FUNCTION public.mark_ticket_used(TEXT, TEXT)
IS 'Marks a ticket as used for entry, preventing double-use';

COMMENT ON FUNCTION public.get_event_verification_stats(TEXT)
IS 'Returns verification statistics for an event (total, used, unused tickets)';

-- Create a view for easy ticket verification queries
CREATE VIEW public.ticket_verification_view
WITH (security_invoker=on)
AS
SELECT 
    p.id as purchase_id,
    p.unique_ticket_identifier,
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
    p.is_used,
    p.used_at,
    p.verified_by,
    p.created_at
FROM public.purchases p
INNER JOIN public.customers c ON p.customer_id = c.id
WHERE p.status = 'paid'; -- Only show paid tickets

-- Grant access to the view
GRANT SELECT ON public.ticket_verification_view TO service_role;
GRANT SELECT ON public.ticket_verification_view TO authenticated;

COMMENT ON VIEW public.ticket_verification_view
IS 'View for ticket verification queries without security definer';

-- Comments
COMMENT ON TABLE public.verification_config IS 'Configuration settings for ticket verification system'; 