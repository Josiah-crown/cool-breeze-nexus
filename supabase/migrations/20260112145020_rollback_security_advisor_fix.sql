-- ============================================================================
-- Rollback Security Advisor Fix
-- ============================================================================
-- Date: January 12, 2026
-- Purpose: Rollback the changes made to:
--   1. Disable RLS on alliance table (reverting the enable from security fix)
--   2. Restore historical_data_summary view (no change needed, already uses 'alliance')
-- ============================================================================

-- ========================================
-- 1. DISABLE ROW LEVEL SECURITY ON alliance
-- ========================================
-- Reverting the RLS enable - disabling RLS on the table.
-- NOTE: This will restore the table to having RLS policies defined but RLS disabled,
-- which matches the state before the security advisor fix migration.

ALTER TABLE IF EXISTS public.alliance DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'alliance'
    AND rowsecurity = false
  ) THEN
    RAISE NOTICE '✅ RLS disabled on alliance table';
  ELSE
    RAISE WARNING '⚠️ RLS may still be enabled on alliance table';
  END IF;
END $$;

-- ========================================
-- 2. RESTORE historical_data_summary VIEW
-- ========================================
-- Note: The view already uses 'alliance' table, so no change is needed.
-- However, we'll recreate it to ensure it's in the correct state.

DROP VIEW IF EXISTS public.historical_data_summary;

CREATE OR REPLACE VIEW public.historical_data_summary
AS
SELECT 
  'cirrus' AS table_name,
  machine_id,
  MIN(timestamp) AS earliest_data,
  MAX(timestamp) AS latest_data,
  COUNT(*) AS total_readings,
  COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '365 days') AS readings_last_year
FROM public.cirrus
GROUP BY machine_id
UNION ALL
SELECT 
  'coolbreeze' AS table_name,
  machine_id,
  MIN(timestamp) AS earliest_data,
  MAX(timestamp) AS latest_data,
  COUNT(*) AS total_readings,
  COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '365 days') AS readings_last_year
FROM public.coolbreeze
GROUP BY machine_id
UNION ALL
SELECT 
  'alliance' AS table_name,
  machine_id,
  MIN(timestamp) AS earliest_data,
  MAX(timestamp) AS latest_data,
  COUNT(*) AS total_readings,
  COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '365 days') AS readings_last_year
FROM public.alliance
GROUP BY machine_id;

-- Grant select on view
GRANT SELECT ON public.historical_data_summary TO authenticated;
GRANT SELECT ON public.historical_data_summary TO service_role;

COMMENT ON VIEW public.historical_data_summary IS 
'Summary view showing data ranges for each machine in each processing table. 
Use this to verify what data exists and date ranges.
Updated to include alliance table.
View respects RLS policies on underlying tables.';

-- ========================================
-- VERIFICATION
-- ========================================

-- Verify RLS is disabled on alliance
DO $$
DECLARE
  rls_enabled BOOLEAN;
BEGIN
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public' 
  AND tablename = 'alliance';
  
  IF NOT rls_enabled THEN
    RAISE NOTICE '✅ RLS is disabled on alliance';
  ELSE
    RAISE WARNING '⚠️ RLS is still enabled on alliance';
  END IF;
END $$;

-- Verify view exists and uses alliance table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_views 
    WHERE schemaname = 'public' 
    AND viewname = 'historical_data_summary'
  ) THEN
    RAISE NOTICE '✅ historical_data_summary view restored successfully';
  ELSE
    RAISE WARNING '⚠️ historical_data_summary view may not exist';
  END IF;
END $$;

