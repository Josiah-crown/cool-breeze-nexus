-- ============================================================================
-- Fix Historical Data Function - Ensure BYPASSRLS for Function Owner
-- ============================================================================
-- Date: January 12, 2026
-- Purpose: Fix get_historical_data function being blocked by RLS
-- 
-- Root Cause: SECURITY DEFINER functions need the function owner to have
--            BYPASSRLS attribute to bypass RLS policies. Without this,
--            RLS is still evaluated based on the calling user's context.
--
-- Solution: Ensure function owner has BYPASSRLS, or ensure function is
--           owned by a role that has it (like postgres).
-- ============================================================================

-- Check current function owner and BYPASSRLS status
DO $$
DECLARE
  func_owner TEXT;
  owner_has_bypass BOOLEAN;
BEGIN
  -- Get function owner
  SELECT r.rolname
  INTO func_owner
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  JOIN pg_roles r ON p.proowner = r.oid
  WHERE n.nspname = 'public' 
  AND p.proname = 'get_historical_data'
  AND pg_get_function_identity_arguments(p.oid) = 'p_machine_id uuid, p_period text, p_table_name text';
  
  -- Check if owner has BYPASSRLS
  SELECT rolbypassrls
  INTO owner_has_bypass
  FROM pg_roles
  WHERE rolname = func_owner;
  
  RAISE NOTICE 'Function owner: %, has BYPASSRLS: %', func_owner, COALESCE(owner_has_bypass, false);
  
  IF NOT COALESCE(owner_has_bypass, false) THEN
    RAISE WARNING 'Function owner does NOT have BYPASSRLS - this will cause RLS to block the function!';
    RAISE NOTICE 'Attempting to set function owner to postgres (which should have BYPASSRLS)...';
    
    -- Try to change owner to postgres
    BEGIN
      ALTER FUNCTION public.get_historical_data(UUID, TEXT, TEXT) OWNER TO postgres;
      RAISE NOTICE 'Function owner changed to postgres';
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Could not change function owner: %', SQLERRM;
      RAISE NOTICE 'You may need to run this as a superuser or contact Supabase support';
    END;
  END IF;
END $$;

-- Verify postgres role has BYPASSRLS (it should)
DO $$
DECLARE
  postgres_has_bypass BOOLEAN;
BEGIN
  SELECT rolbypassrls
  INTO postgres_has_bypass
  FROM pg_roles
  WHERE rolname = 'postgres';
  
  IF COALESCE(postgres_has_bypass, false) THEN
    RAISE NOTICE '✅ postgres role has BYPASSRLS - function should work correctly';
  ELSE
    RAISE WARNING '⚠️ postgres role does NOT have BYPASSRLS - this is unusual for Supabase';
  END IF;
END $$;

-- Ensure execute permissions are granted
GRANT EXECUTE ON FUNCTION public.get_historical_data(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_historical_data(UUID, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_historical_data(UUID, TEXT, TEXT) TO service_role;

-- ============================================================================
-- IMPORTANT NOTES
-- ============================================================================
-- If this doesn't fix the issue, the problem might be:
--
-- 1. In Supabase, SECURITY DEFINER functions might not automatically bypass RLS
--    even with BYPASSRLS. This could be a Supabase-specific behavior.
--
-- 2. Alternative solutions if this doesn't work:
--    a) Modify RLS policies to allow the function to access data
--    b) Use service_role key in the application (not recommended for security)
--    c) Create a wrapper function that uses service_role context
--    d) Disable RLS on the tables (not recommended)
--
-- 3. Test the function after running this migration:
--    SELECT * FROM get_historical_data('your-machine-id'::uuid, '24h', 'cirrus');
--
-- 4. If it still doesn't work, check Supabase documentation or support for
--    SECURITY DEFINER + RLS behavior in their platform.

