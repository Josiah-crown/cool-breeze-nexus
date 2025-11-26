-- Diagnose RLS Issue
-- Run this to see what's happening with RLS

-- 1. Check if policy exists
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'cirrus'
ORDER BY policyname;

-- 2. Check current user and role
SELECT 
  auth.uid() as current_user_id,
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) as current_user_role;

-- 3. Check if user can see machines table (to verify auth works)
SELECT COUNT(*) as accessible_machines
FROM public.machines
WHERE owner_id = auth.uid()
   OR EXISTS (
     SELECT 1 FROM public.user_roles ur
     WHERE ur.user_id = auth.uid()
     AND ur.role = 'super_admin'::public.app_role
   );

-- 4. Test if we can see cirrus data directly (this will fail if RLS blocks)
SELECT COUNT(*) as accessible_cirrus_records
FROM public.cirrus c
JOIN public.machines m ON m.id = c.machine_id
WHERE m.owner_id = auth.uid()
   OR EXISTS (
     SELECT 1 FROM public.user_roles ur
     WHERE ur.user_id = auth.uid()
     AND ur.role = 'super_admin'::public.app_role
   );

-- 5. Check what roles exist for current user
SELECT 
  user_id,
  role,
  role::text as role_text
FROM public.user_roles
WHERE user_id = auth.uid();

