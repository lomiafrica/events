-- Migration: Guest Ticket Issuance
-- Allows admin to create complimentary tickets for VIPs, staff, friends, etc.

-- Add function to create a guest/comp ticket
CREATE OR REPLACE FUNCTION public.issue_guest_ticket(
    p_event_id TEXT,
    p_event_title TEXT,
    p_event_date_text TEXT,
    p_event_time_text TEXT,
    p_event_venue_name TEXT,
    p_guest_name TEXT,
    p_guest_email TEXT,
    p_guest_phone TEXT,
    p_ticket_type_name TEXT DEFAULT 'Guest List',
    p_quantity INTEGER DEFAULT 1,
    p_notes TEXT DEFAULT NULL
)
RETURNS TABLE(
    purchase_id UUID,
    customer_id UUID,
    ticket_identifiers TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_customer_id UUID;
    v_purchase_id UUID;
    v_ticket_id TEXT;
    v_ticket_identifiers TEXT[] := ARRAY[]::TEXT[];
    i INTEGER;
BEGIN
    -- Check if customer already exists
    SELECT id INTO v_customer_id
    FROM public.customers
    WHERE email = p_guest_email;
    
    -- Create customer if doesn't exist
    IF v_customer_id IS NULL THEN
        INSERT INTO public.customers (name, email, phone)
        VALUES (p_guest_name, p_guest_email, p_guest_phone)
        RETURNING id INTO v_customer_id;
    ELSE
        -- Update customer info if they exist
        UPDATE public.customers
        SET name = p_guest_name,
            phone = COALESCE(p_guest_phone, phone),
            updated_at = NOW()
        WHERE id = v_customer_id;
    END IF;
    
    -- Generate unique ticket identifier
    v_ticket_id := 'GUEST-' || substring(md5(random()::text || clock_timestamp()::text) from 1 for 16);
    
    -- Create purchase record (marked as complimentary)
    INSERT INTO public.purchases (
        customer_id,
        event_id,
        event_title,
        event_date_text,
        event_time_text,
        event_venue_name,
        ticket_type_id,
        ticket_name,
        quantity,
        price_per_ticket,
        total_amount,
        currency_code,
        status,
        unique_ticket_identifier,
        email_dispatch_status,
        payment_method,
        notes
    ) VALUES (
        v_customer_id,
        p_event_id,
        p_event_title,
        p_event_date_text,
        p_event_time_text,
        p_event_venue_name,
        'guest-comp',
        p_ticket_type_name,
        p_quantity,
        0.00, -- Complimentary, no charge
        0.00,
        'XOF',
        'paid', -- Mark as paid so it works with verification
        v_ticket_id,
        'NOT_INITIATED',
        'complimentary',
        p_notes
    ) RETURNING id INTO v_purchase_id;
    
    -- Generate individual tickets for multi-quantity guests
    FOR i IN 1..p_quantity LOOP
        DECLARE
            v_individual_ticket_id TEXT;
        BEGIN
            v_individual_ticket_id := v_ticket_id || '-' || i::TEXT;
            
            INSERT INTO public.individual_tickets (
                purchase_id,
                ticket_identifier,
                status
            ) VALUES (
                v_purchase_id,
                v_individual_ticket_id,
                'valid'
            );
            
            v_ticket_identifiers := array_append(v_ticket_identifiers, v_individual_ticket_id);
        END;
    END LOOP;
    
    -- Return the created purchase info
    RETURN QUERY SELECT v_purchase_id, v_customer_id, v_ticket_identifiers;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.issue_guest_ticket(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.issue_guest_ticket(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT) TO authenticated;

-- Function to get guest list for an event
CREATE OR REPLACE FUNCTION public.get_event_guest_list(
    p_event_id TEXT
)
RETURNS TABLE(
    purchase_id UUID,
    guest_name TEXT,
    guest_email TEXT,
    guest_phone TEXT,
    ticket_count INTEGER,
    is_used BOOLEAN,
    used_at TIMESTAMPTZ,
    ticket_identifier TEXT,
    created_at TIMESTAMPTZ,
    notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as purchase_id,
        c.name as guest_name,
        c.email as guest_email,
        c.phone as guest_phone,
        p.quantity as ticket_count,
        p.is_used,
        p.used_at,
        p.unique_ticket_identifier as ticket_identifier,
        p.created_at,
        p.notes
    FROM public.purchases p
    INNER JOIN public.customers c ON p.customer_id = c.id
    WHERE p.event_id = p_event_id
    AND p.payment_method = 'complimentary'
    ORDER BY p.created_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_event_guest_list(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_event_guest_list(TEXT) TO authenticated;

-- Add payment_method and notes columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'purchases' 
        AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE public.purchases ADD COLUMN payment_method TEXT DEFAULT 'stripe';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'purchases' 
        AND column_name = 'notes'
    ) THEN
        ALTER TABLE public.purchases ADD COLUMN notes TEXT;
    END IF;
END $$;

-- Comments
COMMENT ON FUNCTION public.issue_guest_ticket(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT)
IS 'Creates a complimentary ticket for VIPs, staff, or personal invitations';

COMMENT ON FUNCTION public.get_event_guest_list(TEXT)
IS 'Returns all complimentary tickets issued for an event';
