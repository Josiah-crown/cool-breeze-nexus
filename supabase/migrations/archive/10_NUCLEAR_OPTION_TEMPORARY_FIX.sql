-- Nuclear Option: Temporary Fix to Test
-- This will allow ALL authenticated users to read cirrus data
-- ONLY USE FOR TESTING - NOT FOR PRODUCTION!
-- Once we confirm this works, we'll add proper restrictions back

-- Step 1: Drop ALL existing SELECT policies
DROP POLICY IF EXISTS "Users can view CIRRUS data for accessible machines" ON public.cirrus;
DROP POLICY IF EXISTS "Super admins can view all CIRRUS data" ON public.cirrus;
DROP POLICY IF EXISTS "Users can view their own CIRRUS data" ON public.cirrus;
DROP POLICY IF EXISTS "Installers can view their CIRRUS data" ON public.cirrus;
DROP POLICY IF EXISTS "Companies can view their CIRRUS data" ON public.cirrus;

-- Step 2: Create a VERY permissive policy for testing
-- This allows ANY authenticated user to read ANY cirrus data
-- WARNING: This is NOT secure - only for testing!
CREATE POLICY "TEST: All authenticated users can view CIRRUS data"
  ON public.cirrus
  FOR SELECT
  TO authenticated
  USING (true);

-- Step 3: Verify
SELECT 
  'Test Policy Created' as status,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'cirrus' AND cmd = 'SELECT'
ORDER BY policyname;

-- IMPORTANT: 
-- 1. Test in browser - if this works, the issue is with the policy logic
-- 2. If this STILL doesn't work, the issue is NOT with RLS policies
-- 3. After testing, we'll replace this with proper policies
-- 4. Do a HARD REFRESH (Ctrl+Shift+R) after running this

