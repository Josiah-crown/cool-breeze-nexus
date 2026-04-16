-- ========================================
-- FIX RLS POLICIES & ADD MISSING FUNCTIONS
-- ========================================

-- ========================================
-- 1. FIX PROFILES RLS - Super admin needs to see all
-- ========================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles 
  FOR SELECT USING (id = auth.uid());

-- Super admins can view ALL profiles (needed for dashboard hierarchy)
CREATE POLICY "Super admins can view all profiles" ON public.profiles 
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));

-- ========================================
-- 2. FIX USER_ROLES RLS - Super admin needs to see all
-- ========================================

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can view all roles" ON public.user_roles;

-- Users can view their own roles
CREATE POLICY "Users can view own roles" ON public.user_roles 
  FOR SELECT USING (user_id = auth.uid());

-- Super admins can view ALL roles (needed for dashboard hierarchy)
CREATE POLICY "Super admins can view all roles" ON public.user_roles 
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));

-- ========================================
-- 3. FIX INSTALLER/CLIENT ASSIGNMENTS RLS
-- ========================================

DROP POLICY IF EXISTS "Super admins can view all installer assignments" ON public.installer_company_assignments;
DROP POLICY IF EXISTS "Users can view own assignments" ON public.installer_company_assignments;

CREATE POLICY "Super admins can view all installer assignments" ON public.installer_company_assignments 
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view own installer assignments" ON public.installer_company_assignments 
  FOR SELECT USING (installer_id = auth.uid() OR company_id = auth.uid());

DROP POLICY IF EXISTS "Super admins can view all client assignments" ON public.client_admin_assignments;
DROP POLICY IF EXISTS "Users can view own client assignments" ON public.client_admin_assignments;

CREATE POLICY "Super admins can view all client assignments" ON public.client_admin_assignments 
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view own client assignments" ON public.client_admin_assignments 
  FOR SELECT USING (client_id = auth.uid() OR admin_id = auth.uid());

-- ========================================
-- 4. CREATE GET_HISTORICAL_DATA FUNCTION
-- ========================================

CREATE OR REPLACE FUNCTION public.get_historical_data(
  p_machine_id UUID,
  p_period TEXT DEFAULT '24h',
  p_table_name TEXT DEFAULT 'cirrus'
)
RETURNS TABLE (
  id UUID,
  machine_id UUID,
  "timestamp" TIMESTAMPTZ,
  motor_temp NUMERIC,
  ambient_temp NUMERIC,
  duct_temp NUMERIC,
  delta_t NUMERIC,
  "current" NUMERIC,
  voltage NUMERIC,
  power NUMERIC,
  fan_active BOOLEAN,
  pump_active BOOLEAN,
  is_cooling BOOLEAN,
  is_heating BOOLEAN,
  is_on BOOLEAN,
  has_water BOOLEAN,
  fan_speed INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_time TIMESTAMPTZ;
  v_interval TEXT;
BEGIN
  -- Calculate start time based on period
  CASE p_period
    WHEN '24h' THEN v_start_time := NOW() - INTERVAL '24 hours';
    WHEN '7d' THEN v_start_time := NOW() - INTERVAL '7 days';
    WHEN '30d' THEN v_start_time := NOW() - INTERVAL '30 days';
    WHEN '1y' THEN v_start_time := NOW() - INTERVAL '1 year';
    ELSE v_start_time := NOW() - INTERVAL '24 hours';
  END CASE;
  
  -- Query appropriate table based on p_table_name
  IF p_table_name = 'cirrus' THEN
    RETURN QUERY
    SELECT 
      c.id,
      c.machine_id,
      c.timestamp,
      c.motor_temp,
      c.ambient_temp,
      c.duct_temp,
      c.delta_t,
      c.current,
      c.voltage,
      c.power,
      c.fan_active,
      c.pump_active,
      c.is_cooling,
      FALSE as is_heating,  -- Cirrus doesn't heat
      c.is_on,
      c.has_water,
      c.fan_speed,
      c.created_at
    FROM public.cirrus c
    WHERE c.machine_id = p_machine_id
      AND c.timestamp >= v_start_time
    ORDER BY c.timestamp ASC
    LIMIT 10000;
    
  ELSIF p_table_name = 'coolbreeze' THEN
    RETURN QUERY
    SELECT 
      cb.id,
      cb.machine_id,
      cb.timestamp,
      cb.motor_temp,
      cb.ambient_temp,
      cb.duct_temp,
      cb.delta_t,
      cb.current,
      cb.voltage,
      cb.power,
      cb.fan_active,
      cb.pump_active,
      cb.is_cooling,
      FALSE as is_heating,  -- CoolBreeze doesn't heat
      cb.is_on,
      cb.has_water,
      cb.fan_speed,
      cb.created_at
    FROM public.coolbreeze cb
    WHERE cb.machine_id = p_machine_id
      AND cb.timestamp >= v_start_time
    ORDER BY cb.timestamp ASC
    LIMIT 10000;
    
  ELSIF p_table_name = 'alliance' THEN
    RETURN QUERY
    SELECT 
      a.id,
      a.machine_id,
      a.timestamp,
      a.motor_temp,
      a.ambient_temp,
      a.duct_temp,
      a.delta_t,
      a.current,
      a.voltage,
      a.power,
      a.fan_active,
      a.pump_active,
      FALSE as is_cooling,  -- Alliance heats, not cools
      a.is_heating,
      a.is_on,
      a.has_water,
      0 as fan_speed,  -- Alliance doesn't have fan_speed column
      a.created_at
    FROM public.alliance a
    WHERE a.machine_id = p_machine_id
      AND a.timestamp >= v_start_time
    ORDER BY a.timestamp ASC
    LIMIT 10000;
    
  ELSE
    RAISE EXCEPTION 'Unknown table: %', p_table_name;
  END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_historical_data(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_historical_data(UUID, TEXT, TEXT) TO anon;

-- ========================================
-- 5. VERIFY SUPER ADMIN ROLE EXISTS
-- ========================================

-- This is a diagnostic query - run manually to check if super admin exists
-- SELECT u.email, ur.role 
-- FROM auth.users u 
-- LEFT JOIN public.user_roles ur ON ur.user_id = u.id 
-- WHERE ur.role = 'super_admin' OR u.email LIKE '%headoffice%';

-- ========================================
-- DONE
-- ========================================
SELECT 'RLS policies fixed and get_historical_data function created' as status;

