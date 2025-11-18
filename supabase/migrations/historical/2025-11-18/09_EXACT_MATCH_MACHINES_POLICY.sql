-- Exact Match to Machines Table Policy
-- The machines table policy uses: public.has_role(auth.uid(), 'super_admin')
-- WITHOUT the ::public.app_role cast
-- Let's match it EXACTLY

-- Step 1: Drop ALL existing SELECT policies
DROP POLICY IF EXISTS "Users can view CIRRUS data for accessible machines" ON public.cirrus;
DROP POLICY IF EXISTS "Super admins can view all CIRRUS data" ON public.cirrus;
DROP POLICY IF EXISTS "Users can view their own CIRRUS data" ON public.cirrus;
DROP POLICY IF EXISTS "Installers can view their CIRRUS data" ON public.cirrus;
DROP POLICY IF EXISTS "Companies can view their CIRRUS data" ON public.cirrus;

-- Step 2: Create policies matching machines table EXACTLY (no enum cast)
-- Policy 1: Super admins (matches machines table line 191 EXACTLY)
CREATE POLICY "Super admins can view all CIRRUS data"
  ON public.cirrus
  FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Policy 2: Machine owners (matches machines table line 187 EXACTLY)
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

-- Step 3: Verify policies
SELECT 
  'Policies Created' as status,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'cirrus' AND cmd = 'SELECT'
ORDER BY policyname;

-- IMPORTANT: 
-- 1. Do a HARD REFRESH in browser (Ctrl+Shift+R)
-- 2. Clear browser cache if needed
-- 3. Check Supabase logs if still getting 403
-- 4. The key difference: NO enum cast, matches machines table exactly

