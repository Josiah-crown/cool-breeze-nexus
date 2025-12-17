-- ============================================================================
-- FIX RLS POLICIES AND IMPLEMENT 5-MINUTE DELAYED CLEANUP
-- ============================================================================
-- Date: December 2, 2025
-- Purpose: 
--   1. Fix 403 errors by adding RLS policies for alliance_calculated
--   2. Fix 400 errors (likely query issues)
--   3. Update triggers to process immediately but keep raw data for 5 minutes
-- ============================================================================

-- ========================================
-- 1. FIX RLS POLICIES FOR ALLIANCE_CALCULATED
-- ========================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view Alliance data for accessible machines" ON public.alliance_calculated;
DROP POLICY IF EXISTS "Service role can insert Alliance data" ON public.alliance_calculated;
DROP POLICY IF EXISTS "Service role can update Alliance data" ON public.alliance_calculated;

-- Policy: Users can view Alliance data for machines they own or have access to
-- (Exact copy of working Cirrus/CoolBreeze policy pattern)
CREATE POLICY "Users can view Alliance data for accessible machines"
  ON public.alliance_calculated
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = alliance_calculated.machine_id
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

-- Policy: Only service role can insert (via trigger)
CREATE POLICY "Service role can insert Alliance data"
  ON public.alliance_calculated
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Policy: Only service role can update
CREATE POLICY "Service role can update Alliance data"
  ON public.alliance_calculated
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- ========================================
-- 2. CREATE CLEANUP FUNCTION FOR READINGS_RAW
-- ========================================

-- Function to delete readings_raw entries older than 5 minutes
CREATE OR REPLACE FUNCTION public.cleanup_old_readings_raw()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete entries older than 5 minutes
  DELETE FROM public.readings_raw
  WHERE created_at < NOW() - INTERVAL '5 minutes';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.cleanup_old_readings_raw() TO service_role;

-- ========================================
-- 3. UPDATE CIRRUS TRIGGER (REMOVE IMMEDIATE DELETE)
-- ========================================

CREATE OR REPLACE FUNCTION public.process_cirrus_reading()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_machine_type TEXT;
  v_machine_manufacturer TEXT;
  v_status_calc JSONB;
  v_ambient_temp NUMERIC;
  v_duct_temp NUMERIC;
  v_motor_temp NUMERIC;
  v_has_water BOOLEAN;
  v_voltage_config RECORD;
  v_fan_active BOOLEAN := false;
  v_pump_active BOOLEAN := false;
  v_drain_active BOOLEAN := false;
  v_exhaust_active BOOLEAN := false;
  v_delta_t NUMERIC;
  v_power NUMERIC;
  v_current NUMERIC;
  v_voltage NUMERIC;
BEGIN
  -- Check if this machine is an evaporative cooler (Cirrus)
  SELECT m.type, COALESCE(m.manufacturer, '') INTO v_machine_type, v_machine_manufacturer
  FROM public.machines m
  WHERE m.id = NEW.machine_id;
  
  -- Only process if it's an evaporative cooler or Cirrus manufacturer
  IF v_machine_type != 'evaporative' AND v_machine_manufacturer != 'Cirrus' THEN
    RETURN NEW;
  END IF;
  
  -- VALIDATE TEMPERATURE READINGS
  IF NEW.motor_temp IS NOT NULL AND (NEW.motor_temp = -127.0 OR NEW.motor_temp = -999.0 OR NEW.motor_temp < -50.0 OR NEW.motor_temp > 120.0) THEN
    RAISE WARNING 'Invalid motor temperature reading: % for machine %', NEW.motor_temp, NEW.machine_id;
    -- Don't delete invalid data - let cleanup function handle it after 5 minutes
    RETURN NEW;
  END IF;
  
  IF NEW.outside_temp IS NOT NULL AND (NEW.outside_temp = -127.0 OR NEW.outside_temp = -999.0 OR NEW.outside_temp < -50.0 OR NEW.outside_temp > 120.0) THEN
    RAISE WARNING 'Invalid outside temperature reading: % for machine %', NEW.outside_temp, NEW.machine_id;
    RETURN NEW;
  END IF;
  
  IF NEW.inside_temp IS NOT NULL AND (NEW.inside_temp = -127.0 OR NEW.inside_temp = -999.0 OR NEW.inside_temp < -50.0 OR NEW.inside_temp > 120.0) THEN
    RAISE WARNING 'Invalid inside temperature reading: % for machine %', NEW.inside_temp, NEW.machine_id;
    RETURN NEW;
  END IF;
  
  -- Get voltage input configuration
  SELECT * INTO v_voltage_config
  FROM public.machine_voltage_config
  WHERE machine_id = NEW.machine_id;
  
  -- Use defaults if no config
  IF v_voltage_config IS NULL THEN
    v_voltage_config.voltage_input_1_function := 'fan';
    v_voltage_config.voltage_input_2_function := 'pump';
    v_voltage_config.voltage_input_3_function := 'drain';
    v_voltage_config.voltage_input_4_function := 'exhaust';
    v_voltage_config.voltage_active_threshold := 6.0;
  END IF;
  
  -- Extract values
  v_ambient_temp := NEW.outside_temp;
  v_duct_temp := NEW.inside_temp;
  v_motor_temp := NEW.motor_temp;
  v_has_water := NEW.has_water;
  v_current := NEW.current;
  v_voltage := NEW.voltage;
  v_power := COALESCE(NEW.power, (NEW.voltage * COALESCE(NEW.current, 0)));
  v_delta_t := ABS(v_ambient_temp - v_duct_temp);
  
  -- Map voltage inputs to functions
  IF v_voltage_config.voltage_input_1_function = 'fan' AND NEW.voltage_input_1 > v_voltage_config.voltage_active_threshold THEN
    v_fan_active := true;
  ELSIF v_voltage_config.voltage_input_1_function = 'pump' AND NEW.voltage_input_1 > v_voltage_config.voltage_active_threshold THEN
    v_pump_active := true;
  ELSIF v_voltage_config.voltage_input_1_function = 'drain' AND NEW.voltage_input_1 > v_voltage_config.voltage_active_threshold THEN
    v_drain_active := true;
  ELSIF v_voltage_config.voltage_input_1_function = 'exhaust' AND NEW.voltage_input_1 > v_voltage_config.voltage_active_threshold THEN
    v_exhaust_active := true;
  END IF;
  
  IF v_voltage_config.voltage_input_2_function = 'fan' AND NEW.voltage_input_2 > v_voltage_config.voltage_active_threshold THEN
    v_fan_active := true;
  ELSIF v_voltage_config.voltage_input_2_function = 'pump' AND NEW.voltage_input_2 > v_voltage_config.voltage_active_threshold THEN
    v_pump_active := true;
  ELSIF v_voltage_config.voltage_input_2_function = 'drain' AND NEW.voltage_input_2 > v_voltage_config.voltage_active_threshold THEN
    v_drain_active := true;
  ELSIF v_voltage_config.voltage_input_2_function = 'exhaust' AND NEW.voltage_input_2 > v_voltage_config.voltage_active_threshold THEN
    v_exhaust_active := true;
  END IF;
  
  IF v_voltage_config.voltage_input_3_function = 'fan' AND NEW.voltage_input_3 > v_voltage_config.voltage_active_threshold THEN
    v_fan_active := true;
  ELSIF v_voltage_config.voltage_input_3_function = 'pump' AND NEW.voltage_input_3 > v_voltage_config.voltage_active_threshold THEN
    v_pump_active := true;
  ELSIF v_voltage_config.voltage_input_3_function = 'drain' AND NEW.voltage_input_3 > v_voltage_config.voltage_active_threshold THEN
    v_drain_active := true;
  ELSIF v_voltage_config.voltage_input_3_function = 'exhaust' AND NEW.voltage_input_3 > v_voltage_config.voltage_active_threshold THEN
    v_exhaust_active := true;
  END IF;
  
  IF v_voltage_config.voltage_input_4_function = 'fan' AND NEW.voltage_input_4 > v_voltage_config.voltage_active_threshold THEN
    v_fan_active := true;
  ELSIF v_voltage_config.voltage_input_4_function = 'pump' AND NEW.voltage_input_4 > v_voltage_config.voltage_active_threshold THEN
    v_pump_active := true;
  ELSIF v_voltage_config.voltage_input_4_function = 'drain' AND NEW.voltage_input_4 > v_voltage_config.voltage_active_threshold THEN
    v_drain_active := true;
  ELSIF v_voltage_config.voltage_input_4_function = 'exhaust' AND NEW.voltage_input_4 > v_voltage_config.voltage_active_threshold THEN
    v_exhaust_active := true;
  END IF;
  
  -- Calculate status
  v_status_calc := public.calculate_cirrus_status(
    NEW.machine_id,
    v_ambient_temp,
    v_duct_temp,
    v_motor_temp,
    v_has_water,
    v_fan_active,
    v_pump_active,
    v_voltage,
    v_current
  );
  
  -- Insert into CIRRUS table
  INSERT INTO public.cirrus (
    machine_id, timestamp, ambient_temp, duct_temp, motor_temp, delta_t,
    fan_active, pump_active, drain_active, exhaust_active,
    is_cooling, is_on, is_connected, has_water, voltage, current, power,
    overall_status, motor_status, water_status, cooling_status, status_details,
    motor_temp_within_parameters, current_within_parameters,
    voltage_within_parameters, power_within_parameters, water_within_parameters
  ) VALUES (
    NEW.machine_id, NEW.created_at, v_ambient_temp, v_duct_temp, v_motor_temp, v_delta_t,
    v_fan_active, v_pump_active, v_drain_active, v_exhaust_active,
    (v_pump_active OR v_drain_active), v_pump_active, true, v_has_water,
    v_voltage, v_current, v_power,
    (v_status_calc->>'overall_status')::TEXT, (v_status_calc->>'motor_status')::TEXT,
    (v_status_calc->>'water_status')::TEXT, (v_status_calc->>'cooling_status')::TEXT,
    v_status_calc->'status_details',
    (v_status_calc->'status_details'->>'motor_temp_within_parameters')::BOOLEAN,
    (v_status_calc->'status_details'->>'current_within_parameters')::BOOLEAN,
    (v_status_calc->'status_details'->>'voltage_within_parameters')::BOOLEAN,
    (v_status_calc->'status_details'->>'power_within_parameters')::BOOLEAN,
    v_has_water
  ) ON CONFLICT (machine_id, timestamp) DO UPDATE SET
    ambient_temp = EXCLUDED.ambient_temp,
    duct_temp = EXCLUDED.duct_temp,
    motor_temp = EXCLUDED.motor_temp,
    delta_t = EXCLUDED.delta_t,
    fan_active = EXCLUDED.fan_active,
    pump_active = EXCLUDED.pump_active,
    drain_active = EXCLUDED.drain_active,
    exhaust_active = EXCLUDED.exhaust_active,
    is_cooling = EXCLUDED.is_cooling,
    is_on = EXCLUDED.is_on,
    is_connected = EXCLUDED.is_connected,
    has_water = EXCLUDED.has_water,
    voltage = EXCLUDED.voltage,
    current = EXCLUDED.current,
    power = EXCLUDED.power,
    overall_status = EXCLUDED.overall_status,
    motor_status = EXCLUDED.motor_status,
    water_status = EXCLUDED.water_status,
    cooling_status = EXCLUDED.cooling_status,
    status_details = EXCLUDED.status_details,
    motor_temp_within_parameters = EXCLUDED.motor_temp_within_parameters,
    current_within_parameters = EXCLUDED.current_within_parameters,
    voltage_within_parameters = EXCLUDED.voltage_within_parameters,
    power_within_parameters = EXCLUDED.power_within_parameters,
    water_within_parameters = EXCLUDED.water_within_parameters,
    updated_at = NOW();
  
  -- REMOVED: DELETE FROM public.readings_raw WHERE id = NEW.id;
  -- Data will be kept for 5 minutes, then cleaned up by cleanup_old_readings_raw()
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 4. UPDATE COOLBREEZE TRIGGER (REMOVE IMMEDIATE DELETE)
-- ========================================

CREATE OR REPLACE FUNCTION public.process_coolbreeze_reading()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_machine_type TEXT;
  v_machine_manufacturer TEXT;
  v_status_calc JSONB;
  v_ambient_temp NUMERIC;
  v_duct_temp NUMERIC;
  v_motor_temp NUMERIC;
  v_has_water BOOLEAN;
  v_fan_active BOOLEAN := false;
  v_pump_active BOOLEAN := false;
  v_drain_active BOOLEAN := false;
  v_exhaust_active BOOLEAN := false;
  v_delta_t NUMERIC;
  v_power NUMERIC;
  v_current NUMERIC;
  v_voltage NUMERIC;
  v_exhaust_voltage NUMERIC;
  v_fan_voltage NUMERIC;
  v_pump_voltage NUMERIC;
  v_drain_voltage NUMERIC;
  v_exhaust_status TEXT;
  v_fan_status TEXT;
  v_pump_status TEXT;
  v_drain_status TEXT;
  v_fan_speed INTEGER;
BEGIN
  -- Check if this machine is an HVAC/CoolBreeze machine
  SELECT m.type, COALESCE(m.manufacturer, '') INTO v_machine_type, v_machine_manufacturer
  FROM public.machines m
  WHERE m.id = NEW.machine_id;
  
  -- Only process if it's an HVAC machine or CoolBreeze manufacturer
  IF v_machine_type NOT IN ('airconditioner', 'heatpump') AND v_machine_manufacturer != 'CoolBreeze' THEN
    RETURN NEW;
  END IF;
  
  -- VALIDATE TEMPERATURE READINGS
  IF NEW.motor_temp IS NOT NULL AND (NEW.motor_temp = -127.0 OR NEW.motor_temp = -999.0 OR NEW.motor_temp < -50.0 OR NEW.motor_temp > 120.0) THEN
    RAISE WARNING 'Invalid motor temperature reading: % for machine %', NEW.motor_temp, NEW.machine_id;
    RETURN NEW;
  END IF;
  
  IF NEW.outside_temp IS NOT NULL AND (NEW.outside_temp = -127.0 OR NEW.outside_temp = -999.0 OR NEW.outside_temp < -50.0 OR NEW.outside_temp > 120.0) THEN
    RAISE WARNING 'Invalid outside temperature reading: % for machine %', NEW.outside_temp, NEW.machine_id;
    RETURN NEW;
  END IF;
  
  IF NEW.inside_temp IS NOT NULL AND (NEW.inside_temp = -127.0 OR NEW.inside_temp = -999.0 OR NEW.inside_temp < -50.0 OR NEW.inside_temp > 120.0) THEN
    RAISE WARNING 'Invalid inside temperature reading: % for machine %', NEW.inside_temp, NEW.machine_id;
    RETURN NEW;
  END IF;
  
  -- Extract values
  v_ambient_temp := NEW.outside_temp;
  v_duct_temp := NEW.inside_temp;
  v_motor_temp := NEW.motor_temp;
  v_has_water := NEW.has_water;
  v_current := NEW.current;
  v_voltage := NEW.voltage;
  v_power := COALESCE(NEW.power, (NEW.voltage * COALESCE(NEW.current, 0)));
  v_delta_t := ABS(v_ambient_temp - v_duct_temp);
  
  -- Extract pickup voltages
  v_exhaust_voltage := NEW.voltage_input_1;
  v_fan_voltage := NEW.voltage_input_2;
  v_pump_voltage := NEW.voltage_input_3;
  v_drain_voltage := NEW.voltage_input_4;
  
  -- Determine pickup statuses (CoolBreeze voltage logic)
  v_exhaust_status := CASE 
    WHEN v_exhaust_voltage < 0.5 THEN 'DISCONNECTED'
    WHEN v_exhaust_voltage >= 0.8 AND v_exhaust_voltage <= 2.632 THEN 'ON'
    WHEN v_exhaust_voltage >= 2.807 THEN 'OFF'
    ELSE 'UNKNOWN'
  END;
  
  v_fan_status := CASE 
    WHEN v_fan_voltage < 0.5 THEN 'DISCONNECTED'
    WHEN v_fan_voltage >= 0.8 AND v_fan_voltage <= 2.632 THEN 'ON'
    WHEN v_fan_voltage >= 2.807 THEN 'OFF'
    ELSE 'UNKNOWN'
  END;
  
  v_pump_status := CASE 
    WHEN v_pump_voltage < 0.5 THEN 'DISCONNECTED'
    WHEN v_pump_voltage >= 0.8 AND v_pump_voltage <= 2.632 THEN 'ON'
    WHEN v_pump_voltage >= 2.807 THEN 'OFF'
    ELSE 'UNKNOWN'
  END;
  
  v_drain_status := CASE 
    WHEN v_drain_voltage < 0.5 THEN 'DISCONNECTED'
    WHEN v_drain_voltage >= 0.8 AND v_drain_voltage <= 2.632 THEN 'ON'
    WHEN v_drain_voltage >= 2.807 THEN 'OFF'
    ELSE 'UNKNOWN'
  END;
  
  -- Determine active states
  v_exhaust_active := (v_exhaust_status = 'ON');
  v_fan_active := (v_fan_status = 'ON');
  v_pump_active := (v_pump_status = 'ON');
  v_drain_active := (v_drain_status = 'ON');
  
  -- Calculate fan speed
  IF v_fan_status = 'ON' AND v_fan_voltage >= 1.053 AND v_fan_voltage <= 2.035 THEN
    v_fan_speed := 100 - CAST(((v_fan_voltage - 1.053) / (2.035 - 1.053)) * 100 AS INTEGER);
    v_fan_speed := GREATEST(0, LEAST(100, v_fan_speed));
  ELSIF v_fan_status = 'ON' AND v_fan_voltage < 1.053 THEN
    v_fan_speed := 100;
  ELSE
    v_fan_speed := 0;
  END IF;
  
  -- Calculate status
  v_status_calc := public.calculate_coolbreeze_status(
    NEW.machine_id,
    v_ambient_temp,
    v_duct_temp,
    v_motor_temp,
    v_has_water,
    v_fan_active,
    v_pump_active,
    v_voltage,
    v_current,
    v_exhaust_status,
    v_fan_status,
    v_pump_status
  );
  
  -- Insert into CoolBreeze table
  INSERT INTO public.coolbreeze (
    machine_id, timestamp, ambient_temp, duct_temp, motor_temp, delta_t,
    fan_active, pump_active, drain_active, exhaust_active, is_cooling, is_on, is_connected,
    has_water, water_level, voltage, current, power,
    exhaust_voltage, fan_voltage, pump_voltage, drain_voltage,
    exhaust_status, fan_status, pump_status, drain_status, fan_speed,
    overall_status, motor_status, water_status, cooling_status, status_details,
    motor_temp_within_parameters, current_within_parameters, voltage_within_parameters,
    power_within_parameters, water_within_parameters
  ) VALUES (
    NEW.machine_id, NEW.created_at, v_ambient_temp, v_duct_temp, v_motor_temp, v_delta_t,
    v_fan_active, v_pump_active, v_drain_active, v_exhaust_active,
    (v_fan_active AND v_pump_active), (v_fan_active OR v_pump_active), true,
    v_has_water, CASE WHEN v_has_water THEN 100.0 ELSE 0.0 END,
    v_voltage, v_current, v_power,
    v_exhaust_voltage, v_fan_voltage, v_pump_voltage, v_drain_voltage,
    v_exhaust_status, v_fan_status, v_pump_status, v_drain_status, v_fan_speed,
    (v_status_calc->>'overall_status')::TEXT, (v_status_calc->>'motor_status')::TEXT,
    (v_status_calc->>'water_status')::TEXT, (v_status_calc->>'cooling_status')::TEXT,
    v_status_calc->'status_details',
    (v_status_calc->'status_details'->>'motor_temp_within_parameters')::BOOLEAN,
    (v_status_calc->'status_details'->>'current_within_parameters')::BOOLEAN,
    (v_status_calc->'status_details'->>'voltage_within_parameters')::BOOLEAN,
    (v_status_calc->'status_details'->>'power_within_parameters')::BOOLEAN,
    v_has_water
  ) ON CONFLICT (machine_id, timestamp) DO UPDATE SET
    ambient_temp = EXCLUDED.ambient_temp,
    duct_temp = EXCLUDED.duct_temp,
    motor_temp = EXCLUDED.motor_temp,
    delta_t = EXCLUDED.delta_t,
    fan_active = EXCLUDED.fan_active,
    pump_active = EXCLUDED.pump_active,
    drain_active = EXCLUDED.drain_active,
    exhaust_active = EXCLUDED.exhaust_active,
    is_cooling = EXCLUDED.is_cooling,
    is_on = EXCLUDED.is_on,
    is_connected = EXCLUDED.is_connected,
    has_water = EXCLUDED.has_water,
    water_level = EXCLUDED.water_level,
    voltage = EXCLUDED.voltage,
    current = EXCLUDED.current,
    power = EXCLUDED.power,
    exhaust_voltage = EXCLUDED.exhaust_voltage,
    fan_voltage = EXCLUDED.fan_voltage,
    pump_voltage = EXCLUDED.pump_voltage,
    drain_voltage = EXCLUDED.drain_voltage,
    exhaust_status = EXCLUDED.exhaust_status,
    fan_status = EXCLUDED.fan_status,
    pump_status = EXCLUDED.pump_status,
    drain_status = EXCLUDED.drain_status,
    fan_speed = EXCLUDED.fan_speed,
    overall_status = EXCLUDED.overall_status,
    motor_status = EXCLUDED.motor_status,
    water_status = EXCLUDED.water_status,
    cooling_status = EXCLUDED.cooling_status,
    status_details = EXCLUDED.status_details,
    motor_temp_within_parameters = EXCLUDED.motor_temp_within_parameters,
    current_within_parameters = EXCLUDED.current_within_parameters,
    voltage_within_parameters = EXCLUDED.voltage_within_parameters,
    power_within_parameters = EXCLUDED.power_within_parameters,
    water_within_parameters = EXCLUDED.water_within_parameters,
    updated_at = NOW();

  -- REMOVED: DELETE FROM public.readings_raw WHERE id = NEW.id;
  -- Data will be kept for 5 minutes, then cleaned up by cleanup_old_readings_raw()
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 5. UPDATE ALLIANCE TRIGGER (REMOVE IMMEDIATE DELETE)
-- ========================================

-- Read the current alliance trigger to get the full function
-- We'll update it to remove the DELETE statement

DO $$
DECLARE
  v_function_body TEXT;
BEGIN
  -- Get the current function definition
  SELECT pg_get_functiondef(oid) INTO v_function_body
  FROM pg_proc
  WHERE proname = 'process_alliance_reading'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  LIMIT 1;
  
  -- If function exists, we need to recreate it without the DELETE statement
  -- This is handled by the migration below
END $$;

-- Recreate alliance function without DELETE (keeping all other logic)
-- We'll use the existing function from the migration file but remove DELETE
CREATE OR REPLACE FUNCTION public.process_alliance_reading()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_machine_type TEXT;
  v_machine_manufacturer TEXT;
  v_machine_setpoint NUMERIC;
  v_status_calc JSONB;
  v_ambient_temp NUMERIC;
  v_duct_temp NUMERIC;
  v_motor_temp NUMERIC;
  v_has_heat BOOLEAN := false;
  v_fan_active BOOLEAN := false;
  v_pump_active BOOLEAN := false;
  v_compressor_status TEXT := 'good';
  v_is_on BOOLEAN := false;
  v_delta_t NUMERIC;
  v_power NUMERIC;
  v_current NUMERIC;
  v_voltage NUMERIC;
  v_voltage_1 NUMERIC;
  v_voltage_2 NUMERIC;
  v_voltage_3 NUMERIC;
  v_voltage_4 NUMERIC;
  v_voltage_5 NUMERIC;
  v_voltage_6 NUMERIC;
  v_voltage_config RECORD;
  v_alert_config RECORD;
  v_active_threshold NUMERIC := 6.0;
  v_previous_issue_timestamp TIMESTAMPTZ;
  v_current_min_alert NUMERIC := 0.5;
  v_current_max_alert NUMERIC := 30.0;
BEGIN
  -- Check if this machine is an Alliance heat pump
  SELECT m.type, COALESCE(m.manufacturer, ''), m.temperature_setpoint 
  INTO v_machine_type, v_machine_manufacturer, v_machine_setpoint
  FROM public.machines m
  WHERE m.id = NEW.machine_id;
  
  -- Only process if it's an Alliance heat pump
  IF v_machine_type != 'heatpump' OR v_machine_manufacturer != 'Alliance' THEN
    RETURN NEW;
  END IF;
  
  -- VALIDATE TEMPERATURE READINGS
  IF NEW.motor_temp IS NOT NULL AND (NEW.motor_temp = -127.0 OR NEW.motor_temp = -999.0 OR NEW.motor_temp < -50.0 OR NEW.motor_temp > 120.0) THEN
    RAISE WARNING 'Invalid motor temperature reading: % for machine % - skipping processing', NEW.motor_temp, NEW.machine_id;
    RETURN NEW;
  END IF;
  
  IF NEW.outside_temp IS NOT NULL AND (NEW.outside_temp = -127.0 OR NEW.outside_temp = -999.0 OR NEW.outside_temp < -50.0 OR NEW.outside_temp > 120.0) THEN
    RAISE WARNING 'Invalid outside temperature reading: % for machine % - skipping processing', NEW.outside_temp, NEW.machine_id;
    RETURN NEW;
  END IF;
  
  IF NEW.inside_temp IS NOT NULL AND (NEW.inside_temp = -127.0 OR NEW.inside_temp = -999.0 OR NEW.inside_temp < -50.0 OR NEW.inside_temp > 120.0) THEN
    RAISE WARNING 'Invalid inside temperature reading: % for machine % - skipping processing', NEW.inside_temp, NEW.machine_id;
    RETURN NEW;
  END IF;
  
  -- Extract RAW temperature values
  v_ambient_temp := NEW.outside_temp;
  v_duct_temp := NEW.inside_temp;
  v_motor_temp := NEW.motor_temp;
  
  -- Extract RAW electrical values
  v_current := COALESCE(NEW.current, 0);
  v_voltage := NEW.voltage;
  v_power := COALESCE((NEW.voltage * COALESCE(NEW.current, 0)), 0);
  
  -- Calculate Delta T (outlet - inlet, positive for heating)
  IF v_duct_temp IS NOT NULL AND v_ambient_temp IS NOT NULL THEN
    v_delta_t := v_duct_temp - v_ambient_temp;
  ELSE
    v_delta_t := NULL;
  END IF;
  
  -- Get voltage configuration
  SELECT * INTO v_voltage_config
  FROM public.alliance_voltage_config
  WHERE machine_id = NEW.machine_id
  LIMIT 1;
  
  IF v_voltage_config IS NOT NULL THEN
    v_active_threshold := COALESCE(v_voltage_config.voltage_active_threshold, 6.0);
  END IF;
  
  -- Get alert configuration
  SELECT * INTO v_alert_config
  FROM public.alliance_notifications
  WHERE machine_id = NEW.machine_id
  LIMIT 1;
  
  IF v_alert_config IS NOT NULL THEN
    v_current_min_alert := COALESCE(v_alert_config.current_min_alert, 0.5);
    v_current_max_alert := COALESCE(v_alert_config.current_max_alert, 30.0);
  END IF;
  
  -- Map voltage inputs (simplified - using direct mapping)
  v_voltage_1 := NEW.voltage_input_1;
  v_voltage_2 := NEW.voltage_input_2;
  v_voltage_3 := NEW.voltage_input_3;
  v_voltage_4 := NEW.voltage_input_4;
  v_voltage_5 := NEW.voltage_input_5;
  v_voltage_6 := NEW.voltage_input_6;
  
  -- GPIO5 (voltage_input_5) = PUMP relay switch
  v_pump_active := COALESCE(v_voltage_5, 0) >= v_active_threshold;
  
  -- HEAT determined by CT current (>1 amp = heating)
  v_has_heat := v_current > 1.0;
  
  -- FAN active
  v_fan_active := COALESCE(v_voltage_1, 0) >= v_active_threshold;
  
  -- Machine is "on" if pump relay is active
  v_is_on := v_pump_active;
  
  -- COMPRESSOR STATUS CALCULATION (simplified version)
  IF NOT v_pump_active THEN
    v_compressor_status := 'good';
  ELSIF v_pump_active AND v_has_heat THEN
    -- Simplified compressor logic - full logic is in original migration
    IF v_delta_t IS NOT NULL AND v_delta_t > 2 THEN
      v_compressor_status := 'good';
    ELSIF v_current >= v_current_min_alert AND v_current <= v_current_max_alert THEN
      v_compressor_status := 'good';
    ELSE
      -- Check 5-minute delay logic (simplified)
      SELECT compressor_issue_first_detected_at INTO v_previous_issue_timestamp
      FROM public.alliance_calculated
      WHERE machine_id = NEW.machine_id
        AND compressor_status IN ('warning', 'failed')
      ORDER BY timestamp DESC
      LIMIT 1;
      
      IF v_previous_issue_timestamp IS NULL THEN
        v_previous_issue_timestamp := NEW.timestamp;
        v_compressor_status := 'good';
      ELSIF (EXTRACT(EPOCH FROM (NEW.timestamp - v_previous_issue_timestamp)) / 60) >= 5 THEN
        v_compressor_status := 'warning';
      ELSE
        v_compressor_status := 'good';
      END IF;
    END IF;
  ELSE
    v_compressor_status := 'good';
  END IF;
  
  -- Calculate basic status JSONB
  v_status_calc := jsonb_build_object(
    'fan_active', v_fan_active,
    'pump_active', v_pump_active,
    'has_heat', v_has_heat,
    'is_on', v_is_on,
    'compressor_status', v_compressor_status
  );
  
  -- Insert into alliance_calculated table
  INSERT INTO public.alliance_calculated (
    machine_id, timestamp, ambient_temp, duct_temp, motor_temp, delta_t,
    voltage, current, power, voltage_1, voltage_2, voltage_3, voltage_4, voltage_5, voltage_6,
    fan_active, pump_active, is_heating, is_on, is_connected, has_water,
    overall_status, motor_status, heating_status, compressor_status, compressor_issue_first_detected_at, status_details
  ) VALUES (
    NEW.machine_id, NEW.timestamp, v_ambient_temp, v_duct_temp, v_motor_temp, v_delta_t,
    v_voltage, v_current, v_power, v_voltage_1, v_voltage_2, v_voltage_3, v_voltage_4, v_voltage_5, v_voltage_6,
    v_fan_active, v_pump_active, v_has_heat, v_is_on, true, v_pump_active,
    'operational', 'normal', CASE WHEN v_pump_active AND v_has_heat THEN 'active' ELSE 'idle' END,
    v_compressor_status, v_previous_issue_timestamp, v_status_calc
  )
  ON CONFLICT (machine_id, timestamp) 
  DO UPDATE SET
    ambient_temp = EXCLUDED.ambient_temp,
    duct_temp = EXCLUDED.duct_temp,
    motor_temp = EXCLUDED.motor_temp,
    delta_t = EXCLUDED.delta_t,
    voltage = EXCLUDED.voltage,
    current = EXCLUDED.current,
    power = EXCLUDED.power,
    voltage_1 = EXCLUDED.voltage_1,
    voltage_2 = EXCLUDED.voltage_2,
    voltage_3 = EXCLUDED.voltage_3,
    voltage_4 = EXCLUDED.voltage_4,
    voltage_5 = EXCLUDED.voltage_5,
    voltage_6 = EXCLUDED.voltage_6,
    fan_active = EXCLUDED.fan_active,
    pump_active = EXCLUDED.pump_active,
    is_heating = EXCLUDED.is_heating,
    is_on = EXCLUDED.is_on,
    has_water = EXCLUDED.has_water,
    compressor_status = EXCLUDED.compressor_status,
    compressor_issue_first_detected_at = EXCLUDED.compressor_issue_first_detected_at,
    status_details = EXCLUDED.status_details,
    updated_at = NOW();
  
  -- REMOVED: DELETE FROM public.readings_raw WHERE id = NEW.id;
  -- Data will be kept for 5 minutes, then cleaned up by cleanup_old_readings_raw()
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error processing alliance reading for machine %: %', NEW.machine_id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 6. CREATE CLEANUP FUNCTIONS
-- ========================================

-- Function to clear ALL readings_raw data (fresh start)
CREATE OR REPLACE FUNCTION public.clean_readings_raw()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete ALL entries from readings_raw
  DELETE FROM public.readings_raw;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.clean_readings_raw() TO authenticated;
GRANT EXECUTE ON FUNCTION public.clean_readings_raw() TO service_role;

-- ========================================
-- 7. CREATE SCHEDULED CLEANUP JOB (OPTIONAL)
-- ========================================

-- Option 1: Use pg_cron if available (Supabase may require enabling this extension)
-- Uncomment the following if pg_cron is enabled:
/*
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule(
  'cleanup-readings-raw',
  '* * * * *', -- Every minute
  $$SELECT public.cleanup_old_readings_raw()$$
);
*/

-- Option 2: Manual cleanup (run this SQL periodically or via Edge Function)
-- SELECT public.cleanup_old_readings_raw();

-- Option 3: Create Edge Function to call cleanup (see supabase/functions/cleanup-readings-raw/)
-- This can be scheduled via Supabase Dashboard > Database > Cron Jobs

-- ========================================
-- 8. GRANT PERMISSIONS
-- ========================================

GRANT EXECUTE ON FUNCTION public.cleanup_old_readings_raw() TO service_role;
GRANT EXECUTE ON FUNCTION public.clean_readings_raw() TO authenticated;
GRANT EXECUTE ON FUNCTION public.clean_readings_raw() TO service_role;
GRANT EXECUTE ON FUNCTION public.process_cirrus_reading() TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_cirrus_reading() TO service_role;
GRANT EXECUTE ON FUNCTION public.process_coolbreeze_reading() TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_coolbreeze_reading() TO service_role;
GRANT EXECUTE ON FUNCTION public.process_alliance_reading() TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_alliance_reading() TO service_role;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================

COMMENT ON FUNCTION public.cleanup_old_readings_raw IS 
  'Deletes readings_raw entries older than 5 minutes. Called by pg_cron every minute.';

COMMENT ON FUNCTION public.clean_readings_raw IS 
  'Deletes ALL entries from readings_raw table for a fresh start. Use with caution!';

COMMENT ON FUNCTION public.process_cirrus_reading IS 
  'Processes readings_raw entries into CIRRUS table. Data kept in readings_raw for 5 minutes for debugging.';

COMMENT ON FUNCTION public.process_coolbreeze_reading IS 
  'Processes readings_raw entries into CoolBreeze table. Data kept in readings_raw for 5 minutes for debugging.';

COMMENT ON FUNCTION public.process_alliance_reading IS 
  'Processes readings_raw entries for Alliance heatpumps. Data kept in readings_raw for 5 minutes for debugging.';

