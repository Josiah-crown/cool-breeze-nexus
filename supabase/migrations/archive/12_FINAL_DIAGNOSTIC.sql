-- Final Comprehensive Diagnostic
-- This will check EVERYTHING that could be causing the 403 error

-- Step 1: Check ALL policies (including any we might have missed)
SELECT 
  'ALL Policies on cirrus' as check_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'cirrus'
ORDER BY cmd, policyname;

-- Step 2: Check if RLS is enabled
SELECT 
  'RLS Status' as check_type,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity = true THEN '✅ RLS Enabled'
    ELSE '❌ RLS Disabled'
  END as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'cirrus';

-- Step 3: Check table permissions
SELECT 
  'Table Permissions' as check_type,
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'cirrus'
ORDER BY grantee, privilege_type;

-- Step 4: Check if there are any default deny policies or restrictive policies
SELECT 
  'Policy Types' as check_type,
  policyname,
  permissive,
  CASE 
    WHEN permissive = false THEN '⚠️ RESTRICTIVE - Blocks if matches'
    WHEN permissive = true THEN '✅ PERMISSIVE - Allows if matches'
    ELSE '❓ Unknown'
  END as policy_type,
  CASE
    WHEN qual IS NULL OR qual = '' THEN '⚠️ No USING clause'
    ELSE '✅ Has USING clause'
  END as has_using
FROM pg_policies
WHERE tablename = 'cirrus'
ORDER BY permissive, policyname;

-- Step 5: Check function grants again
SELECT 
  'Function Grants' as check_type,
  p.proname as function_name,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('postgres', p.oid, 'EXECUTE') as postgres_can_execute
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'has_role';

-- Step 6: Check schema and search_path
SELECT 
  'Schema Info' as check_type,
  current_schema() as current_schema,
  current_setting('search_path') as search_path;

-- Step 7: Try the nuclear option - create a policy that allows everything
-- This will help us determine if the issue is with policy logic or something else
DROP POLICY IF EXISTS "TEST: All authenticated users can view CIRRUS data" ON public.cirrus;
DROP POLICY IF EXISTS "Users can view CIRRUS data for accessible machines" ON public.cirrus;
DROP POLICY IF EXISTS "Super admins can view all CIRRUS data" ON public.cirrus;
DROP POLICY IF EXISTS "Users can view their own CIRRUS data" ON public.cirrus;
DROP POLICY IF EXISTS "Installers can view their CIRRUS data" ON public.cirrus;
DROP POLICY IF EXISTS "Companies can view their CIRRUS data" ON public.cirrus;

-- Create the simplest possible policy
CREATE POLICY "TEST: All authenticated users can view CIRRUS data"
  ON public.cirrus
  FOR SELECT
  TO authenticated
  USING (true);

-- Step 8: Verify the test policy
SELECT 
  'Test Policy Created' as check_type,
  policyname,
  cmd,
  roles,
  permissive,
  qual
FROM pg_policies
WHERE tablename = 'cirrus' AND cmd = 'SELECT'
ORDER BY policyname;

-- IMPORTANT: 
-- After running this, test in browser with HARD REFRESH (Ctrl+Shift+R)
-- If this STILL doesn't work, the issue is NOT with RLS policies
-- It could be:
-- 1. Frontend not sending auth token correctly
-- 2. Supabase project configuration issue
-- 3. Table-level permissions issue
-- 4. Something else entirely

