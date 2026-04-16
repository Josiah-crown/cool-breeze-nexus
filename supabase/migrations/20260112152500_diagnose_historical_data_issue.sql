-- ============================================================================
-- Diagnostic Script for Historical Data Issue
-- ============================================================================
-- IMPORTANT: Run each query separately - Supabase only shows the last result!
-- ============================================================================

-- ========================================
-- QUERY 1: Check Function Info
-- ========================================
-- Run this query FIRST to see function owner and SECURITY DEFINER status
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
-- QUERY 2: Check RLS Status on Tables
-- ========================================
-- Run this query SECOND
SELECT 
  tablename,
  rowsecurity as rls_enabled,
  CASE WHEN rowsecurity THEN '✅ Enabled' ELSE '❌ Disabled' END as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('cirrus', 'coolbreeze', 'alliance')
ORDER BY tablename;

-- ========================================
-- QUERY 3: Check BYPASSRLS Status
-- ========================================
-- Run this query THIRD to see if function owner can bypass RLS
SELECT 
  rolname,
  rolbypassrls as has_bypassrls,
  CASE WHEN rolbypassrls THEN '✅ Yes' ELSE '❌ No' END as status
FROM pg_roles
WHERE rolname IN ('postgres', 'authenticator', 'service_role')
ORDER BY rolname;

-- ========================================
-- QUERY 4: Check RLS Policies (You already have this)
-- ========================================
-- Run this query FOURTH
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

