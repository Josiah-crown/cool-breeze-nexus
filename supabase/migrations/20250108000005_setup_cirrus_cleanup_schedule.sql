-- Setup automated cleanup for CIRRUS table
-- This creates a database function that can be called via Supabase Edge Function
-- or scheduled via external cron service

-- Function to check and cleanup old data (safe to call frequently)
CREATE OR REPLACE FUNCTION public.auto_cleanup_cirrus_data()
RETURNS JSONB AS $$
DECLARE
  v_deleted_count BIGINT;
  v_cutoff_date TIMESTAMPTZ;
  v_result JSONB;
BEGIN
  -- Calculate cutoff date (1 year ago)
  v_cutoff_date := NOW() - INTERVAL '1 year';
  
  -- Delete records older than 1 year
  DELETE FROM public.cirrus
  WHERE timestamp < v_cutoff_date;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- Return result
  v_result := jsonb_build_object(
    'success', true,
    'deleted_count', v_deleted_count,
    'cutoff_date', v_cutoff_date,
    'timestamp', NOW()
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (for edge function calls)
GRANT EXECUTE ON FUNCTION public.auto_cleanup_cirrus_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_cleanup_cirrus_data() TO service_role;

COMMENT ON FUNCTION public.auto_cleanup_cirrus_data IS 'Automatically deletes CIRRUS records older than 1 year. Safe to call frequently. Returns JSON with deletion count.';

-- Note: To schedule this automatically, you can:
-- 1. Use Supabase Edge Function + external cron (e.g., cron-job.org)
-- 2. Use pg_cron extension (if enabled in your Supabase project)
-- 3. Call manually via Supabase Dashboard SQL Editor
-- 4. Set up a webhook that calls the edge function daily

-- Example: Manual cleanup (run this in SQL Editor to test)
-- SELECT public.auto_cleanup_cirrus_data();


