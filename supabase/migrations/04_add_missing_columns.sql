-- Add missing columns to the 'purchases' table that the send-ticket-email function expects
ALTER TABLE public.purchases
ADD COLUMN IF NOT EXISTS event_date_text TEXT,
ADD COLUMN IF NOT EXISTS event_time_text TEXT,
ADD COLUMN IF NOT EXISTS event_venue_name TEXT;

-- Add comments to explain the new columns
COMMENT ON COLUMN public.purchases.event_date_text IS 'Human-readable event date for display in emails/tickets.';
COMMENT ON COLUMN public.purchases.event_time_text IS 'Human-readable event time for display in emails/tickets.';
COMMENT ON COLUMN public.purchases.event_venue_name IS 'Event venue name for display in emails/tickets.';

-- You may need to populate these columns with data from your existing event_id
-- This could be done via a script that fetches event details from your CMS (e.g., Sanity)
-- and updates these columns for existing purchases. 