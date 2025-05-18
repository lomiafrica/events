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
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Using SECURITY DEFINER if the calling role might not have direct update perms on all these columns
AS $$
BEGIN
    UPDATE public.purchases
    SET 
        email_dispatch_status = 'PENDING_DISPATCH',
        updated_at = NOW() -- Ensure updated_at is modified by this action
    WHERE id = p_purchase_id AND status = 'paid'; -- Crucially, only prepare 'paid' purchases

    IF NOT FOUND THEN
        RAISE WARNING 'Purchase ID % not found or not in "paid" status. No action taken for email dispatch preparation.', p_purchase_id;
    END IF;
END;
$$;

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
