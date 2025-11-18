-- Match Machines Table Policy Structure Exactly
-- The machines table uses SEPARATE policies, not one combined policy
-- Let's try the same approach for cirrus

-- Step 1: Drop the existing combined policy
DROP POLICY IF EXISTS "Users can view CIRRUS data for accessible machines" ON public.cirrus;

-- Step 2: Create separate policies matching the machines table structure
-- Policy 1: Super admins can view all
CREATE POLICY "Super admins can view all CIRRUS data"
  ON public.cirrus
  FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- Policy 2: Users can view their own machines' data
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

-- Policy 3: Installers can view their machines and client machines
CREATE POLICY "Installers can view their CIRRUS data"
  ON public.cirrus
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'installer'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = cirrus.machine_id
      AND (
        m.owner_id = auth.uid() 
        OR m.owner_id IN (
          SELECT client_id FROM public.client_admin_assignments WHERE admin_id = auth.uid()
        )
      )
    )
  );

-- Policy 4: Companies can view their machines and installer/client machines
CREATE POLICY "Companies can view their CIRRUS data"
  ON public.cirrus
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'company'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = cirrus.machine_id
      AND (
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
      )
    )
  );

-- Step 3: Verify all policies
SELECT 
  'Policies Created' as status,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'cirrus' AND cmd = 'SELECT'
ORDER BY policyname;

-- IMPORTANT: After running this, do a HARD REFRESH in your browser:
-- - Chrome/Edge: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
-- - This clears cached authentication tokens
-- - Then try accessing the machine again

