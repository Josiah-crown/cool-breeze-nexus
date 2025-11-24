-- FIX: CoolBreeze RLS Policy - Final Fix
-- Problem: 403 Forbidden when accessing coolbreeze table
-- This will recreate the policy with proper access for all roles

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view CoolBreeze data for accessible machines" ON public.coolbreeze;

-- Create new SELECT policy with comprehensive access control
CREATE POLICY "Users can view CoolBreeze data for accessible machines"
  ON public.coolbreeze
  FOR SELECT
  USING (
    -- Super admin sees all
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'super_admin'
    )
    OR
    -- Machine owner sees their machines
    EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = coolbreeze.machine_id
      AND m.owner_id = auth.uid()
    )
    OR
    -- Company sees machines owned by their installers or clients
    EXISTS (
      SELECT 1 
      FROM public.machines m
      JOIN public.user_roles ur ON ur.user_id = auth.uid()
      LEFT JOIN public.installer_company_assignments ica ON ica.installer_id = m.owner_id
      LEFT JOIN public.client_admin_assignments caa ON caa.client_id = m.owner_id
      WHERE m.id = coolbreeze.machine_id
      AND ur.role = 'company'
      AND (
        ica.company_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.installer_company_assignments ica2
          WHERE ica2.installer_id = caa.admin_id
          AND ica2.company_id = auth.uid()
        )
      )
    )
    OR
    -- Installer sees machines they own or their clients own
    EXISTS (
      SELECT 1 
      FROM public.machines m
      JOIN public.user_roles ur ON ur.user_id = auth.uid()
      LEFT JOIN public.client_admin_assignments caa ON caa.client_id = m.owner_id
      WHERE m.id = coolbreeze.machine_id
      AND ur.role = 'installer'
      AND (
        m.owner_id = auth.uid()
        OR caa.admin_id = auth.uid()
      )
    )
    OR
    -- Client sees their own machines
    EXISTS (
      SELECT 1 
      FROM public.machines m
      JOIN public.user_roles ur ON ur.user_id = auth.uid()
      WHERE m.id = coolbreeze.machine_id
      AND ur.role = 'client'
      AND m.owner_id = auth.uid()
    )
  );

-- Verify the policy was created
SELECT 
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN '✅ SELECT Policy'
    WHEN cmd = 'INSERT' THEN '✅ INSERT Policy'
    WHEN cmd = 'UPDATE' THEN '✅ UPDATE Policy'
    ELSE cmd
  END as policy_type
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'coolbreeze'
ORDER BY cmd, policyname;

