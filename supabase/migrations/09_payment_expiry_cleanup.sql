-- Migration: 09_payment_expiry_cleanup.sql
-- Purpose: Add automatic payment expiry cleanup functionality
-- Updates pending payments to failed status after 2 hours

CREATE OR REPLACE FUNCTION public.update_expired_pending_payments()
RETURNS TABLE(
  affected_rows INTEGER,
  updated_purchase_ids TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  updated_ids TEXT[] := '{}';
  update_count INTEGER := 0;
  expiry_threshold TIMESTAMP WITH TIME ZONE;
BEGIN
  expiry_threshold := NOW() - INTERVAL '2 hours';

  RAISE LOG 'Starting expired payments cleanup. Threshold: %', expiry_threshold;

  WITH updated_purchases AS (
    UPDATE public.purchases
    SET
      status = 'payment_failed',
      updated_at = NOW()
    WHERE
      status = 'pending_payment'
      AND created_at < expiry_threshold
    RETURNING id
  )
  SELECT
    ARRAY(SELECT id::text FROM updated_purchases),
    (SELECT COUNT(*) FROM updated_purchases)
  INTO updated_ids, update_count;

  RAISE LOG 'Expired payments cleanup completed. Updated % purchases: %',
    update_count, updated_ids;

  RETURN QUERY SELECT update_count, updated_ids;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_expired_pending_payments() TO service_role;

COMMENT ON FUNCTION public.update_expired_pending_payments() IS
'Updates pending payments older than 2 hours to failed status.
Called automatically by scheduled job every 2 hours.
Returns count of affected rows and list of updated purchase IDs.';

CREATE OR REPLACE VIEW public.payment_status_summary
WITH (security_invoker = on)
AS
SELECT
  status,
  COUNT(*) AS count,
  MIN(created_at) AS oldest_payment,
  MAX(created_at) AS newest_payment
FROM public.purchases
GROUP BY status
ORDER BY count DESC;

GRANT SELECT ON public.payment_status_summary TO service_role;

COMMENT ON VIEW public.payment_status_summary IS
'Provides summary of payment statuses for monitoring and admin purposes.';
