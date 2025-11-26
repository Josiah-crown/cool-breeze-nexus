-- ============================================================
-- COMPREHENSIVE RLS FIX FOR ALL TABLES
-- This fixes all Supabase security warnings
-- ============================================================

-- 1. ENABLE RLS ON ALL TABLES
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installer_company_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_admin_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_alert_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.readings_raw ENABLE ROW LEVEL SECURITY;

-- 2. READINGS_RAW - CRITICAL FOR ESP32
-- ============================================================
-- ESP32 needs to INSERT, authenticated users need to SELECT

DROP POLICY IF EXISTS "ESP32 can insert readings" ON readings_raw;
DROP POLICY IF EXISTS "Users can view readings for their machines" ON readings_raw;

-- Allow ESP32 (anon key) to INSERT
CREATE POLICY "ESP32 can insert readings" 
ON readings_raw 
FOR INSERT 
TO anon 
WITH CHECK (true);

-- Allow authenticated users to SELECT readings for machines they have access to
CREATE POLICY "Users can view readings for their machines" 
ON readings_raw 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM machines m
    WHERE m.id = readings_raw.machine_id
  )
);

-- 3. MACHINES TABLE
-- ============================================================
-- Already has policies, just needs RLS enabled (done above)

-- 4. PROFILES TABLE
-- ============================================================

DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;

CREATE POLICY "Users can view their own profile" 
ON profiles 
FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON profiles 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

CREATE POLICY "Super admins can view all profiles" 
ON profiles 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'super_admin'
  )
);

-- 5. USER_ROLES TABLE
-- ============================================================

DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
DROP POLICY IF EXISTS "Super admins can view all roles" ON user_roles;

CREATE POLICY "Users can view their own role" 
ON user_roles 
FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "Super admins can view all roles" 
ON user_roles 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'super_admin'
  )
);

-- 6. MACHINE_NOTIFICATION_PREFERENCES
-- ============================================================

DROP POLICY IF EXISTS "Users can view preferences for their machines" ON machine_notification_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON machine_notification_preferences;

CREATE POLICY "Users can view preferences for their machines" 
ON machine_notification_preferences 
FOR SELECT 
TO authenticated 
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'super_admin'
  )
);

CREATE POLICY "Users can update their own preferences" 
ON machine_notification_preferences 
FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid());

-- 7. MACHINE_ALERT_CONFIG
-- ============================================================

DROP POLICY IF EXISTS "Users can view alert config for their machines" ON machine_alert_config;
DROP POLICY IF EXISTS "Machine owners can update alert config" ON machine_alert_config;

CREATE POLICY "Users can view alert config for their machines" 
ON machine_alert_config 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM machines m
    WHERE m.id = machine_alert_config.machine_id
  )
);

CREATE POLICY "Machine owners can update alert config" 
ON machine_alert_config 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM machines m
    WHERE m.id = machine_alert_config.machine_id
    AND m.owner_id = auth.uid()
  )
);

-- 8. ALERT_STATES
-- ============================================================

DROP POLICY IF EXISTS "Users can view alert states for their machines" ON alert_states;

CREATE POLICY "Users can view alert states for their machines" 
ON alert_states 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM machines m
    WHERE m.id = alert_states.machine_id
  )
);

-- 9. ALERT_HISTORY
-- ============================================================

DROP POLICY IF EXISTS "Users can view alert history for their machines" ON alert_history;

CREATE POLICY "Users can view alert history for their machines" 
ON alert_history 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM machines m
    WHERE m.id = alert_history.machine_id
  )
);

-- 10. FIX FUNCTION SEARCH PATHS (Security Warning)
-- ============================================================

ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_catalog;
ALTER FUNCTION public.create_machine_notification_preferences() SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_machine_notification_preferences_on_owner_change() SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_machine_notif_prefs_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.create_default_alert_config() SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_machine_from_reading() SET search_path = public, pg_catalog;

-- ============================================================
-- VERIFICATION
-- ============================================================

SELECT 
  schemaname, 
  tablename, 
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'profiles', 'user_roles', 'machines', 'api_keys', 
  'installer_company_assignments', 'client_admin_assignments',
  'machine_notification_preferences', 'machine_alert_config',
  'alert_states', 'alert_history', 'readings_raw'
)
ORDER BY tablename;

-- Show all policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;


