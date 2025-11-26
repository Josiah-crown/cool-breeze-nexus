-- ========================================
-- FIX TABLE GRANTS FOR ALLIANCE AND COOLBREEZE
-- ========================================
-- Purpose: Ensure authenticated role has proper table permissions
-- This might be the missing piece - RLS policies need table-level grants too
-- ========================================

-- Grant USAGE on schema (if not already granted)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO service_role;

-- Grant SELECT on alliance table (matching cirrus exactly)
GRANT SELECT ON public.alliance TO authenticated;
GRANT SELECT ON public.alliance TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alliance TO service_role;

-- Grant SELECT on coolbreeze table (matching cirrus exactly)
GRANT SELECT ON public.coolbreeze TO authenticated;
GRANT SELECT ON public.coolbreeze TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coolbreeze TO service_role;

-- Grant SELECT on alliance_raw table (matching cirrus_raw pattern)
GRANT SELECT ON public.alliance_raw TO authenticated;
GRANT SELECT ON public.alliance_raw TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alliance_raw TO service_role;

-- Verify grants were applied
SELECT 
  'Table Grants After Fix' as check_type,
  table_name,
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('cirrus', 'coolbreeze', 'alliance', 'alliance_raw')
  AND grantee IN ('authenticated', 'anon', 'service_role')
ORDER BY table_name, grantee, privilege_type;

