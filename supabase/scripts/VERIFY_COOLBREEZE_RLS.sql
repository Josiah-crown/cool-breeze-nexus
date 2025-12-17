-- VERIFY: Check if CoolBreeze RLS policy exists and is correct
-- Run this to see what policies are currently on the coolbreeze table

-- Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'coolbreeze';

-- Check all policies on coolbreeze table
SELECT 
  tablename,
  policyname,
  cmd,
  permissive,
  roles,
  qual as using_expression,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'coolbreeze'
ORDER BY cmd, policyname;

-- Check if the specific policy we created exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
      AND tablename = 'coolbreeze'
      AND policyname = 'Users can view CoolBreeze data for accessible machines'
      AND cmd = 'SELECT'
    ) THEN '✅ Policy EXISTS'
    ELSE '❌ Policy MISSING'
  END as policy_status;

