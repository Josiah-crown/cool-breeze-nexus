-- FIX: CoolBreeze RLS Policy - FINAL WORKING VERSION
-- Problem: 403 Forbidden persists even though policy exists
-- Solution: Use EXACT same pattern as working cirrus table, but add client role check

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view CoolBreeze data for accessible machines" ON public.coolbreeze;

-- Create SELECT policy using EXACT pattern from cirrus table (which works)
-- This matches the working cirrus table policy structure exactly
CREATE POLICY "Users can view CoolBreeze data for accessible machines"
  ON public.coolbreeze
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = coolbreeze.machine_id
      AND (
        -- Super admin sees all (same as cirrus)
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'super_admin'
        )
        OR
        -- Machine owner (same as cirrus)
        m.owner_id = auth.uid()
        OR
        -- Company sees their machines and installer/client machines (same as cirrus)
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.installer_company_assignments ica ON ica.installer_id = m.owner_id
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'company'
          AND ica.company_id = ur.user_id
        )
        OR
        -- Installer sees their machines and client machines (same as cirrus)
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          LEFT JOIN public.client_admin_assignments caa ON caa.client_id = m.owner_id
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'installer'
          AND (m.owner_id = ur.user_id OR caa.admin_id = ur.user_id)
        )
        OR
        -- Client sees their own machines (ADDED - was missing in original)
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'client'
          AND m.owner_id = auth.uid()
        )
      )
    )
  );

-- Verify the policy was created
SELECT 
  '✅ Policy Created' as status,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'coolbreeze'
AND cmd = 'SELECT'
ORDER BY policyname;

