-- TEST: Simple CoolBreeze RLS Policy to Debug 403 Error
-- This creates a very simple policy to test if RLS is the issue

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view CoolBreeze data for accessible machines" ON public.coolbreeze;

-- Create SIMPLE test policy - Super admin can see all
-- If this works, we know RLS can work, and the issue is with the complex logic
CREATE POLICY "Users can view CoolBreeze data for accessible machines"
  ON public.coolbreeze
  FOR SELECT
  USING (
    -- Super admin sees all (simple check)
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'super_admin'
    )
    OR
    -- Machine owner (simple check)
    EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = coolbreeze.machine_id
      AND m.owner_id = auth.uid()
    )
  );

-- Verify
SELECT 
  '✅ Simple Test Policy Created' as status,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'coolbreeze'
AND cmd = 'SELECT';

-- IMPORTANT: After running this:
-- 1. Refresh your dev server (hard refresh: Ctrl+Shift+R)
-- 2. Check if 403 error is gone
-- 3. If it works, we'll add back the full logic
-- 4. If it still doesn't work, the issue is NOT with the policy logic

