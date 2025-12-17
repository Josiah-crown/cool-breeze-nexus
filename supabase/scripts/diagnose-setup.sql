-- ========================================
-- DIAGNOSE SETUP ISSUES
-- ========================================

-- 1. Check all users in auth.users
SELECT id, email, created_at FROM auth.users ORDER BY created_at;

-- 2. Check all profiles
SELECT id, name, email FROM public.profiles;

-- 3. Check all user_roles
SELECT ur.user_id, ur.role, u.email 
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id;

-- 4. Check all machines
SELECT id, name, type, manufacturer, owner_id, location FROM public.machines;

-- 5. Check all api_keys
SELECT id, key, machine_id, is_active FROM public.api_keys;

-- 6. Check if emails match (case sensitive!)
SELECT 
  email,
  CASE WHEN email = 'Superadmin@IOTnexus.site' THEN '✅ Match' ELSE '❌ No match' END as superadmin_check,
  CASE WHEN email = 'headoffice@crowntechnologies.co.za' THEN '✅ Match' ELSE '❌ No match' END as company_check,
  CASE WHEN email = 'Blessing@crowntechnologies.co.za' THEN '✅ Match' ELSE '❌ No match' END as installer_check,
  CASE WHEN email = 'Neil@crowntechnologies.co.za' THEN '✅ Match' ELSE '❌ No match' END as client_check
FROM auth.users;


