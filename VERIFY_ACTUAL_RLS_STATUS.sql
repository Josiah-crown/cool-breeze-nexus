-- VERIFY ACTUAL RLS STATUS
-- Run this in Supabase SQL Editor to see the REAL state
-- This will tell us definitively if policies exist or not

-- ========================================
-- PART 1: Check RLS Enabled Status
-- ========================================
SELECT 
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ RLS Enabled'
    ELSE '❌ RLS Disabled'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'profiles',
  'user_roles',
  'client_admin_assignments',
  'installer_company_assignments',
  'machines'
)
ORDER BY tablename;

-- ========================================
-- PART 2: Count Actual Policies
-- ========================================
SELECT 
  tablename,
  COUNT(*) as policy_count,
  STRING_AGG(policyname, ', ' ORDER BY policyname) as policy_names
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
  'profiles',
  'user_roles',
  'client_admin_assignments',
  'installer_company_assignments',
  'machines'
)
GROUP BY tablename
ORDER BY tablename;

-- ========================================
-- PART 3: Combined Status (The Truth)
-- ========================================
SELECT 
  t.tablename,
  t.rowsecurity as rls_enabled,
  COALESCE(p.policy_count, 0) as policy_count,
  CASE 
    WHEN NOT t.rowsecurity THEN '❌ RLS DISABLED - INSECURE'
    WHEN t.rowsecurity AND COALESCE(p.policy_count, 0) = 0 THEN '⚠️ RLS ENABLED BUT NO POLICIES - "Unrestricted" = INSECURE'
    WHEN t.rowsecurity AND COALESCE(p.policy_count, 0) > 0 THEN '✅ RLS ENABLED WITH POLICIES - Secure'
    ELSE '❓ UNKNOWN'
  END as security_status
FROM pg_tables t
LEFT JOIN (
  SELECT tablename, COUNT(*) as policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  GROUP BY tablename
) p ON t.tablename = p.tablename
WHERE t.schemaname = 'public'
AND t.tablename IN (
  'profiles',
  'user_roles',
  'client_admin_assignments',
  'installer_company_assignments',
  'machines'
)
ORDER BY t.tablename;

