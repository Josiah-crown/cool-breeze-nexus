-- Setup automatic machine status updates
-- This creates a function that can be called via Edge Function or scheduled job

-- Grant execute permission to service role (for edge function calls)
GRANT EXECUTE ON FUNCTION public.update_machines_from_latest_readings() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_machines_from_latest_readings() TO authenticated;

-- Note: To automatically update machine status every minute, you can:
-- 1. Create an Edge Function that calls this function
-- 2. Use an external cron service (e.g., cron-job.org) to call the Edge Function
-- 3. Use pg_cron extension (if enabled in your Supabase project)

-- Example: Manual update (run this in SQL Editor to test)
-- SELECT public.update_machines_from_latest_readings();

COMMENT ON FUNCTION public.update_machines_from_latest_readings IS 'Updates machines table with latest readings. Sets readings to 0 if disconnected. Should be called every 1-2 minutes for real-time updates.';

