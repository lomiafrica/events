-- RPC Functions for Email Dispatch System
-- This migration adds the missing RPC functions needed for the send-ticket-email Edge Function

-- Function to get purchase details with customer info for email dispatch
CREATE OR REPLACE FUNCTION public.get_purchase_for_email_dispatch(
    p_purchase_id UUID
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
    unique_ticket_identifier TEXT,
    is_bundle BOOLEAN,
    tickets_per_bundle INTEGER
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
        p.unique_ticket_identifier,
        p.is_bundle,
        p.tickets_per_bundle
    FROM public.purchases p
    INNER JOIN public.customers c ON p.customer_id = c.id
    WHERE p.id = p_purchase_id;
END;
$$;

-- Function to update email dispatch status
CREATE OR REPLACE FUNCTION public.update_email_dispatch_status(
    p_purchase_id UUID,
    p_email_dispatch_status TEXT,
    p_email_dispatch_error TEXT DEFAULT NULL,
    p_email_dispatch_attempts INTEGER DEFAULT NULL,
    p_pdf_ticket_generated BOOLEAN DEFAULT NULL,
    p_pdf_ticket_sent_at TIMESTAMPTZ DEFAULT NULL,
    p_unique_ticket_identifier TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.purchases
    SET 
        email_dispatch_status = p_email_dispatch_status,
        email_last_dispatch_attempt_at = NOW(),
        email_dispatch_error = COALESCE(p_email_dispatch_error, email_dispatch_error),
        email_dispatch_attempts = COALESCE(p_email_dispatch_attempts, email_dispatch_attempts),
        pdf_ticket_generated = COALESCE(p_pdf_ticket_generated, pdf_ticket_generated),
        pdf_ticket_sent_at = COALESCE(p_pdf_ticket_sent_at, pdf_ticket_sent_at),
        unique_ticket_identifier = COALESCE(p_unique_ticket_identifier, unique_ticket_identifier),
        updated_at = NOW()
    WHERE id = p_purchase_id;

    IF NOT FOUND THEN
        RAISE WARNING 'Purchase ID % not found during update_email_dispatch_status', p_purchase_id;
    END IF;
END;
$$;

-- Grant execute permissions to service_role
GRANT EXECUTE ON FUNCTION public.get_purchase_for_email_dispatch(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_email_dispatch_status(UUID, TEXT, TEXT, INTEGER, BOOLEAN, TIMESTAMPTZ, TEXT) TO service_role;

-- Comments
COMMENT ON FUNCTION public.get_purchase_for_email_dispatch(UUID)
IS 'Retrieves purchase details with customer information for email dispatch processing, including bundle information';

COMMENT ON FUNCTION public.update_email_dispatch_status(UUID, TEXT, TEXT, INTEGER, BOOLEAN, TIMESTAMPTZ, TEXT)
IS 'Updates the email dispatch status and related fields for a purchase record'; 