-- Simplified RLS Fix - Alternative approach
-- This uses a simpler policy that should definitely work

-- First, drop ALL existing policies on cirrus table
DROP POLICY IF EXISTS "Users can view CIRRUS data for accessible machines" ON public.cirrus;
DROP POLICY IF EXISTS "Service role can insert CIRRUS data" ON public.cirrus;
DROP POLICY IF EXISTS "Service role can update CIRRUS data" ON public.cirrus;

-- Re-create the SELECT policy using has_role() function (same as machines table)
-- This uses the SECURITY DEFINER function which has proper permissions
CREATE POLICY "Users can view CIRRUS data for accessible machines"
  ON public.cirrus
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = cirrus.machine_id
      AND (
        -- Super admin sees all (uses has_role function like machines table)
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

-- Re-create INSERT policy for service role
CREATE POLICY "Service role can insert CIRRUS data"
  ON public.cirrus
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Re-create UPDATE policy for service role
CREATE POLICY "Service role can update CIRRUS data"
  ON public.cirrus
  FOR UPDATE
  TO service_role
  USING (true);

-- Verify policies
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'cirrus'
ORDER BY policyname;

