-- Comprehensive RLS Status Check
-- Run this in Supabase SQL Editor to see which tables have RLS enabled and which don't

-- Check RLS status for all user tables
SELECT 
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ RLS Enabled'
    ELSE '❌ RLS Disabled'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename NOT LIKE 'pg_%'
AND tablename NOT LIKE '_%'
ORDER BY tablename;

-- Check which tables have RLS policies
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Combined view: RLS status + policy count
SELECT 
  t.tablename,
  t.rowsecurity as rls_enabled,
  COALESCE(p.policy_count, 0) as policy_count,
  CASE 
    WHEN t.rowsecurity AND COALESCE(p.policy_count, 0) > 0 THEN '✅ RLS + Policies'
    WHEN t.rowsecurity AND COALESCE(p.policy_count, 0) = 0 THEN '⚠️ RLS Enabled but NO Policies (BLOCKED!)'
    ELSE '❌ RLS Disabled'
  END as status
FROM pg_tables t
LEFT JOIN (
  SELECT tablename, COUNT(*) as policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  GROUP BY tablename
) p ON t.tablename = p.tablename
WHERE t.schemaname = 'public'
AND t.tablename NOT LIKE 'pg_%'
AND t.tablename NOT LIKE '_%'
ORDER BY t.tablename;

