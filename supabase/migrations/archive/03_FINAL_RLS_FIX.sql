-- Final RLS Fix - Comprehensive approach
-- This should definitely fix the 403 error

-- Step 1: Verify current state
SELECT 
  'Step 1: Current Policies' as step,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'cirrus'
ORDER BY policyname;

-- Step 2: Check if has_role function exists and has grants
SELECT 
  'Step 2: Function Grants' as step,
  p.proname as function_name,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'has_role';

-- Step 3: Grant execute on has_role function (do this even if already granted)
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO anon;

-- Step 4: Drop ALL existing SELECT policies on cirrus
DROP POLICY IF EXISTS "Users can view CIRRUS data for accessible machines" ON public.cirrus;
DROP POLICY IF EXISTS "Users can view their own CIRRUS data" ON public.cirrus;
DROP POLICY IF EXISTS "Super admins can view all CIRRUS data" ON public.cirrus;
DROP POLICY IF EXISTS "Installers can view their CIRRUS data" ON public.cirrus;
DROP POLICY IF EXISTS "Companies can view their CIRRUS data" ON public.cirrus;

-- Step 5: Create a single comprehensive SELECT policy
-- This policy matches the machines table RLS logic exactly
CREATE POLICY "Users can view CIRRUS data for accessible machines"
  ON public.cirrus
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = cirrus.machine_id
      AND (
        -- Super admin sees all
        public.has_role(auth.uid(), 'super_admin'::public.app_role)
        OR
        -- Machine owner
        m.owner_id = auth.uid()
        OR
        -- Installer sees their machines and client machines
        (public.has_role(auth.uid(), 'installer'::public.app_role) AND (
          m.owner_id = auth.uid() 
          OR m.owner_id IN (
            SELECT client_id FROM public.client_admin_assignments WHERE admin_id = auth.uid()
          )
        ))
        OR
        -- Company sees their machines and installer/client machines
        (public.has_role(auth.uid(), 'company'::public.app_role) AND (
          m.owner_id = auth.uid()
          OR m.owner_id IN (
            SELECT installer_id FROM public.installer_company_assignments WHERE company_id = auth.uid()
          )
          OR m.owner_id IN (
            SELECT client_id FROM public.client_admin_assignments 
            WHERE admin_id IN (
              SELECT installer_id FROM public.installer_company_assignments WHERE company_id = auth.uid()
            )
          )
        ))
      )
    )
  );

-- Step 6: Verify the new policy
SELECT 
  'Step 6: New Policy Created' as step,
  policyname,
  cmd,
  roles,
  CASE 
    WHEN roles::text LIKE '%authenticated%' THEN '✅ Has authenticated role'
    ELSE '❌ Missing authenticated role'
  END as role_check
FROM pg_policies
WHERE tablename = 'cirrus' AND cmd = 'SELECT'
ORDER BY policyname;

-- Step 7: Verify RLS is enabled
SELECT 
  'Step 7: RLS Status' as step,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'cirrus';

-- Step 8: Test the policy structure (this will return 0 in SQL Editor, but that's OK)
-- The real test is in the browser!
SELECT 
  'Step 8: Policy Test (SQL Editor - will be 0, that is OK!)' as step,
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

-- IMPORTANT: The above query will return 0 in SQL Editor because auth.uid() is NULL
-- This is EXPECTED and NORMAL!
-- The real test is in your browser - refresh the page and check the console.

