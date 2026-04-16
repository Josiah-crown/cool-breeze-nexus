-- ============================================================================
-- Complete Diagnostic for Historical Data Issue
-- ============================================================================
-- Run each section separately to see all results
-- ============================================================================

-- ========================================
-- 1. CHECK FUNCTION EXISTS AND IS SECURITY DEFINER
-- ========================================
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  r.rolname as owner,
  p.prosecdef as is_security_definer,
  CASE WHEN p.proconfig IS NULL THEN 'none' ELSE array_to_string(p.proconfig, ', ') END as config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_roles r ON p.proowner = r.oid
WHERE n.nspname = 'public' 
AND p.proname = 'get_historical_data';

-- ========================================
-- 2. CHECK RLS STATUS ON TABLES
-- ========================================
SELECT 
  tablename,
  rowsecurity as rls_enabled,
  CASE WHEN rowsecurity THEN '✅ Enabled' ELSE '❌ Disabled' END as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('cirrus', 'coolbreeze', 'alliance')
ORDER BY tablename;

-- ========================================
-- 3. CHECK IF POSTGRES ROLE HAS BYPASSRLS
-- ========================================
SELECT 
  rolname,
  rolbypassrls as has_bypassrls,
  CASE WHEN rolbypassrls THEN '✅ Yes' ELSE '❌ No' END as status
FROM pg_roles
WHERE rolname IN ('postgres', 'authenticator', 'service_role')
ORDER BY rolname;

-- ========================================
-- 4. CHECK RLS POLICIES (You already ran this)
-- ========================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('cirrus', 'coolbreeze', 'alliance')
ORDER BY tablename, policyname;

-- ========================================
-- 5. TEST: COUNT DATA IN TABLES
-- ========================================
-- Uncomment and replace with actual machine_id to test
-- SELECT 'cirrus' as table_name, COUNT(*) as row_count FROM cirrus;
-- SELECT 'coolbreeze' as table_name, COUNT(*) as row_count FROM coolbreeze;
-- SELECT 'alliance' as table_name, COUNT(*) as row_count FROM alliance;

