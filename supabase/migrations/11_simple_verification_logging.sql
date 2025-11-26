-- Migration: Simple Verification Logging
-- Adds minimal logging to track verification attempts and diagnose issues

-- Create table for tracking verification attempts
CREATE TABLE IF NOT EXISTS public.verification_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_identifier TEXT NOT NULL,
    event_id TEXT,
    event_title TEXT,
    attempt_timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    success BOOLEAN NOT NULL,
    error_code TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_verification_attempts_timestamp ON public.verification_attempts(attempt_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_verification_attempts_event_id ON public.verification_attempts(event_id);
CREATE INDEX IF NOT EXISTS idx_verification_attempts_success ON public.verification_attempts(success);
CREATE INDEX IF NOT EXISTS idx_verification_attempts_ticket ON public.verification_attempts(ticket_identifier);

-- Enable Row Level Security
ALTER TABLE public.verification_attempts ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access
CREATE POLICY "Allow service_role full access on verification_attempts"
ON public.verification_attempts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow authenticated users to insert and read (for staff verification app)
CREATE POLICY "Allow authenticated insert on verification_attempts"
ON public.verification_attempts
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated read on verification_attempts"
ON public.verification_attempts
FOR SELECT
TO authenticated
USING (true);

-- Grant permissions
GRANT SELECT, INSERT ON public.verification_attempts TO service_role;
GRANT SELECT, INSERT ON public.verification_attempts TO authenticated;

-- RPC Function to log verification attempts
CREATE OR REPLACE FUNCTION public.log_verification_attempt(
    p_ticket_identifier TEXT,
    p_event_id TEXT,
    p_event_title TEXT,
    p_success BOOLEAN,
    p_error_code TEXT DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO public.verification_attempts (
        ticket_identifier,
        event_id,
        event_title,
        success,
        error_code,
        error_message
    ) VALUES (
        p_ticket_identifier,
        p_event_id,
        p_event_title,
        p_success,
        p_error_code,
        p_error_message
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.log_verification_attempt(TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_verification_attempt(TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT) TO authenticated;

-- Function to get recent verification errors
CREATE OR REPLACE FUNCTION public.get_recent_verification_errors(
    p_limit INTEGER DEFAULT 20,
    p_event_id TEXT DEFAULT NULL
)
RETURNS TABLE(
    id UUID,
    ticket_identifier TEXT,
    event_id TEXT,
    event_title TEXT,
    attempt_timestamp TIMESTAMPTZ,
    error_code TEXT,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        va.id,
        va.ticket_identifier,
        va.event_id,
        va.event_title,
        va.attempt_timestamp,
        va.error_code,
        va.error_message
    FROM public.verification_attempts va
    WHERE va.success = FALSE
    AND (p_event_id IS NULL OR va.event_id = p_event_id)
    ORDER BY va.attempt_timestamp DESC
    LIMIT p_limit;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_recent_verification_errors(INTEGER, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_recent_verification_errors(INTEGER, TEXT) TO authenticated;

-- Function to clean up old logs (older than 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_verification_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.verification_attempts
    WHERE attempt_timestamp < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.cleanup_old_verification_logs() TO service_role;

-- Comments
COMMENT ON TABLE public.verification_attempts IS 'Logs all ticket verification attempts for troubleshooting. Retains last 30 days.';
COMMENT ON FUNCTION public.log_verification_attempt(TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT) IS 'Logs a verification attempt with success status and optional error details';
COMMENT ON FUNCTION public.get_recent_verification_errors(INTEGER, TEXT) IS 'Returns recent failed verification attempts, optionally filtered by event';
COMMENT ON FUNCTION public.cleanup_old_verification_logs() IS 'Deletes verification logs older than 30 days';
