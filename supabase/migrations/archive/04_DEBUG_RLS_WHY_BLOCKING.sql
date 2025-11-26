-- Debug: Why is RLS still blocking?
-- This will help us understand why the policy isn't matching

-- Step 1: Check what user is currently authenticated in the browser
-- We need to know: user_id, role, and machine ownership
-- NOTE: This won't work in SQL Editor (auth.uid() is NULL), but we can check manually

-- Step 2: Check if there's a default deny or conflicting policy
SELECT 
  'All Policies on cirrus' as check_type,
  policyname,
  cmd,
  roles,
  permissive,
  qual
FROM pg_policies
WHERE tablename = 'cirrus'
ORDER BY cmd, policyname;

-- Step 3: Check if RLS is enabled (should be true)
SELECT 
  'RLS Enabled Check' as check_type,
  tablename,
  rowsecurity,
  CASE 
    WHEN rowsecurity = true THEN '✅ RLS Enabled'
    ELSE '❌ RLS Disabled'
  END as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'cirrus';

-- Step 4: Check if there are any restrictive policies that might override
-- Look for policies with restrictive qualifiers
SELECT 
  'Policy Details' as check_type,
  policyname,
  cmd,
  roles,
  CASE 
    WHEN qual IS NULL OR qual = '' THEN '⚠️ No USING clause'
    ELSE '✅ Has USING clause'
  END as has_using_clause,
  CASE
    WHEN permissive = false THEN '⚠️ RESTRICTIVE (blocks if matches)'
    ELSE '✅ PERMISSIVE (allows if matches)'
  END as policy_type
FROM pg_policies
WHERE tablename = 'cirrus'
ORDER BY cmd, policyname;

-- Step 5: Check if the has_role function is working correctly
-- Test with a known user (replace with actual user ID from browser)
-- First, let's see what users exist and their roles
SELECT 
  'User Roles Check' as check_type,
  ur.user_id,
  ur.role,
  p.email,
  p.name
FROM public.user_roles ur
LEFT JOIN public.profiles p ON p.id = ur.user_id
ORDER BY ur.role, p.name;

-- Step 6: Check machine ownership
SELECT 
  'Machine Ownership' as check_type,
  m.id as machine_id,
  m.name,
  m.owner_id,
  p.email as owner_email,
  p.name as owner_name,
  (SELECT role FROM public.user_roles WHERE user_id = m.owner_id LIMIT 1) as owner_role
FROM public.machines m
LEFT JOIN public.profiles p ON p.id = m.owner_id
WHERE m.type = 'evaporative';

-- Step 7: Test the policy logic manually (replace USER_ID with actual user ID from browser)
-- This simulates what the RLS policy should do
-- You'll need to replace 'YOUR_USER_ID_HERE' with the actual user ID from browser console
-- To find your user ID: Check browser console for "Loading/initializing profile for user: <ID>"
SELECT 
  'Manual Policy Test' as check_type,
  'Replace YOUR_USER_ID_HERE with your actual user ID from browser console' as instruction,
  'Check browser console for: Loading/initializing profile for user: <ID>' as how_to_find;

-- Once you have your user ID, run this (replace YOUR_USER_ID_HERE):
/*
SELECT 
  'Policy Logic Test' as check_type,
  m.id as machine_id,
  m.name,
  m.owner_id,
  CASE 
    WHEN public.has_role('YOUR_USER_ID_HERE'::uuid, 'super_admin'::public.app_role) THEN '✅ Super Admin Access'
    WHEN m.owner_id = 'YOUR_USER_ID_HERE'::uuid THEN '✅ Owner Access'
    WHEN (public.has_role('YOUR_USER_ID_HERE'::uuid, 'installer'::public.app_role) AND (
      m.owner_id = 'YOUR_USER_ID_HERE'::uuid 
      OR m.owner_id IN (
        SELECT client_id FROM public.client_admin_assignments WHERE admin_id = 'YOUR_USER_ID_HERE'::uuid
      )
    )) THEN '✅ Installer Access'
    WHEN (public.has_role('YOUR_USER_ID_HERE'::uuid, 'company'::public.app_role) AND (
      m.owner_id = 'YOUR_USER_ID_HERE'::uuid
      OR m.owner_id IN (
        SELECT installer_id FROM public.installer_company_assignments WHERE company_id = 'YOUR_USER_ID_HERE'::uuid
      )
      OR m.owner_id IN (
        SELECT client_id FROM public.client_admin_assignments 
        WHERE admin_id IN (
          SELECT installer_id FROM public.installer_company_assignments WHERE company_id = 'YOUR_USER_ID_HERE'::uuid
        )
      )
    )) THEN '✅ Company Access'
    ELSE '❌ No Access'
  END as access_result
FROM public.machines m
WHERE m.id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42';
*/

-- Step 8: Check if there's a schema or search_path issue
SELECT 
  'Schema Check' as check_type,
  current_schema() as current_schema,
  current_setting('search_path') as search_path;

-- Step 9: Verify the policy was created in the correct schema
SELECT 
  'Policy Schema Check' as check_type,
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE tablename = 'cirrus'
ORDER BY policyname;

