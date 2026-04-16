-- ============================================================================
-- RESTORE WORKING CIRRUS AND COOLBREEZE TRIGGERS
-- This fixes the broken triggers from yesterday's debugging session
-- ============================================================================
-- Date: December 2, 2025
-- Purpose: Restore full working trigger functions that were accidentally replaced
--          with placeholder code during debugging
-- ============================================================================

-- ========================================
-- 1. RESTORE CIRRUS TRIGGER
-- ========================================

-- Drop existing (broken) function
DROP FUNCTION IF EXISTS public.process_cirrus_reading() CASCADE;

-- Recreate full working function
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
    RETURN NEW; -- Skip processing, but allow the insert to continue
  END IF;
  
  -- VALIDATE TEMPERATURE READINGS (reject electrical interference errors)
  IF NEW.motor_temp IS NOT NULL AND (NEW.motor_temp = -127.0 OR NEW.motor_temp = -999.0 OR NEW.motor_temp < -50.0 OR NEW.motor_temp > 120.0) THEN
    RAISE WARNING 'Invalid motor temperature reading: % for machine %', NEW.motor_temp, NEW.machine_id;
    DELETE FROM public.readings_raw WHERE id = NEW.id;
    RETURN NEW;
  END IF;
  
  IF NEW.outside_temp IS NOT NULL AND (NEW.outside_temp = -127.0 OR NEW.outside_temp = -999.0 OR NEW.outside_temp < -50.0 OR NEW.outside_temp > 120.0) THEN
    RAISE WARNING 'Invalid outside temperature reading: % for machine %', NEW.outside_temp, NEW.machine_id;
    DELETE FROM public.readings_raw WHERE id = NEW.id;
    RETURN NEW;
  END IF;
  
  IF NEW.inside_temp IS NOT NULL AND (NEW.inside_temp = -127.0 OR NEW.inside_temp = -999.0 OR NEW.inside_temp < -50.0 OR NEW.inside_temp > 120.0) THEN
    RAISE WARNING 'Invalid inside temperature reading: % for machine %', NEW.inside_temp, NEW.machine_id;
    DELETE FROM public.readings_raw WHERE id = NEW.id;
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
  
  -- Delete the raw data immediately after successful processing
  DELETE FROM public.readings_raw WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_process_cirrus_reading ON public.readings_raw;
CREATE TRIGGER trigger_process_cirrus_reading
  AFTER INSERT ON public.readings_raw
  FOR EACH ROW
  EXECUTE FUNCTION public.process_cirrus_reading();

-- ========================================
-- 2. RESTORE COOLBREEZE TRIGGER
-- ========================================

-- Drop existing (broken) function
DROP FUNCTION IF EXISTS public.process_coolbreeze_reading() CASCADE;

-- Recreate full working function
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
    RETURN NEW; -- Skip processing
  END IF;
  
  -- VALIDATE TEMPERATURE READINGS
  IF NEW.motor_temp IS NOT NULL AND (NEW.motor_temp = -127.0 OR NEW.motor_temp = -999.0 OR NEW.motor_temp < -50.0 OR NEW.motor_temp > 120.0) THEN
    RAISE WARNING 'Invalid motor temperature reading: % for machine %', NEW.motor_temp, NEW.machine_id;
    DELETE FROM public.readings_raw WHERE id = NEW.id;
    RETURN NEW;
  END IF;
  
  IF NEW.outside_temp IS NOT NULL AND (NEW.outside_temp = -127.0 OR NEW.outside_temp = -999.0 OR NEW.outside_temp < -50.0 OR NEW.outside_temp > 120.0) THEN
    RAISE WARNING 'Invalid outside temperature reading: % for machine %', NEW.outside_temp, NEW.machine_id;
    DELETE FROM public.readings_raw WHERE id = NEW.id;
    RETURN NEW;
  END IF;
  
  IF NEW.inside_temp IS NOT NULL AND (NEW.inside_temp = -127.0 OR NEW.inside_temp = -999.0 OR NEW.inside_temp < -50.0 OR NEW.inside_temp > 120.0) THEN
    RAISE WARNING 'Invalid inside temperature reading: % for machine %', NEW.inside_temp, NEW.machine_id;
    DELETE FROM public.readings_raw WHERE id = NEW.id;
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

  -- Delete raw data after successful processing
  DELETE FROM public.readings_raw WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_process_coolbreeze_reading ON public.readings_raw;
CREATE TRIGGER trigger_process_coolbreeze_reading
  AFTER INSERT ON public.readings_raw
  FOR EACH ROW
  EXECUTE FUNCTION public.process_coolbreeze_reading();

-- ========================================
-- 3. VERIFY TRIGGERS ARE ENABLED
-- ========================================

-- Ensure all triggers are enabled
ALTER TABLE readings_raw ENABLE TRIGGER trigger_process_cirrus_reading;
ALTER TABLE readings_raw ENABLE TRIGGER trigger_process_coolbreeze_reading;
ALTER TABLE readings_raw ENABLE TRIGGER trigger_process_alliance_reading;

-- ========================================
-- 4. GRANT PERMISSIONS
-- ========================================

GRANT EXECUTE ON FUNCTION public.process_cirrus_reading() TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_cirrus_reading() TO service_role;

GRANT EXECUTE ON FUNCTION public.process_coolbreeze_reading() TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_coolbreeze_reading() TO service_role;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================

COMMENT ON FUNCTION public.process_cirrus_reading IS 
  'Processes readings_raw entries into CIRRUS table for evaporative coolers. RESTORED from archive.';

COMMENT ON FUNCTION public.process_coolbreeze_reading IS 
  'Processes readings_raw entries into CoolBreeze table for HVAC machines. RESTORED from archive.';

