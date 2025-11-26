-- CIRRUS Data Cleanup Function
-- Automatically deletes CIRRUS data older than 1 year
-- Keeps only 1 year of historical data for website charts

-- Function to clean up old CIRRUS data (older than 1 year)
CREATE OR REPLACE FUNCTION public.cleanup_old_cirrus_data()
RETURNS TABLE(deleted_count BIGINT) AS $$
DECLARE
  v_deleted_count BIGINT;
  v_cutoff_date TIMESTAMPTZ;
BEGIN
  -- Calculate cutoff date (1 year ago)
  v_cutoff_date := NOW() - INTERVAL '1 year';
  
  -- Delete records older than 1 year
  DELETE FROM public.cirrus
  WHERE timestamp < v_cutoff_date;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN QUERY SELECT v_deleted_count;
  
  -- Log cleanup (optional - can be removed if not needed)
  RAISE NOTICE 'Cleaned up % CIRRUS records older than %', v_deleted_count, v_cutoff_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to run cleanup daily
-- Note: Supabase uses pg_cron extension for scheduled jobs
-- This requires pg_cron to be enabled in your Supabase project

-- Schedule daily cleanup at 2 AM UTC
-- Uncomment the line below if pg_cron is enabled in your Supabase project
-- SELECT cron.schedule(
--   'cleanup-old-cirrus-data',
--   '0 2 * * *',  -- Daily at 2 AM UTC
--   $$SELECT public.cleanup_old_cirrus_data()$$
-- );

-- Alternative: Manual cleanup function that can be called via Supabase Dashboard
-- Or via edge function/webhook on a schedule

-- Comment on function
COMMENT ON FUNCTION public.cleanup_old_cirrus_data IS 'Deletes CIRRUS records older than 1 year. Keeps only 1 year of historical data for website charts.';

-- Create a view to show data retention info
CREATE OR REPLACE VIEW public.cirrus_data_retention_info AS
SELECT 
  COUNT(*) as total_records,
  MIN(timestamp) as oldest_record,
  MAX(timestamp) as newest_record,
  COUNT(*) FILTER (WHERE timestamp < NOW() - INTERVAL '1 year') as records_to_delete,
  COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '1 year') as records_to_keep
FROM public.cirrus;

COMMENT ON VIEW public.cirrus_data_retention_info IS 'Shows CIRRUS data retention statistics. Records older than 1 year should be cleaned up.';


