-- Verify and Fix Active Policies
-- Since manual test works but RLS doesn't, let's check what's actually active

-- Step 1: Check ALL policies on cirrus table
SELECT 
  'Current Policies' as check_type,
  policyname,
  cmd,
  roles,
  permissive,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'cirrus'
ORDER BY cmd, policyname;

-- Step 2: Check if there are any RESTRICTIVE policies (these would block access)
SELECT 
  'Restrictive Policies Check' as check_type,
  policyname,
  permissive,
  CASE 
    WHEN permissive = false THEN '⚠️ RESTRICTIVE - This blocks access!'
    ELSE '✅ PERMISSIVE - This allows access'
  END as policy_type
FROM pg_policies
WHERE tablename = 'cirrus';

-- Step 3: Drop ALL existing SELECT policies and recreate them
-- This ensures we start fresh
DROP POLICY IF EXISTS "Users can view CIRRUS data for accessible machines" ON public.cirrus;
DROP POLICY IF EXISTS "Super admins can view all CIRRUS data" ON public.cirrus;
DROP POLICY IF EXISTS "Users can view their own CIRRUS data" ON public.cirrus;
DROP POLICY IF EXISTS "Installers can view their CIRRUS data" ON public.cirrus;
DROP POLICY IF EXISTS "Companies can view their CIRRUS data" ON public.cirrus;

-- Step 4: Create policies matching machines table EXACTLY
-- Policy 1: Super admins (matches machines table policy exactly)
CREATE POLICY "Super admins can view all CIRRUS data"
  ON public.cirrus
  FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- Policy 2: Machine owners (matches machines table policy exactly)
CREATE POLICY "Users can view their own CIRRUS data"
  ON public.cirrus
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = cirrus.machine_id
      AND m.owner_id = auth.uid()
    )
  );

-- Step 5: Verify policies were created
SELECT 
  'Policies After Recreation' as check_type,
  policyname,
  cmd,
  roles,
  permissive
FROM pg_policies
WHERE tablename = 'cirrus' AND cmd = 'SELECT'
ORDER BY policyname;

-- Step 6: Test if we can query with explicit user context
-- This simulates what the frontend does
-- NOTE: This will return 0 in SQL Editor (auth.uid() is NULL), but that's expected
SELECT 
  'RLS Test with auth.uid()' as check_type,
  COUNT(*) as accessible_records
FROM public.cirrus c
WHERE EXISTS (
  SELECT 1 FROM public.machines m
  WHERE m.id = c.machine_id
  AND (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR m.owner_id = auth.uid()
  )
);

-- IMPORTANT NOTES:
-- 1. After running this, do a HARD REFRESH in browser (Ctrl+Shift+R)
-- 2. If still getting 403, check Supabase logs for RLS evaluation errors
-- 3. The policy structure now matches machines table exactly

