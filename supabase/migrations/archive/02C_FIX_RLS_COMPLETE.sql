-- Complete RLS Fix - This should definitely work
-- Drops everything and recreates with proper permissions

-- Step 1: Check current state
SELECT 
  'Current Policies' as step,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'cirrus'
ORDER BY policyname;

-- Step 2: Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view CIRRUS data for accessible machines" ON public.cirrus;
DROP POLICY IF EXISTS "Service role can insert CIRRUS data" ON public.cirrus;
DROP POLICY IF EXISTS "Service role can update CIRRUS data" ON public.cirrus;

-- Step 3: Verify RLS is enabled (should be true)
SELECT 
  'RLS Status' as step,
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'cirrus';

-- Step 4: Create SELECT policy for authenticated users
-- This matches the machines table policy exactly
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

-- Step 5: Create INSERT policy for service role (for triggers)
CREATE POLICY "Service role can insert CIRRUS data"
  ON public.cirrus
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Step 6: Create UPDATE policy for service role
CREATE POLICY "Service role can update CIRRUS data"
  ON public.cirrus
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Step 7: Verify new policies
SELECT 
  'New Policies' as step,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'cirrus'
ORDER BY policyname;

-- Step 8: Test query (run this as your logged-in user)
-- This should return a count, not an error
SELECT 
  'Test Query' as step,
  COUNT(*) as accessible_records
FROM public.cirrus c
JOIN public.machines m ON m.id = c.machine_id
WHERE m.owner_id = auth.uid()
   OR public.has_role(auth.uid(), 'super_admin'::public.app_role);

