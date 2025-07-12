-- Add missing columns to the 'purchases' table that the send-ticket-email function expects
ALTER TABLE public.purchases
ADD COLUMN IF NOT EXISTS event_date_text TEXT,
ADD COLUMN IF NOT EXISTS event_time_text TEXT,
ADD COLUMN IF NOT EXISTS event_venue_name TEXT;

-- Add comments to explain the new columns
COMMENT ON COLUMN public.purchases.event_date_text IS 'Human-readable event date for display in emails/tickets.';
COMMENT ON COLUMN public.purchases.event_time_text IS 'Human-readable event time for display in emails/tickets.';
COMMENT ON COLUMN public.purchases.event_venue_name IS 'Event venue name for display in emails/tickets.';

-- Add missing updated_at column to the purchases table
ALTER TABLE public.purchases
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN public.purchases.updated_at IS 'Timestamp of when the purchase record was last updated.';

-- Apply the trigger to the purchases table for automatic updated_at updates
CREATE TRIGGER set_purchase_updated_at
BEFORE UPDATE ON public.purchases
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

-- Set updated_at for existing records to match created_at
UPDATE public.purchases 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Add whatsapp column to customers table
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- Add comment to explain the whatsapp column
COMMENT ON COLUMN public.customers.whatsapp IS 'WhatsApp number for customer communication.';

-- Add bundle support to purchases table
ALTER TABLE public.purchases 
ADD COLUMN IF NOT EXISTS is_bundle BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tickets_per_bundle INTEGER DEFAULT 1;

-- Add comments for new columns
COMMENT ON COLUMN public.purchases.is_bundle IS 'Whether this purchase is for a bundle (true) or individual tickets (false)';
COMMENT ON COLUMN public.purchases.tickets_per_bundle IS 'Number of tickets included per bundle unit. For regular tickets, this is 1.';

-- RPC Function to upsert customer (create or update)
CREATE OR REPLACE FUNCTION public.upsert_customer(
    p_name TEXT,
    p_email TEXT,
    p_phone TEXT DEFAULT NULL,
    p_whatsapp TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    customer_id UUID;
BEGIN
    -- First try to get existing customer by email
    SELECT id INTO customer_id
    FROM public.customers
    WHERE email = p_email;

    IF customer_id IS NOT NULL THEN
        -- Update existing customer
        UPDATE public.customers
        SET 
            name = p_name,
            phone = COALESCE(p_phone, phone),
            whatsapp = COALESCE(p_whatsapp, whatsapp),
            updated_at = NOW()
        WHERE id = customer_id;
    ELSE
        -- Create new customer
        INSERT INTO public.customers (name, email, phone, whatsapp)
        VALUES (p_name, p_email, p_phone, p_whatsapp)
        RETURNING id INTO customer_id;
    END IF;

    RETURN customer_id;
END;
$$;

-- RPC Function to create a purchase
CREATE OR REPLACE FUNCTION public.create_purchase(
    p_customer_id UUID,
    p_event_id TEXT,
    p_event_title TEXT,
    p_ticket_type_id TEXT,
    p_ticket_name TEXT,
    p_quantity INTEGER,
    p_price_per_ticket NUMERIC,
    p_total_amount NUMERIC,
    p_currency_code TEXT DEFAULT 'XOF',
    p_event_date_text TEXT DEFAULT NULL,
    p_event_time_text TEXT DEFAULT NULL,
    p_event_venue_name TEXT DEFAULT NULL,
    p_is_bundle BOOLEAN DEFAULT FALSE,
    p_tickets_per_bundle INTEGER DEFAULT 1
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    purchase_id UUID;
BEGIN
    INSERT INTO public.purchases (
        customer_id,
        event_id,
        event_title,
        ticket_type_id,
        ticket_name,
        quantity,
        price_per_ticket,
        total_amount,
        currency_code,
        event_date_text,
        event_time_text,
        event_venue_name,
        is_bundle,
        tickets_per_bundle,
        status
    )
    VALUES (
        p_customer_id,
        p_event_id,
        p_event_title,
        p_ticket_type_id,
        p_ticket_name,
        p_quantity,
        p_price_per_ticket,
        p_total_amount,
        p_currency_code,
        p_event_date_text,
        p_event_time_text,
        p_event_venue_name,
        p_is_bundle,
        p_tickets_per_bundle,
        'pending_payment'
    )
    RETURNING id INTO purchase_id;

    RETURN purchase_id;
END;
$$;

-- RPC Function to update purchase with lomi session details
CREATE OR REPLACE FUNCTION public.update_purchase_lomi_session(
    p_purchase_id UUID,
    p_lomi_session_id TEXT,
    p_lomi_checkout_url TEXT,
    p_payment_processor_details JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.purchases
    SET 
        lomi_session_id = p_lomi_session_id,
        lomi_checkout_url = p_lomi_checkout_url,
        payment_processor_details = COALESCE(p_payment_processor_details, payment_processor_details),
        updated_at = NOW()
    WHERE id = p_purchase_id;

    IF NOT FOUND THEN
        RAISE WARNING 'Purchase ID % not found during lomi session update', p_purchase_id;
    END IF;
END;
$$;

-- Grant execute permissions to service_role
GRANT EXECUTE ON FUNCTION public.upsert_customer(TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_purchase(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT, BOOLEAN, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_purchase_lomi_session(UUID, TEXT, TEXT, JSONB) TO service_role;

-- Comments for the new functions
COMMENT ON FUNCTION public.upsert_customer(TEXT, TEXT, TEXT, TEXT)
IS 'Creates a new customer or updates existing customer by email. Returns customer ID.';

COMMENT ON FUNCTION public.create_purchase(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT, BOOLEAN, INTEGER)
IS 'Creates a new purchase record with pending_payment status. Supports both regular tickets and bundles. Returns purchase ID.';

COMMENT ON FUNCTION public.update_purchase_lomi_session(UUID, TEXT, TEXT, JSONB)
IS 'Updates purchase record with lomi session details after checkout session creation.'; 