-- Migration: 09_payment_expiry_cleanup.sql
-- Purpose: Add automatic payment expiry cleanup functionality
-- Updates pending payments to failed status after 2 hours

-- Function to update expired pending payments
CREATE OR REPLACE FUNCTION update_expired_pending_payments()
RETURNS TABLE(
  affected_rows INTEGER,
  updated_purchase_ids TEXT[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_ids TEXT[] := '{}';
  update_count INTEGER := 0;
  expiry_threshold TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Set expiry threshold to 2 hours ago
  expiry_threshold := NOW() - INTERVAL '2 hours';
  
  -- Log the operation start
  RAISE LOG 'Starting expired payments cleanup. Threshold: %', expiry_threshold;
  
  -- Update pending payments that are older than 2 hours to failed status
  WITH updated_purchases AS (
    UPDATE purchases 
    SET 
      status = 'payment_failed',
      updated_at = NOW()
    WHERE 
      status = 'pending_payment' 
      AND created_at < expiry_threshold
    RETURNING id -- Corrected from purchase_id
  )
  SELECT 
    ARRAY(SELECT id::text FROM updated_purchases), -- Corrected and cast to text
    (SELECT COUNT(*) FROM updated_purchases)
  INTO updated_ids, update_count;
  
  -- Log the results
  RAISE LOG 'Expired payments cleanup completed. Updated % purchases: %', 
    update_count, updated_ids;
  
  -- Return results
  RETURN QUERY SELECT update_count, updated_ids;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION update_expired_pending_payments() TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION update_expired_pending_payments() IS 
'Updates pending payments older than 2 hours to failed status. 
Called automatically by scheduled job every 2 hours.
Returns count of affected rows and list of updated purchase IDs.';

-- Optional: Create a view to monitor payment statuses
CREATE OR REPLACE VIEW payment_status_summary AS
SELECT 
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest_payment,
  MAX(created_at) as newest_payment
FROM purchases 
GROUP BY status
ORDER BY count DESC;

-- Grant access to the view
GRANT SELECT ON payment_status_summary TO service_role;

COMMENT ON VIEW payment_status_summary IS 
'Provides summary of payment statuses for monitoring and admin purposes.'; 