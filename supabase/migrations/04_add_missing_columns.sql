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