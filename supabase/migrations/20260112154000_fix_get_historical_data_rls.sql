-- ============================================================================
-- Fix get_historical_data Function - Ensure RLS Bypass
-- ============================================================================
-- Date: January 12, 2026
-- Purpose: Fix function returning no rows despite data existing
-- 
-- Issue: SECURITY DEFINER function is being blocked by RLS policies.
--        Even though the function runs with function owner privileges,
--        RLS is still being applied.
--
-- Solution: Recreate the function and ensure it's properly configured.
--           The function is already SECURITY DEFINER, which should work,
--           but we'll ensure it's owned by postgres and has proper permissions.
-- ============================================================================

-- First, ensure the function exists and check its current state
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname = 'get_historical_data'
    AND pg_get_function_identity_arguments(p.oid) = 'p_machine_id uuid, p_period text, p_table_name text'
  ) THEN
    RAISE EXCEPTION 'Function get_historical_data does not exist. Please run migration 20251208000003_fix_historical_data_function.sql first.';
  END IF;
  
  RAISE NOTICE 'Function exists, proceeding with fix...';
END $$;

-- Ensure function is owned by postgres (which should have BYPASSRLS)
-- This is important for SECURITY DEFINER functions to properly bypass RLS
DO $$
BEGIN
  -- Try to set owner to postgres (might fail if we don't have permission, that's ok)
  BEGIN
    ALTER FUNCTION public.get_historical_data(UUID, TEXT, TEXT) OWNER TO postgres;
    RAISE NOTICE 'Function owner set to postgres';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not change function owner (this is ok if already correct or if permissions don''t allow): %', SQLERRM;
  END;
END $$;

-- Grant execute permissions (ensure they're granted)
GRANT EXECUTE ON FUNCTION public.get_historical_data(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_historical_data(UUID, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_historical_data(UUID, TEXT, TEXT) TO service_role;

-- Verify function configuration
DO $$
DECLARE
  func_owner TEXT;
  is_definer BOOLEAN;
BEGIN
  SELECT r.rolname, p.prosecdef
  INTO func_owner, is_definer
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  JOIN pg_roles r ON p.proowner = r.oid
  WHERE n.nspname = 'public' 
  AND p.proname = 'get_historical_data'
  AND pg_get_function_identity_arguments(p.oid) = 'p_machine_id uuid, p_period text, p_table_name text';
  
  RAISE NOTICE 'Function owner: %, is SECURITY DEFINER: %', func_owner, is_definer;
  
  IF NOT is_definer THEN
    RAISE WARNING 'Function is NOT SECURITY DEFINER - this may cause RLS issues!';
  END IF;
END $$;

-- ============================================================================
-- NOTES
-- ============================================================================
-- In Supabase/PostgreSQL, SECURITY DEFINER functions should bypass RLS if:
-- 1. The function owner has BYPASSRLS attribute (postgres role should have this)
-- 2. The function is marked as SECURITY DEFINER (which it is)
--
-- However, if the function still doesn't work, the issue might be:
-- 1. Function owner doesn't have BYPASSRLS (unlikely for postgres)
-- 2. There's a bug or configuration issue in Supabase
-- 3. The RLS policies are somehow blocking even SECURITY DEFINER functions
--
-- If this doesn't fix it, we may need to:
-- - Modify RLS policies to allow the function to access data
-- - Use a different approach (e.g., service_role in the function)
-- - Check Supabase documentation for SECURITY DEFINER + RLS behavior
--
-- Test the function:
-- SELECT * FROM get_historical_data('your-machine-id'::uuid, '24h', 'cirrus');

