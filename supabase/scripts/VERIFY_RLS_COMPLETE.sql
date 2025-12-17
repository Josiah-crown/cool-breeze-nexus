-- Complete RLS Verification Query
-- Run this to see the full status of RLS on all tables

-- 1. Check RLS status for all tables
SELECT 
  t.tablename,
  t.rowsecurity as rls_enabled,
  COALESCE(p.policy_count, 0) as policy_count,
  CASE 
    WHEN t.rowsecurity AND COALESCE(p.policy_count, 0) > 0 THEN '✅ Secure (RLS + Policies)'
    WHEN t.rowsecurity AND COALESCE(p.policy_count, 0) = 0 THEN '⚠️ RLS Enabled but NO Policies (BLOCKED!)'
    WHEN NOT t.rowsecurity THEN '❌ RLS Disabled (INSECURE!)'
    ELSE '❓ Unknown'
  END as security_status
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
AND t.tablename NOT IN (
  'machine_connection_status',  -- View, doesn't need RLS
  'cirrus_data_retention_info', -- View
  'coolbreeze_data_retention_info' -- View
)
ORDER BY 
  CASE 
    WHEN t.rowsecurity AND COALESCE(p.policy_count, 0) > 0 THEN 1
    WHEN t.rowsecurity AND COALESCE(p.policy_count, 0) = 0 THEN 2
    ELSE 3
  END,
  t.tablename;

-- 2. List all policies for each table (detailed view)
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as operation,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

