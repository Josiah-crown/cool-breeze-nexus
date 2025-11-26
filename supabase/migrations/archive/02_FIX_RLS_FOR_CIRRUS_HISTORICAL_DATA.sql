-- Fix: RLS (Row Level Security) for cirrus table - Allow users to read historical data
-- This fixes the 403 Forbidden error when fetching historical data

-- Check current RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'cirrus'
ORDER BY policyname;

-- Drop existing SELECT policy if it's too restrictive
DROP POLICY IF EXISTS "Users can view CIRRUS data for accessible machines" ON public.cirrus;

-- Create a more permissive SELECT policy that allows authenticated users to read data
-- for machines they have access to (same logic as machines table)
-- Uses has_role() function (SECURITY DEFINER) like the machines table policies
CREATE POLICY "Users can view CIRRUS data for accessible machines"
  ON public.cirrus
  FOR SELECT
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

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'cirrus';

-- Test query (should work after this fix)
-- SELECT COUNT(*) FROM public.cirrus WHERE machine_id = 'YOUR_MACHINE_ID';

