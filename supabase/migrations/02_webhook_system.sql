CREATE OR REPLACE FUNCTION public.record_event_lomi_payment(
    p_purchase_id UUID,
    p_lomi_payment_id TEXT, -- Lomi's unique ID for the payment transaction itself (if available and distinct from session ID)
    p_lomi_checkout_session_id TEXT, -- Lomi's ID for the checkout session
    p_payment_status TEXT, -- e.g., 'paid', 'failed' from Lomi webhook
    p_lomi_event_payload JSONB, -- The entire Lomi webhook event payload
    p_amount_paid NUMERIC, -- Amount confirmed by Lomi (in smallest currency unit, e.g., cents, or base unit if no subunits like XOF)
    p_currency_paid TEXT -- Currency code confirmed by Lomi
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.purchases
    SET 
        status = p_payment_status, -- Update status based on webhook (e.g., 'paid', 'payment_failed')
        lomi_session_id = COALESCE(p_lomi_checkout_session_id, lomi_session_id), -- Store or update Lomi checkout session ID
        -- Add a new column for lomi_transaction_id if you need to store it separately from the checkout session ID
        -- For now, assuming p_lomi_payment_id might be stored in payment_processor_details or a dedicated column if added
        total_amount = p_amount_paid, -- Update with amount confirmed by Lomi
        currency_code = p_currency_paid, -- Update with currency confirmed by Lomi
        payment_processor_details = p_lomi_event_payload, -- Store the full Lomi webhook payload for auditing/reference
        updated_at = NOW()
    WHERE id = p_purchase_id;

    IF NOT FOUND THEN
        RAISE WARNING 'Purchase ID % not found during record_event_lomi_payment. Lomi Event: %', p_purchase_id, p_lomi_event_payload;
    END IF;
END;
$$;

COMMENT ON FUNCTION public.record_event_lomi_payment(UUID, TEXT, TEXT, TEXT, JSONB, NUMERIC, TEXT)
IS 'Records the outcome of a Lomi payment for an event purchase, updating status and storing Lomi transaction details. To be called by the Lomi webhook handler.';

-- Grant execute permission to the service_role (used by Supabase functions/backend calls)
GRANT EXECUTE ON FUNCTION public.record_event_lomi_payment(UUID, TEXT, TEXT, TEXT, JSONB, NUMERIC, TEXT) TO service_role;
