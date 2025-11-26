-- Add Missing RLS Policies
-- This migration enables RLS and adds proper policies for tables that currently use GRANT statements
-- Date: 2025-01-08

-- ========================================
-- 1. MACHINE_ALERT_CONFIG
-- ========================================

-- Enable RLS
ALTER TABLE public.machine_alert_config ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view alert config for accessible machines" ON public.machine_alert_config;
DROP POLICY IF EXISTS "Users can update alert config for their machines" ON public.machine_alert_config;
DROP POLICY IF EXISTS "Service role can insert alert config" ON public.machine_alert_config;

-- Policy: Users can view alert config for machines they own or have access to
CREATE POLICY "Users can view alert config for accessible machines"
  ON public.machine_alert_config
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = machine_alert_config.machine_id
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

-- Policy: Users can update alert config for machines they own
CREATE POLICY "Users can update alert config for their machines"
  ON public.machine_alert_config
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = machine_alert_config.machine_id
      AND (
        m.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'super_admin'
        )
      )
    )
  );

-- Policy: Service role can insert (for triggers)
CREATE POLICY "Service role can insert alert config"
  ON public.machine_alert_config
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ========================================
-- 2. ALERT_STATES
-- ========================================

-- Enable RLS
ALTER TABLE public.alert_states ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view alert states for accessible machines" ON public.alert_states;
DROP POLICY IF EXISTS "Service role can manage alert states" ON public.alert_states;

-- Policy: Users can view alert states for machines they own or have access to
CREATE POLICY "Users can view alert states for accessible machines"
  ON public.alert_states
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = alert_states.machine_id
      AND (
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'super_admin'
        )
        OR
        m.owner_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.installer_company_assignments ica ON ica.installer_id = m.owner_id
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'company'
          AND ica.company_id = ur.user_id
        )
        OR
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

-- Policy: Service role can insert/update (for alert processing)
CREATE POLICY "Service role can manage alert states"
  ON public.alert_states
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ========================================
-- 3. ALERT_HISTORY
-- ========================================

-- Enable RLS
ALTER TABLE public.alert_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view alert history for accessible machines" ON public.alert_history;
DROP POLICY IF EXISTS "Service role can insert alert history" ON public.alert_history;

-- Policy: Users can view alert history for machines they own or have access to
CREATE POLICY "Users can view alert history for accessible machines"
  ON public.alert_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = alert_history.machine_id
      AND (
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'super_admin'
        )
        OR
        m.owner_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.installer_company_assignments ica ON ica.installer_id = m.owner_id
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'company'
          AND ica.company_id = ur.user_id
        )
        OR
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

-- Policy: Service role can insert (for alert logging)
CREATE POLICY "Service role can insert alert history"
  ON public.alert_history
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ========================================
-- 4. MACHINE_NOTIFICATION_PREFERENCES
-- ========================================

-- Enable RLS
ALTER TABLE public.machine_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own notification preferences" ON public.machine_notification_preferences;
DROP POLICY IF EXISTS "Users can update their own notification preferences" ON public.machine_notification_preferences;
DROP POLICY IF EXISTS "Service role can insert notification preferences" ON public.machine_notification_preferences;

-- Policy: Users can view their own notification preferences
CREATE POLICY "Users can view their own notification preferences"
  ON public.machine_notification_preferences
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = machine_notification_preferences.machine_id
      AND (
        m.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'super_admin'
        )
      )
    )
  );

-- Policy: Users can update their own preferences
CREATE POLICY "Users can update their own notification preferences"
  ON public.machine_notification_preferences
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: Service role can insert (for triggers)
CREATE POLICY "Service role can insert notification preferences"
  ON public.machine_notification_preferences
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ========================================
-- COMMENTS
-- ========================================

COMMENT ON POLICY "Users can view alert config for accessible machines" ON public.machine_alert_config IS 'Allows users to view alert configurations for machines they own or have access to';
COMMENT ON POLICY "Users can update alert config for their machines" ON public.machine_alert_config IS 'Allows users to update alert configurations for their own machines';
COMMENT ON POLICY "Service role can insert alert config" ON public.machine_alert_config IS 'Allows service role (triggers) to create default alert configs';

COMMENT ON POLICY "Users can view alert states for accessible machines" ON public.alert_states IS 'Allows users to view active alert states for machines they own or have access to';
COMMENT ON POLICY "Service role can manage alert states" ON public.alert_states IS 'Allows service role to manage alert states (for alert processing)';

COMMENT ON POLICY "Users can view alert history for accessible machines" ON public.alert_history IS 'Allows users to view alert history for machines they own or have access to';
COMMENT ON POLICY "Service role can insert alert history" ON public.alert_history IS 'Allows service role to log alert history';

COMMENT ON POLICY "Users can view their own notification preferences" ON public.machine_notification_preferences IS 'Allows users to view their own notification preferences';
COMMENT ON POLICY "Users can update their own notification preferences" ON public.machine_notification_preferences IS 'Allows users to update their own notification preferences';
COMMENT ON POLICY "Service role can insert notification preferences" ON public.machine_notification_preferences IS 'Allows service role (triggers) to create default notification preferences';

