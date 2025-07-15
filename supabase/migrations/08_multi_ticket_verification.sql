-- Migration: Combined Multi-Ticket Verification System
-- This migration sets up the complete system for handling both new individual tickets and legacy multi-use tickets.

-- 1. Create the table for individual tickets
CREATE TABLE IF NOT EXISTS public.individual_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
    ticket_identifier TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL, -- 'active', 'used', 'cancelled'
    is_used BOOLEAN DEFAULT FALSE NOT NULL,
    used_at TIMESTAMPTZ,
    verified_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_individual_tickets_purchase_id ON public.individual_tickets(purchase_id);
CREATE INDEX IF NOT EXISTS idx_individual_tickets_ticket_identifier ON public.individual_tickets(ticket_identifier);

-- Add comments for clarity
COMMENT ON TABLE public.individual_tickets IS 'Stores individual tickets for multi-ticket purchases, each with a unique identifier for QR codes.';
COMMENT ON COLUMN public.individual_tickets.status IS 'Status of the individual ticket (e.g., active, used, cancelled).';

-- 2. Add columns to the purchases table for legacy ticket handling and tracking
ALTER TABLE public.purchases
ADD COLUMN IF NOT EXISTS use_count INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS individual_tickets_generated BOOLEAN DEFAULT FALSE NOT NULL;

COMMENT ON COLUMN public.purchases.use_count IS 'For legacy tickets, tracks how many times a multi-person ticket has been scanned.';
COMMENT ON COLUMN public.purchases.individual_tickets_generated IS 'Indicates if individual tickets have been generated for this purchase.';

-- 3. Function to generate individual tickets for a purchase
CREATE OR REPLACE FUNCTION public.generate_individual_tickets_for_purchase(
    p_purchase_id UUID
)
RETURNS TABLE (ticket_identifier TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    purchase_record RECORD;
    actual_ticket_quantity INTEGER;
    new_ticket_identifier TEXT;
BEGIN
    -- Get purchase details
    SELECT * INTO purchase_record FROM public.purchases WHERE id = p_purchase_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase with ID % not found.', p_purchase_id;
    END IF;

    -- Prevent generating tickets for old purchases that shouldn't have them
    IF purchase_record.created_at < '2024-08-01' THEN
        RAISE EXCEPTION 'Cannot generate individual tickets for this legacy purchase.';
    END IF;

    -- Determine the actual number of tickets
    actual_ticket_quantity := COALESCE(
        CASE WHEN purchase_record.is_bundle THEN purchase_record.quantity * purchase_record.tickets_per_bundle ELSE purchase_record.quantity END,
        purchase_record.quantity,
        1
    );

    -- Delete existing tickets for this purchase to ensure a clean slate on retry
    DELETE FROM public.individual_tickets WHERE purchase_id = p_purchase_id;

    -- Generate N individual tickets and return their identifiers
    FOR i IN 1..actual_ticket_quantity LOOP
        new_ticket_identifier := gen_random_uuid()::TEXT;
        INSERT INTO public.individual_tickets (purchase_id, ticket_identifier)
        VALUES (p_purchase_id, new_ticket_identifier);
        
        -- Return the newly created identifier
        ticket_identifier := new_ticket_identifier;
        RETURN NEXT;
    END LOOP;

    -- Mark the main purchase as having its tickets generated
    UPDATE public.purchases
    SET individual_tickets_generated = TRUE
    WHERE id = p_purchase_id;
END;
$$;

-- 4. Unified Ticket Verification Function
CREATE OR REPLACE FUNCTION public.verify_ticket(
    p_ticket_identifier TEXT
)
RETURNS TABLE(
    -- Return columns (same as before, but with quantity always being 1 for individual tickets)
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
    verified_by TEXT,
    use_count INTEGER,
    total_quantity INTEGER -- The original total quantity of the purchase
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    individual_ticket RECORD;
    purchase_record RECORD;
    customer_record RECORD;
BEGIN
    -- Try to find it in the new individual_tickets table first
    SELECT it.* INTO individual_ticket FROM public.individual_tickets it WHERE it.ticket_identifier = p_ticket_identifier;

    IF FOUND THEN
        -- It's a new, individual ticket
        SELECT p.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone 
        INTO purchase_record 
        FROM public.purchases p
        INNER JOIN public.customers c ON p.customer_id = c.id
        WHERE p.id = individual_ticket.purchase_id;
        
        RETURN QUERY SELECT
            purchase_record.id,
            purchase_record.customer_name,
            purchase_record.customer_email,
            purchase_record.customer_phone,
            purchase_record.event_id,
            purchase_record.event_title,
            purchase_record.event_date_text,
            purchase_record.event_time_text,
            purchase_record.event_venue_name,
            purchase_record.ticket_type_id,
            purchase_record.ticket_name,
            1, -- Quantity is always 1 for an individual ticket
            purchase_record.price_per_ticket,
            purchase_record.total_amount,
            purchase_record.currency_code,
            individual_ticket.status,
            individual_ticket.is_used,
            individual_ticket.used_at,
            individual_ticket.verified_by,
            NULL::INTEGER, -- use_count is not applicable
            purchase_record.quantity; -- total_quantity from original purchase
        RETURN;
    END IF;

    -- If not found, check the legacy purchases table
    SELECT p.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone
    INTO purchase_record 
    FROM public.purchases p
    INNER JOIN public.customers c ON p.customer_id = c.id
    WHERE p.unique_ticket_identifier = p_ticket_identifier;
    
    IF FOUND THEN
        -- It's a legacy ticket
        RETURN QUERY SELECT
            purchase_record.id,
            purchase_record.customer_name,
            purchase_record.customer_email,
            purchase_record.customer_phone,
            purchase_record.event_id,
            purchase_record.event_title,
            purchase_record.event_date_text,
            purchase_record.event_time_text,
            purchase_record.event_venue_name,
            purchase_record.ticket_type_id,
            purchase_record.ticket_name,
            purchase_record.quantity, -- The full original quantity
            purchase_record.price_per_ticket,
            purchase_record.total_amount,
            purchase_record.currency_code,
            purchase_record.status,
            (purchase_record.use_count >= purchase_record.quantity), -- is_used is true if fully used
            purchase_record.used_at,
            purchase_record.verified_by,
            purchase_record.use_count,
            purchase_record.quantity; -- total_quantity is same as quantity
        RETURN;
    END IF;

    -- If no ticket is found anywhere, return nothing
END;
$$;


-- 5. Unified Function to Mark Ticket as Used
CREATE OR REPLACE FUNCTION public.mark_ticket_used(
    p_ticket_identifier TEXT,
    p_verified_by TEXT
)
RETURNS TEXT -- Returns a status message like 'SUCCESS', 'ALREADY_USED', 'NOT_FOUND'
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    individual_ticket RECORD;
    purchase_record RECORD;
BEGIN
    -- Try to find and mark in individual_tickets table
    SELECT * INTO individual_ticket FROM public.individual_tickets WHERE ticket_identifier = p_ticket_identifier;

    IF FOUND THEN
        IF individual_ticket.is_used THEN
            RETURN 'ALREADY_USED';
        END IF;

        UPDATE public.individual_tickets
        SET is_used = TRUE, used_at = NOW(), verified_by = p_verified_by, status = 'used'
        WHERE id = individual_ticket.id;
        RETURN 'SUCCESS';
    END IF;

    -- If not an individual ticket, handle legacy tickets
    SELECT * INTO purchase_record FROM public.purchases WHERE unique_ticket_identifier = p_ticket_identifier;

    IF FOUND THEN
        IF purchase_record.use_count >= purchase_record.quantity THEN
            RETURN 'ALREADY_USED';
        END IF;

        UPDATE public.purchases
        SET
            use_count = purchase_record.use_count + 1,
            used_at = NOW(), -- Update timestamp on each scan
            verified_by = p_verified_by,
            is_used = (purchase_record.use_count + 1) >= purchase_record.quantity -- Set is_used to true only on the last scan
        WHERE id = purchase_record.id;
        RETURN 'SUCCESS';
    END IF;

    RETURN 'NOT_FOUND';
END;
$$;

-- Grant permissions for the new functions
GRANT EXECUTE ON FUNCTION public.generate_individual_tickets_for_purchase(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_individual_tickets_for_purchase(UUID) TO authenticated;
-- Permissions for verify_ticket and mark_ticket_used should already be set, but we re-grant for safety
GRANT EXECUTE ON FUNCTION public.verify_ticket(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_ticket(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_ticket_used(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_ticket_used(TEXT, TEXT) TO authenticated;

-- 6. Function to reset stuck email dispatch statuses
-- This helps resolve the issue where purchases get stuck in DISPATCH_IN_PROGRESS
CREATE OR REPLACE FUNCTION public.reset_stuck_email_dispatches()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    reset_count INTEGER;
BEGIN
    -- Reset purchases that have been in DISPATCH_IN_PROGRESS for more than 10 minutes
    UPDATE public.purchases
    SET 
        email_dispatch_status = 'DISPATCH_FAILED',
        email_dispatch_error = 'Dispatch timed out - reset by cleanup function',
        updated_at = NOW()
    WHERE email_dispatch_status = 'DISPATCH_IN_PROGRESS'
    AND email_last_dispatch_attempt_at < NOW() - INTERVAL '10 minutes';
    
    GET DIAGNOSTICS reset_count = ROW_COUNT;
    
    RETURN reset_count;
END;
$$;

-- Grant execute permissions for the cleanup function
GRANT EXECUTE ON FUNCTION public.reset_stuck_email_dispatches() TO service_role;

COMMENT ON FUNCTION public.reset_stuck_email_dispatches()
IS 'Resets email dispatch statuses that have been stuck in DISPATCH_IN_PROGRESS for more than 10 minutes';
