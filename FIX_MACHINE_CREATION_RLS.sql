-- FIX: Machine Creation RLS Issue
-- Problem: Trigger creates notification preferences but RLS blocks it
-- Solution: Allow users to insert notification preferences for machines they own/create

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Service role can insert notification preferences" ON public.machine_notification_preferences;

-- New policy: Allow users to insert notification preferences for machines they own
CREATE POLICY "Users can insert notification preferences for their machines"
  ON public.machine_notification_preferences
  FOR INSERT
  WITH CHECK (
    -- User owns the machine
    EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = machine_notification_preferences.machine_id
      AND m.owner_id = auth.uid()
    )
    OR
    -- User is creating preferences for themselves
    user_id = auth.uid()
    OR
    -- Super admin can create for any machine
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'super_admin'
    )
    OR
    -- Service role (for triggers that run with SECURITY DEFINER)
    auth.role() = 'service_role'
  );

-- Also allow service role explicitly (for triggers)
CREATE POLICY "Service role can insert notification preferences"
  ON public.machine_notification_preferences
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

