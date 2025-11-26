-- ========================================
-- DIAGNOSE RLS POLICY ISSUES
-- ========================================
-- Purpose: Check RLS status, policies, and compare with working cirrus table
-- Run this to gather diagnostic information
-- ========================================

-- ========================================
-- 1. CHECK RLS IS ENABLED
-- ========================================
SELECT 
  'RLS Status' as check_type,
  tablename,
  CASE 
    WHEN rowsecurity THEN '✓ ENABLED'
    ELSE '✗ DISABLED'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('cirrus', 'coolbreeze', 'alliance', 'alliance_raw')
ORDER BY tablename;

-- ========================================
-- 2. LIST ALL POLICIES FOR EACH TABLE
-- ========================================

-- Cirrus policies (working reference)
SELECT 
  'Cirrus Policies (WORKING)' as table_name,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'cirrus'
ORDER BY cmd, policyname;

-- CoolBreeze policies
SELECT 
  'CoolBreeze Policies' as table_name,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'coolbreeze'
ORDER BY cmd, policyname;

-- Alliance policies
SELECT 
  'Alliance Policies' as table_name,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'alliance'
ORDER BY cmd, policyname;

-- Alliance Raw policies
SELECT 
  'Alliance Raw Policies' as table_name,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'alliance_raw'
ORDER BY cmd, policyname;

-- ========================================
-- 3. COMPARE POLICY COUNTS
-- ========================================
SELECT 
  tablename,
  COUNT(*) as total_policies,
  COUNT(*) FILTER (WHERE cmd = 'SELECT') as select_policies,
  COUNT(*) FILTER (WHERE cmd = 'INSERT') as insert_policies,
  COUNT(*) FILTER (WHERE cmd = 'UPDATE') as update_policies
FROM pg_policies
WHERE tablename IN ('cirrus', 'coolbreeze', 'alliance', 'alliance_raw')
GROUP BY tablename
ORDER BY tablename;

-- ========================================
-- 4. CHECK TABLE PERMISSIONS (GRANTS)
-- ========================================
-- This checks if authenticated role has USAGE/SELECT permissions
SELECT 
  'Table Grants' as check_type,
  table_name,
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('cirrus', 'coolbreeze', 'alliance', 'alliance_raw')
  AND grantee IN ('authenticated', 'anon', 'service_role')
ORDER BY table_name, grantee, privilege_type;

-- ========================================
-- 5. CHECK IF TABLES EXIST
-- ========================================
SELECT 
  'Table Existence' as check_type,
  tablename,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = tablename
    ) THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END as status
FROM (VALUES ('cirrus'), ('coolbreeze'), ('alliance'), ('alliance_raw')) AS t(tablename);

-- ========================================
-- 6. CHECK USER ROLES FUNCTION
-- ========================================
SELECT 
  'has_role Function' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'has_role' 
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END as status;

-- ========================================
-- 7. CHECK REFERENCED TABLES EXIST
-- ========================================
SELECT 
  'Referenced Tables' as check_type,
  table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = t.table_name
    ) THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END as status
FROM (VALUES 
  ('machines'),
  ('user_roles'),
  ('installer_company_assignments'),
  ('client_admin_assignments')
) AS t(table_name);

-- ========================================
-- 8. TEST CURRENT USER ROLE
-- ========================================
-- This will show what role the current user has
SELECT 
  'Current User Role' as check_type,
  auth.uid() as current_user_id,
  ur.role as user_role
FROM public.user_roles ur
WHERE ur.user_id = auth.uid()
LIMIT 1;
