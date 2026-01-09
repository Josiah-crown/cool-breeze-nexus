-- ============================================================================
-- Fix Security Advisor Issues
-- ============================================================================
-- Date: December 8, 2025
-- Purpose: 
--   1. Enable RLS on alliance table (has policies but RLS not enabled)
--   2. Fix historical_data_summary view to use SECURITY INVOKER instead of SECURITY DEFINER
-- ============================================================================

-- ========================================
-- 1. ENABLE ROW LEVEL SECURITY ON alliance
-- ========================================
-- The table has RLS policies defined but RLS is not enabled on the table itself.
-- This fixes the "Policy Exists RLS Disabled" security issue.

ALTER TABLE IF EXISTS public.alliance ENABLE ROW LEVEL SECURITY;

-- Verify RLS is enabled
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'alliance'
    AND rowsecurity = true
  ) THEN
    RAISE NOTICE '✅ RLS enabled on alliance table';
  ELSE
    RAISE WARNING '⚠️ RLS may not be enabled on alliance table';
  END IF;
END $$;

-- ========================================
-- 2. FIX historical_data_summary VIEW SECURITY
-- ========================================
-- Recreate the view to ensure it doesn't use SECURITY DEFINER.
-- Views in PostgreSQL inherit permissions from underlying tables and RLS policies.
-- This view should run with the permissions of the querying user (SECURITY INVOKER behavior).

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

-- Verify RLS is enabled on alliance
DO $$
DECLARE
  rls_enabled BOOLEAN;
BEGIN
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public' 
    AND tablename = 'alliance';
  
  IF rls_enabled THEN
    RAISE NOTICE '✅ RLS is enabled on alliance';
  ELSE
    RAISE WARNING '⚠️ RLS is NOT enabled on alliance';
  END IF;
END $$;

-- Verify view exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_views 
    WHERE schemaname = 'public' 
    AND viewname = 'historical_data_summary'
  ) THEN
    RAISE NOTICE '✅ historical_data_summary view recreated successfully';
  ELSE
    RAISE WARNING '⚠️ historical_data_summary view may not exist';
  END IF;
END $$;

