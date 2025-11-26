-- Use Original Migration Policy Structure
-- The original migration (20250108000000_create_cirrus_table.sql) uses direct role checks
-- NOT the has_role() function. Let's try that approach.

-- Step 1: Drop ALL existing SELECT policies
DROP POLICY IF EXISTS "Users can view CIRRUS data for accessible machines" ON public.cirrus;
DROP POLICY IF EXISTS "Super admins can view all CIRRUS data" ON public.cirrus;
DROP POLICY IF EXISTS "Users can view their own CIRRUS data" ON public.cirrus;
DROP POLICY IF EXISTS "Installers can view their CIRRUS data" ON public.cirrus;
DROP POLICY IF EXISTS "Companies can view their CIRRUS data" ON public.cirrus;
DROP POLICY IF EXISTS "TEST: All authenticated users can view CIRRUS data" ON public.cirrus;

-- Step 2: Recreate the policy from the original migration (line 77-114)
-- This uses direct role checks instead of has_role() function
CREATE POLICY "Users can view CIRRUS data for accessible machines"
  ON public.cirrus
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = cirrus.machine_id
      AND (
        -- Super admin sees all (direct role check, not has_role function)
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'super_admin'::public.app_role
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
          AND ur.role = 'company'::public.app_role
          AND ica.company_id = ur.user_id
        )
        OR
        -- Installer sees their machines and client machines
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          LEFT JOIN public.client_admin_assignments caa ON caa.client_id = m.owner_id
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'installer'::public.app_role
          AND (m.owner_id = ur.user_id OR caa.admin_id = ur.user_id)
        )
      )
    )
  );

-- Step 3: Verify
SELECT 
  'Policy Created (Original Migration Style)' as status,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'cirrus' AND cmd = 'SELECT'
ORDER BY policyname;

-- IMPORTANT: 
-- This uses the EXACT structure from the original migration
-- It uses direct role checks instead of has_role() function
-- After running, do a HARD REFRESH (Ctrl+Shift+R)

