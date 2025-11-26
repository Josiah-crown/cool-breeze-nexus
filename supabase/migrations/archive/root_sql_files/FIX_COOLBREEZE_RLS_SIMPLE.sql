-- FIX: CoolBreeze RLS Policy - Mirrors Working Machines Table Policy
-- Problem: 403 Forbidden when accessing coolbreeze table
-- This uses the EXACT same pattern as machine_alert_config which is working

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view CoolBreeze data for accessible machines" ON public.coolbreeze;

-- Create SELECT policy matching the EXACT pattern from machine_alert_config (which works)
CREATE POLICY "Users can view CoolBreeze data for accessible machines"
  ON public.coolbreeze
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = coolbreeze.machine_id
      AND (
        -- Super admin sees all
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'super_admin'
        )
        OR
        -- Machine owner
        m.owner_id = auth.uid()
        OR
        -- Company sees their machines and installer/client machines
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.installer_company_assignments ica ON ica.installer_id = m.owner_id
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'company'
          AND ica.company_id = ur.user_id
        )
        OR
        -- Installer sees their machines and client machines
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          LEFT JOIN public.client_admin_assignments caa ON caa.client_id = m.owner_id
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'installer'
          AND (m.owner_id = ur.user_id OR caa.admin_id = ur.user_id)
        )
      )
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

