-- Quick check: What user are you logged in as in the browser?
-- This will help us understand why the policy isn't matching

-- Step 1: Find your user ID from browser console
-- In browser console, look for: "Loading/initializing profile for user: <ID>"
-- Or check the Network tab for any API call - your user ID will be in the JWT token

-- Step 2: Once you have your user ID, replace 'YOUR_USER_ID_HERE' below and run:

-- Check if you have super_admin role
SELECT 
  'User Role Check' as check_type,
  ur.user_id,
  ur.role,
  p.email,
  p.name,
  CASE 
    WHEN ur.role = 'super_admin' THEN '✅ Has super_admin role'
    ELSE '❌ Does NOT have super_admin role'
  END as role_status
FROM public.user_roles ur
LEFT JOIN public.profiles p ON p.id = ur.user_id
WHERE ur.user_id = 'feb424f4-dcd0-40c1-8165-ece8cc0acdca'  -- Replace with your actual user ID
ORDER BY ur.role;

-- Check if you own the machine
SELECT 
  'Machine Ownership Check' as check_type,
  m.id as machine_id,
  m.name,
  m.owner_id,
  CASE 
    WHEN m.owner_id = 'feb424f4-dcd0-40c1-8165-ece8cc0acdca' THEN '✅ You are the owner'
    ELSE '❌ You are NOT the owner'
  END as ownership_status,
  p.email as owner_email,
  p.name as owner_name
FROM public.machines m
LEFT JOIN public.profiles p ON p.id = m.owner_id
WHERE m.id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42';

-- Test has_role function directly
SELECT 
  'has_role Function Test' as check_type,
  public.has_role('feb424f4-dcd0-40c1-8165-ece8cc0acdca'::uuid, 'super_admin'::public.app_role) as is_super_admin,
  public.has_role('feb424f4-dcd0-40c1-8165-ece8cc0acdca'::uuid, 'installer'::public.app_role) as is_installer,
  public.has_role('feb424f4-dcd0-40c1-8165-ece8cc0acdca'::uuid, 'company'::public.app_role) as is_company;

-- Test the policy logic manually
SELECT 
  'Manual Policy Test' as check_type,
  c.id as cirrus_record_id,
  c.machine_id,
  CASE 
    WHEN public.has_role('feb424f4-dcd0-40c1-8165-ece8cc0acdca'::uuid, 'super_admin'::public.app_role) THEN '✅ Super Admin - Should have access'
    WHEN EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = c.machine_id
      AND m.owner_id = 'feb424f4-dcd0-40c1-8165-ece8cc0acdca'::uuid
    ) THEN '✅ Owner - Should have access'
    ELSE '❌ No access match'
  END as access_result
FROM public.cirrus c
WHERE c.machine_id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42'
LIMIT 5;

