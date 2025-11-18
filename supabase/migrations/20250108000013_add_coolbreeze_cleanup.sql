-- CoolBreeze Data Cleanup Function
-- Automatically deletes CoolBreeze data older than 1 year

-- Function to clean up old CoolBreeze data (older than 1 year)
CREATE OR REPLACE FUNCTION public.cleanup_old_coolbreeze_data()
RETURNS JSONB AS $$
DECLARE
  v_cutoff_date TIMESTAMPTZ;
  v_deleted_count INTEGER;
BEGIN
  -- Calculate cutoff date (1 year ago)
  v_cutoff_date := NOW() - INTERVAL '1 year';
  
  -- Delete old records (use timestamp column, not created_at)
  DELETE FROM public.coolbreeze
  WHERE timestamp < v_cutoff_date;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Cleaned up % CoolBreeze records older than %', v_deleted_count, v_cutoff_date;
  
  RETURN jsonb_build_object(
    'deleted_count', v_deleted_count,
    'cutoff_date', v_cutoff_date
  );
END;
$$ LANGUAGE plpgsql;

-- Auto cleanup function (safe to call frequently)
CREATE OR REPLACE FUNCTION public.auto_cleanup_coolbreeze_data()
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  v_result := public.cleanup_old_coolbreeze_data();
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.cleanup_old_coolbreeze_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_coolbreeze_data() TO service_role;
GRANT EXECUTE ON FUNCTION public.auto_cleanup_coolbreeze_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_cleanup_coolbreeze_data() TO service_role;

COMMENT ON FUNCTION public.cleanup_old_coolbreeze_data IS 'Deletes CoolBreeze records older than 1 year. Keeps only 1 year of historical data for website charts.';
COMMENT ON FUNCTION public.auto_cleanup_coolbreeze_data IS 'Automatically deletes CoolBreeze records older than 1 year. Safe to call frequently. Returns JSON with deletion count.';

-- View to check data retention
CREATE OR REPLACE VIEW public.coolbreeze_data_retention_info AS
SELECT 
  COUNT(*) as total_records,
  MIN(timestamp) as oldest_record,
  MAX(timestamp) as newest_record,
  COUNT(*) FILTER (WHERE timestamp < NOW() - INTERVAL '1 year') as records_to_delete
FROM public.coolbreeze;

COMMENT ON VIEW public.coolbreeze_data_retention_info IS 'Shows CoolBreeze data retention statistics. Records older than 1 year should be cleaned up.';


