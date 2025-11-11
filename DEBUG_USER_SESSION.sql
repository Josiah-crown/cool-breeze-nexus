-- ========================================
-- DEEP DEBUG - Check everything about headoffice user
-- ========================================

-- 1. Check auth.users
SELECT 
  '1. AUTH USER:' as check_step,
  id,
  email,
  created_at
FROM auth.users 
WHERE email = 'headoffice@crowntechnologies.co.za';

-- 2. Check profiles
SELECT 
  '2. PROFILE:' as check_step,
  id,
  name,
  email
FROM public.profiles 
WHERE email = 'headoffice@crowntechnologies.co.za';

-- 3. Check ALL roles for this user
SELECT 
  '3. ALL ROLES (should be only 1):' as check_step,
  ur.id as role_record_id,
  ur.user_id,
  ur.role,
  ur.created_at,
  ur.created_by
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email = 'headoffice@crowntechnologies.co.za'
ORDER BY ur.created_at DESC;

-- 4. Count total machines
SELECT 
  '4. TOTAL MACHINES:' as check_step,
  COUNT(*) as count
FROM public.machines;

-- 5. Check RLS policies on user_roles table
SELECT 
  '5. RLS POLICIES ON user_roles:' as check_step,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'user_roles';

