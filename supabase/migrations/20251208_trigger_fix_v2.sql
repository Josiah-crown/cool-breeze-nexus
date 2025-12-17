-- ========================================
-- TRIGGER FIX V2 - December 8, 2025
-- ========================================
-- Problem: The readings_raw table doesn't have a 'timestamp' column,
--          only 'created_at'. The triggers were trying to use NEW.timestamp
--          which caused them to fail silently.
--
-- This fix:
-- 1. Adds timestamp column to readings_raw if missing
-- 2. Recreates all triggers to use created_at properly
-- 3. Also checks manufacturer values
-- ========================================

-- ========================================
-- STEP 0: ADD TIMESTAMP COLUMN IF MISSING
-- ========================================
ALTER TABLE public.readings_raw 
ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ;

-- ========================================
-- STEP 1: CHECK MACHINE MANUFACTURERS
-- ========================================
-- Run this to see what manufacturers exist:
-- SELECT id, name, type, manufacturer FROM machines;

-- ========================================
-- STEP 2: DROP ALL EXISTING TRIGGERS
-- ========================================
DROP TRIGGER IF EXISTS trigger_process_cirrus_reading ON public.readings_raw;
DROP TRIGGER IF EXISTS trigger_process_coolbreeze_reading ON public.readings_raw;
DROP TRIGGER IF EXISTS trigger_process_alliance_reading ON public.readings_raw;

DROP FUNCTION IF EXISTS public.process_cirrus_reading() CASCADE;
DROP FUNCTION IF EXISTS public.process_coolbreeze_reading() CASCADE;
DROP FUNCTION IF EXISTS public.process_alliance_reading() CASCADE;

-- ========================================
-- STEP 3: CIRRUS PROCESSING FUNCTION (FIXED)
-- ========================================

CREATE OR REPLACE FUNCTION public.process_cirrus_reading()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_machine_manufacturer TEXT;
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
  v_fan_voltage NUMERIC;
  v_pump_voltage NUMERIC;
  v_drain_voltage NUMERIC;
  v_exhaust_voltage NUMERIC;
  v_water_voltage NUMERIC;
  v_voltage_config RECORD;
  v_active_threshold NUMERIC := 6.0;
  v_reading_timestamp TIMESTAMPTZ;
BEGIN
  -- Check if this machine is a Cirrus
  SELECT COALESCE(m.manufacturer, '') INTO v_machine_manufacturer
  FROM public.machines m WHERE m.id = NEW.machine_id;
  
  -- Only process Cirrus machines
  IF v_machine_manufacturer != 'Cirrus' THEN
    RETURN NEW;
  END IF;
  
  -- Validate temperatures (skip invalid readings)
  IF NEW.motor_temp IS NOT NULL AND (NEW.motor_temp < -50.0 OR NEW.motor_temp > 120.0) THEN
    RETURN NEW;
  END IF;
  
  -- Get timestamp - use created_at since timestamp may not exist
  v_reading_timestamp := COALESCE(NEW.timestamp, NEW.created_at, NOW());
  
  -- Extract values
  v_ambient_temp := NEW.outside_temp;
  v_duct_temp := NEW.inside_temp;
  v_motor_temp := NEW.motor_temp;
  v_has_water := COALESCE(NEW.has_water, false);
  v_current := NEW.current;
  v_voltage := NEW.voltage;
  v_power := COALESCE(NEW.power, COALESCE(NEW.voltage, 0) * COALESCE(NEW.current, 0));
  v_delta_t := ABS(COALESCE(v_ambient_temp, 0) - COALESCE(v_duct_temp, 0));
  
  -- Get voltage config from GENERIC table
  SELECT * INTO v_voltage_config
  FROM public.machine_voltage_config
  WHERE machine_id = NEW.machine_id LIMIT 1;
  
  IF v_voltage_config IS NOT NULL THEN
    v_active_threshold := COALESCE(v_voltage_config.voltage_active_threshold, 6.0);
  END IF;
  
  -- Voltage mapping for Cirrus
  v_fan_voltage := NEW.voltage_input_1;
  v_pump_voltage := NEW.voltage_input_2;
  v_drain_voltage := NEW.voltage_input_3;
  v_exhaust_voltage := NEW.voltage_input_4;
  v_water_voltage := NEW.voltage_input_5;
  
  -- Determine active states
  v_fan_active := COALESCE(v_fan_voltage, 0) >= v_active_threshold;
  v_pump_active := COALESCE(v_pump_voltage, 0) >= v_active_threshold;
  v_drain_active := COALESCE(v_drain_voltage, 0) >= v_active_threshold;
  v_exhaust_active := COALESCE(v_exhaust_voltage, 0) >= v_active_threshold;
  
  IF v_water_voltage IS NOT NULL THEN
    v_has_water := v_water_voltage >= v_active_threshold;
  END IF;
  
  -- Insert into cirrus table
  INSERT INTO public.cirrus (
    machine_id, timestamp, ambient_temp, duct_temp, motor_temp, delta_t,
    voltage, current, power,
    fan_voltage, pump_voltage, drain_voltage, exhaust_voltage,
    fan_active, pump_active, drain_active, exhaust_active,
    is_cooling, is_on, is_connected, has_water,
    fan_status, pump_status, drain_status, exhaust_status,
    fan_speed, overall_status, motor_status, water_status, cooling_status,
    status_details
  ) VALUES (
    NEW.machine_id,
    v_reading_timestamp,
    v_ambient_temp, v_duct_temp, v_motor_temp, v_delta_t,
    v_voltage, v_current, v_power,
    v_fan_voltage, v_pump_voltage, v_drain_voltage, v_exhaust_voltage,
    v_fan_active, v_pump_active, v_drain_active, v_exhaust_active,
    (v_fan_active AND v_pump_active),
    (v_fan_active OR v_pump_active OR v_drain_active OR v_exhaust_active),
    true, v_has_water,
    CASE WHEN v_fan_active THEN 'ON' ELSE 'OFF' END,
    CASE WHEN v_pump_active THEN 'ON' ELSE 'OFF' END,
    CASE WHEN v_drain_active THEN 'ON' ELSE 'OFF' END,
    CASE WHEN v_exhaust_active THEN 'ON' ELSE 'OFF' END,
    CASE WHEN v_fan_active THEN 100 ELSE 0 END,
    'operational', 'normal',
    CASE WHEN v_has_water THEN 'ok' ELSE 'empty' END,
    CASE WHEN v_fan_active AND v_pump_active THEN 'active' ELSE 'idle' END,
    jsonb_build_object('fan_active', v_fan_active, 'pump_active', v_pump_active, 'has_water', v_has_water)
  )
  ON CONFLICT (machine_id, timestamp) DO UPDATE SET
    ambient_temp = EXCLUDED.ambient_temp, duct_temp = EXCLUDED.duct_temp, motor_temp = EXCLUDED.motor_temp,
    delta_t = EXCLUDED.delta_t, voltage = EXCLUDED.voltage, current = EXCLUDED.current, power = EXCLUDED.power,
    fan_voltage = EXCLUDED.fan_voltage, pump_voltage = EXCLUDED.pump_voltage,
    drain_voltage = EXCLUDED.drain_voltage, exhaust_voltage = EXCLUDED.exhaust_voltage,
    fan_active = EXCLUDED.fan_active, pump_active = EXCLUDED.pump_active, drain_active = EXCLUDED.drain_active,
    exhaust_active = EXCLUDED.exhaust_active, is_cooling = EXCLUDED.is_cooling, is_on = EXCLUDED.is_on,
    has_water = EXCLUDED.has_water, status_details = EXCLUDED.status_details, updated_at = NOW();
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Cirrus trigger error for machine %: %', NEW.machine_id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_process_cirrus_reading
  AFTER INSERT ON public.readings_raw
  FOR EACH ROW EXECUTE FUNCTION public.process_cirrus_reading();

-- ========================================
-- STEP 4: COOLBREEZE PROCESSING FUNCTION (FIXED)
-- ========================================

CREATE OR REPLACE FUNCTION public.process_coolbreeze_reading()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_machine_manufacturer TEXT;
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
  v_fan_voltage NUMERIC;
  v_pump_voltage NUMERIC;
  v_drain_voltage NUMERIC;
  v_exhaust_voltage NUMERIC;
  v_water_voltage NUMERIC;
  v_voltage_config RECORD;
  v_active_threshold NUMERIC := 6.0;
  v_reading_timestamp TIMESTAMPTZ;
BEGIN
  -- Check if this machine is a CoolBreeze
  SELECT COALESCE(m.manufacturer, '') INTO v_machine_manufacturer
  FROM public.machines m WHERE m.id = NEW.machine_id;
  
  -- Only process CoolBreeze machines
  IF v_machine_manufacturer != 'CoolBreeze' THEN
    RETURN NEW;
  END IF;
  
  -- Validate temperatures
  IF NEW.motor_temp IS NOT NULL AND (NEW.motor_temp < -50.0 OR NEW.motor_temp > 120.0) THEN
    RETURN NEW;
  END IF;
  
  -- Get timestamp
  v_reading_timestamp := COALESCE(NEW.timestamp, NEW.created_at, NOW());
  
  -- Extract values
  v_ambient_temp := NEW.outside_temp;
  v_duct_temp := NEW.inside_temp;
  v_motor_temp := NEW.motor_temp;
  v_has_water := COALESCE(NEW.has_water, false);
  v_current := NEW.current;
  v_voltage := NEW.voltage;
  v_power := COALESCE(NEW.power, COALESCE(NEW.voltage, 0) * COALESCE(NEW.current, 0));
  v_delta_t := ABS(COALESCE(v_ambient_temp, 0) - COALESCE(v_duct_temp, 0));
  
  -- Get voltage config
  SELECT * INTO v_voltage_config
  FROM public.machine_voltage_config
  WHERE machine_id = NEW.machine_id LIMIT 1;
  
  IF v_voltage_config IS NOT NULL THEN
    v_active_threshold := COALESCE(v_voltage_config.voltage_active_threshold, 6.0);
  END IF;
  
  -- Voltage mapping
  v_fan_voltage := NEW.voltage_input_1;
  v_pump_voltage := NEW.voltage_input_2;
  v_drain_voltage := NEW.voltage_input_3;
  v_exhaust_voltage := NEW.voltage_input_4;
  v_water_voltage := NEW.voltage_input_5;
  
  -- Determine active states
  v_fan_active := COALESCE(v_fan_voltage, 0) >= v_active_threshold;
  v_pump_active := COALESCE(v_pump_voltage, 0) >= v_active_threshold;
  v_drain_active := COALESCE(v_drain_voltage, 0) >= v_active_threshold;
  v_exhaust_active := COALESCE(v_exhaust_voltage, 0) >= v_active_threshold;
  
  IF v_water_voltage IS NOT NULL THEN
    v_has_water := v_water_voltage >= v_active_threshold;
  END IF;
  
  -- Insert into coolbreeze table
  INSERT INTO public.coolbreeze (
    machine_id, timestamp, ambient_temp, duct_temp, motor_temp, delta_t,
    voltage, current, power,
    fan_voltage, pump_voltage, drain_voltage, exhaust_voltage,
    fan_active, pump_active, drain_active, exhaust_active,
    is_cooling, is_on, is_connected, has_water, water_level,
    fan_status, pump_status, drain_status, exhaust_status,
    fan_speed, overall_status, motor_status, water_status, cooling_status,
    status_details
  ) VALUES (
    NEW.machine_id,
    v_reading_timestamp,
    v_ambient_temp, v_duct_temp, v_motor_temp, v_delta_t,
    v_voltage, v_current, v_power,
    v_fan_voltage, v_pump_voltage, v_drain_voltage, v_exhaust_voltage,
    v_fan_active, v_pump_active, v_drain_active, v_exhaust_active,
    (v_fan_active AND v_pump_active),
    (v_fan_active OR v_pump_active OR v_drain_active OR v_exhaust_active),
    true, v_has_water,
    CASE WHEN v_has_water THEN 100.0 ELSE 0.0 END,
    CASE WHEN v_fan_active THEN 'ON' ELSE 'OFF' END,
    CASE WHEN v_pump_active THEN 'ON' ELSE 'OFF' END,
    CASE WHEN v_drain_active THEN 'ON' ELSE 'OFF' END,
    CASE WHEN v_exhaust_active THEN 'ON' ELSE 'OFF' END,
    CASE WHEN v_fan_active THEN 100 ELSE 0 END,
    'operational', 'normal',
    CASE WHEN v_has_water THEN 'ok' ELSE 'empty' END,
    CASE WHEN v_fan_active AND v_pump_active THEN 'active' ELSE 'idle' END,
    jsonb_build_object('fan_active', v_fan_active, 'pump_active', v_pump_active, 'has_water', v_has_water)
  )
  ON CONFLICT (machine_id, timestamp) DO UPDATE SET
    ambient_temp = EXCLUDED.ambient_temp, duct_temp = EXCLUDED.duct_temp, motor_temp = EXCLUDED.motor_temp,
    delta_t = EXCLUDED.delta_t, voltage = EXCLUDED.voltage, current = EXCLUDED.current, power = EXCLUDED.power,
    fan_voltage = EXCLUDED.fan_voltage, pump_voltage = EXCLUDED.pump_voltage,
    drain_voltage = EXCLUDED.drain_voltage, exhaust_voltage = EXCLUDED.exhaust_voltage,
    fan_active = EXCLUDED.fan_active, pump_active = EXCLUDED.pump_active, drain_active = EXCLUDED.drain_active,
    exhaust_active = EXCLUDED.exhaust_active, is_cooling = EXCLUDED.is_cooling, is_on = EXCLUDED.is_on,
    has_water = EXCLUDED.has_water, water_level = EXCLUDED.water_level,
    status_details = EXCLUDED.status_details, updated_at = NOW();
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'CoolBreeze trigger error for machine %: %', NEW.machine_id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_process_coolbreeze_reading
  AFTER INSERT ON public.readings_raw
  FOR EACH ROW EXECUTE FUNCTION public.process_coolbreeze_reading();

-- ========================================
-- STEP 5: ALLIANCE PROCESSING FUNCTION (FIXED)
-- ========================================

CREATE OR REPLACE FUNCTION public.process_alliance_reading()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_machine_type TEXT;
  v_machine_manufacturer TEXT;
  v_ambient_temp NUMERIC;
  v_duct_temp NUMERIC;
  v_motor_temp NUMERIC;
  v_pump_active BOOLEAN := false;
  v_has_heat BOOLEAN := false;
  v_compressor_status TEXT := 'good';
  v_delta_t NUMERIC;
  v_power NUMERIC;
  v_current NUMERIC;
  v_voltage NUMERIC;
  v_voltage_5 NUMERIC;
  v_voltage_config RECORD;
  v_active_threshold NUMERIC := 6.0;
  v_reading_timestamp TIMESTAMPTZ;
BEGIN
  -- Check if this machine is an Alliance heatpump
  SELECT m.type, COALESCE(m.manufacturer, '')
  INTO v_machine_type, v_machine_manufacturer
  FROM public.machines m WHERE m.id = NEW.machine_id;
  
  -- Only process Alliance heatpumps
  IF v_machine_type != 'heatpump' OR v_machine_manufacturer != 'Alliance' THEN
    RETURN NEW;
  END IF;
  
  -- Validate temperatures
  IF NEW.motor_temp IS NOT NULL AND (NEW.motor_temp < -50.0 OR NEW.motor_temp > 120.0) THEN
    RETURN NEW;
  END IF;
  
  -- Get timestamp
  v_reading_timestamp := COALESCE(NEW.timestamp, NEW.created_at, NOW());
  
  -- Extract values
  v_ambient_temp := NEW.outside_temp;
  v_duct_temp := NEW.inside_temp;
  v_motor_temp := NEW.motor_temp;
  v_current := COALESCE(NEW.current, 0);
  v_voltage := NEW.voltage;
  v_power := COALESCE(NEW.voltage, 0) * COALESCE(NEW.current, 0);
  v_voltage_5 := NEW.voltage_input_5;
  
  -- Calculate Delta T
  IF v_duct_temp IS NOT NULL AND v_ambient_temp IS NOT NULL THEN
    v_delta_t := v_duct_temp - v_ambient_temp;
  END IF;
  
  -- Get voltage config
  SELECT * INTO v_voltage_config 
  FROM public.machine_voltage_config 
  WHERE machine_id = NEW.machine_id LIMIT 1;
  
  IF v_voltage_config IS NOT NULL THEN
    v_active_threshold := COALESCE(v_voltage_config.voltage_active_threshold, 6.0);
  END IF;
  
  -- Heatpump logic
  v_pump_active := COALESCE(v_voltage_5, 0) >= v_active_threshold;
  v_has_heat := v_current > 1.0;
  
  -- Simple compressor status
  IF v_pump_active AND v_has_heat AND v_delta_t IS NOT NULL AND v_delta_t > 2 THEN
    v_compressor_status := 'good';
  ELSIF v_pump_active AND NOT v_has_heat THEN
    v_compressor_status := 'warning';
  ELSE
    v_compressor_status := 'good';
  END IF;
  
  -- Insert into alliance table
  INSERT INTO public.alliance (
    machine_id, timestamp, ambient_temp, duct_temp, motor_temp, delta_t,
    voltage, current, power, voltage_5,
    fan_active, pump_active, is_heating, is_on, is_connected, has_water,
    overall_status, motor_status, heating_status, compressor_status,
    status_details
  ) VALUES (
    NEW.machine_id,
    v_reading_timestamp,
    v_ambient_temp, v_duct_temp, v_motor_temp, v_delta_t,
    v_voltage, v_current, v_power, v_voltage_5,
    false, v_pump_active, v_has_heat, v_pump_active, true, v_pump_active,
    'operational', 'normal',
    CASE WHEN v_pump_active AND v_has_heat THEN 'active' ELSE 'idle' END,
    v_compressor_status,
    jsonb_build_object('pump_active', v_pump_active, 'has_heat', v_has_heat)
  )
  ON CONFLICT (machine_id, timestamp) DO UPDATE SET
    ambient_temp = EXCLUDED.ambient_temp, duct_temp = EXCLUDED.duct_temp, motor_temp = EXCLUDED.motor_temp,
    delta_t = EXCLUDED.delta_t, voltage = EXCLUDED.voltage, current = EXCLUDED.current, power = EXCLUDED.power,
    voltage_5 = EXCLUDED.voltage_5, pump_active = EXCLUDED.pump_active, is_heating = EXCLUDED.is_heating,
    is_on = EXCLUDED.is_on, has_water = EXCLUDED.has_water, heating_status = EXCLUDED.heating_status,
    compressor_status = EXCLUDED.compressor_status, status_details = EXCLUDED.status_details, updated_at = NOW();
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Alliance trigger error for machine %: %', NEW.machine_id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_process_alliance_reading
  AFTER INSERT ON public.readings_raw
  FOR EACH ROW EXECUTE FUNCTION public.process_alliance_reading();

-- ========================================
-- STEP 6: ENABLE ALL TRIGGERS
-- ========================================

ALTER TABLE public.readings_raw ENABLE TRIGGER trigger_process_cirrus_reading;
ALTER TABLE public.readings_raw ENABLE TRIGGER trigger_process_coolbreeze_reading;
ALTER TABLE public.readings_raw ENABLE TRIGGER trigger_process_alliance_reading;

-- ========================================
-- STEP 7: GRANT PERMISSIONS
-- ========================================

GRANT EXECUTE ON FUNCTION public.process_cirrus_reading() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_coolbreeze_reading() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_alliance_reading() TO authenticated, service_role;

-- ========================================
-- STEP 8: CHECK AND FIX MACHINE MANUFACTURERS
-- ========================================
-- Run this query to see your machines:
-- SELECT id, name, type, manufacturer FROM machines;

-- If your Cirrus machine doesn't have manufacturer = 'Cirrus', run:
-- UPDATE machines SET manufacturer = 'Cirrus' WHERE id = 'YOUR_MACHINE_ID';

-- If your Alliance machine doesn't have type = 'heatpump' AND manufacturer = 'Alliance', run:
-- UPDATE machines SET type = 'heatpump', manufacturer = 'Alliance' WHERE id = 'YOUR_MACHINE_ID';

-- ========================================
-- DONE
-- ========================================
SELECT 'Trigger fix v2 complete! Now check your machine manufacturers.' AS status;

