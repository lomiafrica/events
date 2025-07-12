-- Create the 'customers' table
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    email TEXT UNIQUE NOT NULL, -- Email is used to identify and potentially link anonymous sessions
    phone TEXT, -- Optional
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT customer_email_valid CHECK (email ~* '^[A-Za-z0-9._+%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$')
);

COMMENT ON COLUMN public.customers.email IS 'Email is used to identify and potentially link anonymous sessions if the same email is used multiple times.';

-- Enable Row Level Security (RLS) on the customers table
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access on customers. Supabase functions often use this role.
CREATE POLICY "Allow service_role full access on customers"
ON public.customers
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Comments
COMMENT ON FUNCTION public.trigger_set_timestamp() IS 'Trigger function to update updated_at timestamp';

-- Apply the trigger to the customers table for updates
CREATE TRIGGER set_customer_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();


-- Modify the 'purchases' table to link to 'customers'
CREATE TABLE public.purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Event Information (likely from your CMS like Sanity)
    event_id TEXT NOT NULL, -- Identifier for the event (e.g., Sanity document ID or slug)
    event_title TEXT,       -- Name of the event for easier reference
    
    -- Ticket Information (specific ticket type chosen)
    ticket_type_id TEXT NOT NULL, -- Identifier for the chosen ticket type (e.g., Sanity ticket type _key)
    ticket_name TEXT,             -- Name of the ticket type
    
    -- Order Details
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_per_ticket NUMERIC NOT NULL CHECK (price_per_ticket >= 0),
    total_amount NUMERIC NOT NULL CHECK (total_amount >= 0), -- Should be quantity * price_per_ticket
    currency_code TEXT DEFAULT 'XOF' NOT NULL,
    
    -- Payment Processor (Lomi) Details
    lomi_session_id TEXT UNIQUE, -- Unique ID from Lomi for the checkout session
    lomi_checkout_url TEXT,    -- URL for the Lomi checkout page
    
    -- Status Tracking
    status TEXT DEFAULT 'pending_payment' NOT NULL, 
    -- Possible statuses: pending_payment, paid, payment_failed, processing_ticket, email_sent, refunded, cancelled

    payment_processor_details JSONB, -- To store raw response or relevant details from Lomi webhook

    -- PDF Ticket Tracking
    pdf_ticket_generated BOOLEAN DEFAULT FALSE,
    pdf_ticket_sent_at TIMESTAMPTZ
);

-- Add comments to explain columns
COMMENT ON COLUMN public.purchases.customer_id IS 'Links to the customer who made the purchase.';
COMMENT ON COLUMN public.purchases.event_id IS 'Identifier for the event (e.g., Sanity document ID or slug).';
COMMENT ON COLUMN public.purchases.ticket_type_id IS 'Identifier for the chosen ticket type (e.g., Sanity ticket type _key).';
COMMENT ON COLUMN public.purchases.lomi_session_id IS 'Unique ID from Lomi for the checkout session. Used to reconcile webhook events.';
COMMENT ON COLUMN public.purchases.status IS 'Tracks the state of the purchase and ticketing process.';

-- Optional: Indexes for common query patterns
CREATE INDEX idx_purchases_customer_id ON public.purchases(customer_id);
CREATE INDEX idx_purchases_event_id ON public.purchases(event_id);
CREATE INDEX idx_purchases_user_email ON public.customers(email); -- Index on customers table for email lookup
CREATE INDEX idx_purchases_status ON public.purchases(status);
CREATE INDEX idx_purchases_lomi_session_id ON public.purchases(lomi_session_id);

-- Enable Row Level Security (RLS) on the table
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies:
-- Since users are anonymous and don't log in, direct table interaction from the client-side 'anon' role is not intended for this table.
-- A Supabase Edge Function (running with service_role or a dedicated role) will handle the creation and updates of purchase records.

-- Allow full access for the service_role. Supabase functions often use this role.
CREATE POLICY "Allow service_role full access on purchases"
ON public.purchases
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Note: No direct insert/select/update/delete policies for the 'anon' or 'authenticated' roles are created here for the purchases table,
-- as the interaction is mediated by a secure Edge Function.
