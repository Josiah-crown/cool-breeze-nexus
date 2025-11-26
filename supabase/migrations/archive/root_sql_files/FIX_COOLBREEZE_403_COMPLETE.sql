-- FIX: CoolBreeze 403 Error - COMPLETE FIX
-- This version uses the EXACT working pattern from cirrus table
-- The issue is likely that the policy needs to be recreated fresh

-- Step 1: Drop ALL existing policies on coolbreeze (clean slate)
DROP POLICY IF EXISTS "Users can view CoolBreeze data for accessible machines" ON public.coolbreeze;
DROP POLICY IF EXISTS "Super admins can view all CoolBreeze data" ON public.coolbreeze;
DROP POLICY IF EXISTS "Users can view their own CoolBreeze data" ON public.coolbreeze;
DROP POLICY IF EXISTS "Installers can view their CoolBreeze data" ON public.coolbreeze;
DROP POLICY IF EXISTS "Companies can view their CoolBreeze data" ON public.coolbreeze;
DROP POLICY IF EXISTS "TEST: All authenticated users can view CoolBreeze data" ON public.coolbreeze;

-- Step 2: Verify RLS is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'coolbreeze' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.coolbreeze ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Step 3: Create the SELECT policy using EXACT pattern from cirrus table (which works)
-- This is copied directly from the working cirrus table migration
CREATE POLICY "Users can view CoolBreeze data for accessible machines"
  ON public.coolbreeze
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = coolbreeze.machine_id
      AND (
        -- Super admin sees all (EXACT copy from cirrus)
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'super_admin'
        )
        OR
        -- Machine owner (EXACT copy from cirrus)
        m.owner_id = auth.uid()
        OR
        -- Company sees their machines and installer/client machines (EXACT copy from cirrus)
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.installer_company_assignments ica ON ica.installer_id = m.owner_id
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'company'
          AND ica.company_id = ur.user_id
        )
        OR
        -- Installer sees their machines and client machines (EXACT copy from cirrus)
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

-- Step 4: Verify the policy was created
SELECT 
  '✅ Policy Verification' as check_type,
  tablename,
  policyname,
  cmd,
  permissive,
  roles
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'coolbreeze'
ORDER BY cmd, policyname;

-- Step 5: Test query (uncomment and replace YOUR_USER_ID to test)
-- This should return rows if you're a super_admin or own machines
-- SELECT COUNT(*) as coolbreeze_count FROM public.coolbreeze;

-- IMPORTANT: After running this:
-- 1. Do a HARD REFRESH in browser (Ctrl+Shift+R or Cmd+Shift+R)
-- 2. Clear browser cache if needed
-- 3. Check browser console - 403 error should be gone
-- 4. If still getting 403, check:
--    - Are you logged in?
--    - What's your user role? (should be super_admin)
--    - Check Supabase logs for detailed error

