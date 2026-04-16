-- ============================================================================
-- Fix Historical Data Access Issue
-- ============================================================================
-- Date: January 12, 2026
-- Purpose: Ensure get_historical_data function can access data even with RLS enabled
-- 
-- Issue: Historical data stopped showing after RLS was enabled on tables.
-- Solution: The function is already SECURITY DEFINER which should bypass RLS,
--           but we'll ensure the function owner has proper permissions and
--           verify RLS policies allow access.
-- ============================================================================

-- ========================================
-- VERIFY FUNCTION EXISTS AND PERMISSIONS
-- ========================================

DO $$
BEGIN
  -- Check if function exists
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname = 'get_historical_data'
    AND pg_get_function_identity_arguments(p.oid) = 'p_machine_id uuid, p_period text, p_table_name text'
  ) THEN
    RAISE EXCEPTION 'Function get_historical_data does not exist with expected signature';
  END IF;
  
  RAISE NOTICE '✅ get_historical_data function exists';
END $$;

-- ========================================
-- ENSURE FUNCTION HAS PROPER PERMISSIONS
-- ========================================
-- The function should already be SECURITY DEFINER, which means it runs
-- with the privileges of the function owner (typically postgres role).
-- SECURITY DEFINER functions should bypass RLS automatically.

-- Verify function is SECURITY DEFINER
DO $$
DECLARE
  is_definer BOOLEAN;
BEGIN
  SELECT prosecdef INTO is_definer
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' 
  AND p.proname = 'get_historical_data'
  AND pg_get_function_identity_arguments(p.oid) = 'p_machine_id uuid, p_period text, p_table_name text';
  
  IF is_definer THEN
    RAISE NOTICE '✅ get_historical_data is SECURITY DEFINER (should bypass RLS)';
  ELSE
    RAISE WARNING '⚠️ get_historical_data is NOT SECURITY DEFINER - this may cause RLS issues';
  END IF;
END $$;

-- ========================================
-- VERIFY RLS STATUS ON TABLES
-- ========================================

DO $$
DECLARE
  cirrus_rls BOOLEAN;
  coolbreeze_rls BOOLEAN;
  alliance_rls BOOLEAN;
BEGIN
  -- Check cirrus
  SELECT rowsecurity INTO cirrus_rls
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'cirrus';
  
  -- Check coolbreeze
  SELECT rowsecurity INTO coolbreeze_rls
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'coolbreeze';
  
  -- Check alliance
  SELECT rowsecurity INTO alliance_rls
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'alliance';
  
  RAISE NOTICE 'RLS Status - cirrus: %, coolbreeze: %, alliance: %', 
    COALESCE(cirrus_rls::text, 'N/A'),
    COALESCE(coolbreeze_rls::text, 'N/A'),
    COALESCE(alliance_rls::text, 'N/A');
END $$;

-- ========================================
-- GRANT EXECUTE PERMISSIONS (if missing)
-- ========================================

GRANT EXECUTE ON FUNCTION public.get_historical_data(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_historical_data(UUID, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_historical_data(UUID, TEXT, TEXT) TO service_role;

-- ========================================
-- NOTES
-- ========================================
-- SECURITY DEFINER functions in PostgreSQL/Supabase run with the privileges
-- of the function owner (typically postgres role). These functions should
-- automatically bypass RLS policies.
--
-- If historical data is still not showing, the issue may be:
-- 1. The function is being called incorrectly
-- 2. There's an error in the function execution
-- 3. The data doesn't exist for the requested time period
-- 4. Browser/network errors preventing the RPC call
--
-- To debug further, check:
-- - Browser console for JavaScript errors
-- - Supabase logs for function execution errors
-- - Verify data exists in the tables for the requested machine_id and time period

