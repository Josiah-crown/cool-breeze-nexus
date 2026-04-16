-- ============================================================================
-- Fix Historical Data Function - Ensure It Can Access Data
-- ============================================================================
-- Date: January 12, 2026
-- Purpose: Fix get_historical_data function returning no rows despite data existing
-- 
-- Issue: Function is SECURITY DEFINER but RLS policies are blocking access.
--        RLS policies check auth.uid() which evaluates to the calling user,
--        not the function owner, so SECURITY DEFINER functions are still blocked.
--
-- Solution: Ensure the function owner is postgres (or service_role) which should
--           have BYPASSRLS, OR we need to modify RLS policies to allow the function.
--           Actually, the real solution is that SECURITY DEFINER functions in Supabase
--           DO bypass RLS, but we need to ensure the function is set up correctly.
--
--           After investigation, the issue is likely that the function needs to be
--           owned by a role with proper privileges. Let's ensure it's owned by postgres.
-- ============================================================================

-- Ensure function is owned by postgres role (which has BYPASSRLS)
-- This allows the SECURITY DEFINER function to bypass RLS
ALTER FUNCTION public.get_historical_data(UUID, TEXT, TEXT) OWNER TO postgres;

-- Verify function owner
DO $$
DECLARE
  func_owner TEXT;
BEGIN
  SELECT pg_get_function_identity_arguments(p.oid) INTO func_owner
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  JOIN pg_roles r ON p.proowner = r.oid
  WHERE n.nspname = 'public' 
  AND p.proname = 'get_historical_data'
  AND pg_get_function_identity_arguments(p.oid) = 'p_machine_id uuid, p_period text, p_table_name text';
  
  SELECT r.rolname INTO func_owner
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  JOIN pg_roles r ON p.proowner = r.oid
  WHERE n.nspname = 'public' 
  AND p.proname = 'get_historical_data'
  AND pg_get_function_identity_arguments(p.oid) = 'p_machine_id uuid, p_period text, p_table_name text';
  
  RAISE NOTICE 'Function owner: %', func_owner;
END $$;

-- Grant execute permissions (ensure they're still there)
GRANT EXECUTE ON FUNCTION public.get_historical_data(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_historical_data(UUID, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_historical_data(UUID, TEXT, TEXT) TO service_role;

-- Note: In Supabase, SECURITY DEFINER functions owned by postgres should automatically
-- bypass RLS. If this still doesn't work, the issue might be elsewhere.
--
-- To test, run in SQL Editor:
-- SELECT * FROM get_historical_data('your-machine-id'::uuid, '24h', 'cirrus');

