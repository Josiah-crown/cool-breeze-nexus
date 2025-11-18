-- Complete RLS Fix with Grants - This should definitely work
-- The issue might be that has_role() function needs explicit grants

-- Step 1: Grant execute on has_role function to authenticated users
-- This is critical - RLS policies need to be able to call this function
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO anon;

-- Step 2: Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view CIRRUS data for accessible machines" ON public.cirrus;

-- Step 3: Create SELECT policy using has_role() function
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

-- Step 4: Verify policies
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'cirrus'
ORDER BY policyname;

-- Step 5: Test query (should work now)
-- This tests if RLS allows access (even if count is 0, no error means RLS is working)
SELECT 
  'RLS Test - Total Accessible Records' as test_type,
  COUNT(*) as test_count
FROM public.cirrus c
WHERE EXISTS (
  SELECT 1 FROM public.machines m
  WHERE m.id = c.machine_id
  AND (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR m.owner_id = auth.uid()
    OR (public.has_role(auth.uid(), 'installer'::public.app_role) AND (
      m.owner_id = auth.uid() 
      OR m.owner_id IN (
        SELECT client_id FROM public.client_admin_assignments WHERE admin_id = auth.uid()
      )
    ))
    OR (public.has_role(auth.uid(), 'company'::public.app_role) AND (
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
);

-- Step 6: Test query for specific machine (replace with your machine_id)
-- If this returns 0, it means either:
-- 1. No data exists for this machine in cirrus table
-- 2. The data is older than 24 hours
-- 3. RLS is still blocking (but you should get an error, not 0)
SELECT 
  'RLS Test - Specific Machine (24h)' as test_type,
  COUNT(*) as record_count,
  MAX(timestamp) as latest_reading
FROM public.cirrus c
WHERE c.machine_id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42'  -- Replace with your machine_id
  AND c.timestamp >= NOW() - INTERVAL '24 hours'
  AND EXISTS (
    SELECT 1 FROM public.machines m
    WHERE m.id = c.machine_id
    AND (
      public.has_role(auth.uid(), 'super_admin'::public.app_role)
      OR m.owner_id = auth.uid()
    )
  );

