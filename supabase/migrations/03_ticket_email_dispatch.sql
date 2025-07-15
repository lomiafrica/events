-- Add columns to the 'purchases' table to track email dispatch status and related info
ALTER TABLE public.purchases
ADD COLUMN IF NOT EXISTS email_dispatch_status TEXT DEFAULT 'NOT_INITIATED' NOT NULL,
    -- Possible values: NOT_INITIATED, PENDING_DISPATCH, DISPATCH_IN_PROGRESS, SENT_SUCCESSFULLY, DISPATCH_FAILED
ADD COLUMN IF NOT EXISTS email_dispatch_attempts INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS email_last_dispatch_attempt_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_dispatch_error TEXT, -- To store any error message from the last dispatch attempt
ADD COLUMN IF NOT EXISTS unique_ticket_identifier TEXT; -- Will be populated by the function that generates the ticket/QR

-- Add an index for querying purchases pending dispatch
CREATE INDEX IF NOT EXISTS idx_purchases_email_dispatch_status ON public.purchases(email_dispatch_status);

-- Comment on new columns
COMMENT ON COLUMN public.purchases.email_dispatch_status IS 'Tracks the status of the ticket email dispatch process.';
COMMENT ON COLUMN public.purchases.email_dispatch_attempts IS 'Number of times an attempt was made to dispatch the email.';
COMMENT ON COLUMN public.purchases.email_last_dispatch_attempt_at IS 'Timestamp of the last email dispatch attempt.';
COMMENT ON COLUMN public.purchases.email_dispatch_error IS 'Stores any error message from the last failed dispatch attempt.';
COMMENT ON COLUMN public.purchases.unique_ticket_identifier IS 'A unique identifier for the ticket, potentially used in QR codes or for reference. Populated during ticket generation.';


-- PostgreSQL function to mark a purchase as ready for ticket email dispatch.
-- This function will be called by an Edge Function (e.g., Lomi webhook handler)
-- after a payment is confirmed and the purchase status is updated to 'paid'.
CREATE OR REPLACE FUNCTION public.prepare_purchase_for_email_dispatch(
    p_purchase_id UUID
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
    unique_ticket_identifier TEXT,
    qr_code_data TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Update email dispatch status to PENDING_DISPATCH
    UPDATE public.purchases
    SET 
        email_dispatch_status = 'PENDING_DISPATCH',
        email_dispatch_attempts = COALESCE(email_dispatch_attempts, 0) + 1,
        updated_at = NOW()
    WHERE id = p_purchase_id;

    -- Return purchase data for email dispatch
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
        p.unique_ticket_identifier,
        p.unique_ticket_identifier as qr_code_data -- QR code contains the unique identifier
    FROM public.purchases p
    INNER JOIN public.customers c ON p.customer_id = c.id
    WHERE p.id = p_purchase_id
    AND p.status = 'paid';
END;
$$;

COMMENT ON FUNCTION public.prepare_purchase_for_email_dispatch(UUID)
IS 'Prepares purchase data for email dispatch with proper security';

COMMENT ON FUNCTION public.prepare_purchase_for_email_dispatch(UUID)
IS 'Updates a purchase record to mark it as "PENDING_DISPATCH" for its ticket email, typically after successful payment confirmation (status=''paid''). To be called by a server-side process (e.g., webhook handler Edge Function).';

-- HOW THIS FITS TOGETHER:
-- 1. Lomi sends a webhook for successful payment.
-- 2. A Supabase Edge Function (e.g., your existing Lomi webhook handler, or a new one) verifies the webhook.
-- 3. This Edge Function updates the `purchases` table, setting `status = 'paid'`.
-- 4. The same Edge Function then calls this PG function: `SELECT prepare_purchase_for_email_dispatch('your_purchase_id');`
--    Or, using the JS client: `await supabase.rpc('prepare_purchase_for_email_dispatch', { p_purchase_id: 'your_purchase_id' });`
-- 5. Then, that webhook handling Edge Function should trigger *another* new Edge Function (e.g., `send-ticket-email` - outlined below)
--    to perform the actual PDF generation, QR code, and Resend email sending.
