-- FIX: CoolBreeze RLS Policy - Debug Version
-- This version adds more detailed checks and uses a simpler approach

-- First, let's check what's currently there
SELECT 
  'Current Policies' as check_type,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'coolbreeze';

-- Drop ALL existing SELECT policies
DROP POLICY IF EXISTS "Users can view CoolBreeze data for accessible machines" ON public.coolbreeze;
DROP POLICY IF EXISTS "Super admins can view all CoolBreeze data" ON public.coolbreeze;
DROP POLICY IF EXISTS "Users can view their own CoolBreeze data" ON public.coolbreeze;
DROP POLICY IF EXISTS "Installers can view their CoolBreeze data" ON public.coolbreeze;
DROP POLICY IF EXISTS "Companies can view their CoolBreeze data" ON public.coolbreeze;

-- Create a simple policy that matches the cirrus table (which works)
-- This uses the EXACT same pattern as the working cirrus table
CREATE POLICY "Users can view CoolBreeze data for accessible machines"
  ON public.coolbreeze
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = coolbreeze.machine_id
      AND (
        -- Super admin sees all (same pattern as machines table)
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
        OR
        -- Client sees their own machines
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
  'Policy Created' as check_type,
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

-- Test query to see if it would work (replace YOUR_USER_ID with actual user ID)
-- SELECT COUNT(*) FROM public.coolbreeze;

