-- Emergency RLS Fix - Try a simpler approach
-- Sometimes the complex EXISTS subquery causes issues with Supabase REST API

-- Step 1: Drop the existing policy
DROP POLICY IF EXISTS "Users can view CIRRUS data for accessible machines" ON public.cirrus;

-- Step 2: Create a simpler policy that directly checks access
-- This matches the machines table policy structure exactly
CREATE POLICY "Users can view CIRRUS data for accessible machines"
  ON public.cirrus
  FOR SELECT
  TO authenticated
  USING (
    -- Super admin sees all
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR
    -- Machine owner
    EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = cirrus.machine_id
      AND m.owner_id = auth.uid()
    )
    OR
    -- Installer sees their machines and client machines
    (public.has_role(auth.uid(), 'installer'::public.app_role) AND EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = cirrus.machine_id
      AND (
        m.owner_id = auth.uid() 
        OR m.owner_id IN (
          SELECT client_id FROM public.client_admin_assignments WHERE admin_id = auth.uid()
        )
      )
    ))
    OR
    -- Company sees their machines and installer/client machines
    (public.has_role(auth.uid(), 'company'::public.app_role) AND EXISTS (
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
    ))
  );

-- Step 3: Verify
SELECT 
  'Policy Created' as status,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'cirrus' AND cmd = 'SELECT';

-- IMPORTANT: After running this, do a HARD REFRESH in your browser:
-- - Chrome/Edge: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
-- - This clears cached authentication tokens
-- - Then try accessing the machine again

