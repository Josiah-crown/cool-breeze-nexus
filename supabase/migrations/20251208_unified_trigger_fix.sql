-- ========================================
-- UNIFIED TRIGGER FIX - December 8, 2025
-- ========================================
-- Purpose: Clean up and fix ALL processing triggers
-- 
-- Issues Fixed:
-- 1. Alliance trigger was inserting into wrong table (alliance_calculated instead of alliance)
-- 2. Alliance trigger was using wrong config tables (alliance_voltage_config instead of machine_voltage_config)
-- 3. Some triggers referenced non-existent functions (calculate_cirrus_status, etc.)
-- 4. Ensures all triggers use the SIMPLIFIED architecture with generic config tables
--
-- Architecture:
-- ESP32 → readings_raw → trigger → cirrus/coolbreeze/alliance → Frontend
--
-- Generic Config Tables (shared by ALL manufacturers):
-- - machine_voltage_config
-- - machine_alert_config
-- ========================================

-- ========================================
-- STEP 1: DROP ALL EXISTING TRIGGERS AND FUNCTIONS
-- ========================================

-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_process_cirrus_reading ON public.readings_raw;
DROP TRIGGER IF EXISTS trigger_process_coolbreeze_reading ON public.readings_raw;
DROP TRIGGER IF EXISTS trigger_process_alliance_reading ON public.readings_raw;

-- Drop functions (CASCADE will also drop any remaining triggers)
DROP FUNCTION IF EXISTS public.process_cirrus_reading() CASCADE;
DROP FUNCTION IF EXISTS public.process_coolbreeze_reading() CASCADE;
DROP FUNCTION IF EXISTS public.process_alliance_reading() CASCADE;

-- Drop the old status calculation functions if they exist (we won't use them)
DROP FUNCTION IF EXISTS public.calculate_cirrus_status() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_coolbreeze_status() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_alliance_status() CASCADE;

-- ========================================
-- STEP 2: CIRRUS PROCESSING FUNCTION
-- ========================================
-- For Cirrus evaporative coolers
-- Reads from: readings_raw
-- Writes to: cirrus
-- Uses: machine_voltage_config (generic)
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
  
  -- Extract values
  v_ambient_temp := NEW.outside_temp;
  v_duct_temp := NEW.inside_temp;
  v_motor_temp := NEW.motor_temp;
  v_has_water := COALESCE(NEW.has_water, false);
  v_current := NEW.current;
  v_voltage := NEW.voltage;
  v_power := COALESCE(NEW.power, (NEW.voltage * COALESCE(NEW.current, 0)));
  v_delta_t := ABS(COALESCE(v_ambient_temp, 0) - COALESCE(v_duct_temp, 0));
  
  -- Get voltage config from GENERIC table
  SELECT * INTO v_voltage_config
  FROM public.machine_voltage_config
  WHERE machine_id = NEW.machine_id LIMIT 1;
  
  IF v_voltage_config IS NOT NULL THEN
    v_active_threshold := COALESCE(v_voltage_config.voltage_active_threshold, 6.0);
  END IF;
  
  -- Voltage mapping for Cirrus:
  -- input_1 = Fan, input_2 = Pump, input_3 = Drain, input_4 = Exhaust, input_5 = Water
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
  
  -- Water level from voltage_input_5 (float switch)
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
    COALESCE(NEW.timestamp, NEW.created_at, NOW()),
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
    has_water = EXCLUDED.has_water, fan_status = EXCLUDED.fan_status, pump_status = EXCLUDED.pump_status,
    drain_status = EXCLUDED.drain_status, exhaust_status = EXCLUDED.exhaust_status,
    fan_speed = EXCLUDED.fan_speed, overall_status = EXCLUDED.overall_status, motor_status = EXCLUDED.motor_status,
    water_status = EXCLUDED.water_status, cooling_status = EXCLUDED.cooling_status,
    status_details = EXCLUDED.status_details, updated_at = NOW();
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error processing cirrus reading for machine %: %', NEW.machine_id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_process_cirrus_reading
  AFTER INSERT ON public.readings_raw
  FOR EACH ROW
  EXECUTE FUNCTION public.process_cirrus_reading();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.process_cirrus_reading() TO authenticated, service_role;

-- ========================================
-- STEP 3: COOLBREEZE PROCESSING FUNCTION
-- ========================================
-- For CoolBreeze evaporative coolers
-- Reads from: readings_raw
-- Writes to: coolbreeze
-- Uses: machine_voltage_config (generic)
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
  
  -- Extract values
  v_ambient_temp := NEW.outside_temp;
  v_duct_temp := NEW.inside_temp;
  v_motor_temp := NEW.motor_temp;
  v_has_water := COALESCE(NEW.has_water, false);
  v_current := NEW.current;
  v_voltage := NEW.voltage;
  v_power := COALESCE(NEW.power, (NEW.voltage * COALESCE(NEW.current, 0)));
  v_delta_t := ABS(COALESCE(v_ambient_temp, 0) - COALESCE(v_duct_temp, 0));
  
  -- Get voltage config from GENERIC table
  SELECT * INTO v_voltage_config
  FROM public.machine_voltage_config
  WHERE machine_id = NEW.machine_id LIMIT 1;
  
  IF v_voltage_config IS NOT NULL THEN
    v_active_threshold := COALESCE(v_voltage_config.voltage_active_threshold, 6.0);
  END IF;
  
  -- Voltage mapping for CoolBreeze:
  -- input_1 = Fan, input_2 = Pump, input_3 = Drain, input_4 = Exhaust, input_5 = Water
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
    COALESCE(NEW.timestamp, NEW.created_at, NOW()),
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
    jsonb_build_object('fan_active', v_fan_active, 'pump_active', v_pump_active, 'exhaust_active', v_exhaust_active, 'has_water', v_has_water)
  )
  ON CONFLICT (machine_id, timestamp) DO UPDATE SET
    ambient_temp = EXCLUDED.ambient_temp, duct_temp = EXCLUDED.duct_temp, motor_temp = EXCLUDED.motor_temp,
    delta_t = EXCLUDED.delta_t, voltage = EXCLUDED.voltage, current = EXCLUDED.current, power = EXCLUDED.power,
    fan_voltage = EXCLUDED.fan_voltage, pump_voltage = EXCLUDED.pump_voltage,
    drain_voltage = EXCLUDED.drain_voltage, exhaust_voltage = EXCLUDED.exhaust_voltage,
    fan_active = EXCLUDED.fan_active, pump_active = EXCLUDED.pump_active, drain_active = EXCLUDED.drain_active,
    exhaust_active = EXCLUDED.exhaust_active, is_cooling = EXCLUDED.is_cooling, is_on = EXCLUDED.is_on,
    has_water = EXCLUDED.has_water, water_level = EXCLUDED.water_level,
    fan_status = EXCLUDED.fan_status, pump_status = EXCLUDED.pump_status,
    drain_status = EXCLUDED.drain_status, exhaust_status = EXCLUDED.exhaust_status,
    fan_speed = EXCLUDED.fan_speed, overall_status = EXCLUDED.overall_status, motor_status = EXCLUDED.motor_status,
    water_status = EXCLUDED.water_status, cooling_status = EXCLUDED.cooling_status,
    status_details = EXCLUDED.status_details, updated_at = NOW();
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error processing coolbreeze reading for machine %: %', NEW.machine_id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_process_coolbreeze_reading
  AFTER INSERT ON public.readings_raw
  FOR EACH ROW
  EXECUTE FUNCTION public.process_coolbreeze_reading();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.process_coolbreeze_reading() TO authenticated, service_role;

-- ========================================
-- STEP 4: ALLIANCE HEATPUMP PROCESSING FUNCTION
-- ========================================
-- For Alliance heat pumps
-- Reads from: readings_raw
-- Writes to: alliance (NOT alliance_calculated!)
-- Uses: machine_voltage_config, machine_alert_config (generic tables)
--
-- Key differences from evaporative coolers:
-- - GPIO5 (voltage_input_5) = Pump relay (like float switch but for pump status)
-- - Current > 1A = Heating active (compressor running)
-- - has_water field repurposed as pump status for frontend compatibility
-- ========================================

CREATE OR REPLACE FUNCTION public.process_alliance_reading()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_machine_type TEXT;
  v_machine_manufacturer TEXT;
  v_machine_setpoint NUMERIC;
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
  v_alert_config RECORD;
  v_active_threshold NUMERIC := 6.0;
  v_current_min NUMERIC := 0.5;
  v_current_max NUMERIC := 30.0;
  v_previous_issue_timestamp TIMESTAMPTZ;
BEGIN
  -- Check if this machine is an Alliance heatpump
  SELECT m.type, COALESCE(m.manufacturer, ''), m.temperature_setpoint
  INTO v_machine_type, v_machine_manufacturer, v_machine_setpoint
  FROM public.machines m WHERE m.id = NEW.machine_id;
  
  -- Only process Alliance heatpumps
  IF v_machine_type != 'heatpump' OR v_machine_manufacturer != 'Alliance' THEN
    RETURN NEW;
  END IF;
  
  -- Validate temperatures
  IF NEW.motor_temp IS NOT NULL AND (NEW.motor_temp < -50.0 OR NEW.motor_temp > 120.0) THEN
    RETURN NEW;
  END IF;
  
  -- Extract values
  v_ambient_temp := NEW.outside_temp;
  v_duct_temp := NEW.inside_temp;
  v_motor_temp := NEW.motor_temp;  -- Compressor temp for heatpumps
  v_current := COALESCE(NEW.current, 0);
  v_voltage := NEW.voltage;
  v_power := COALESCE((NEW.voltage * COALESCE(NEW.current, 0)), 0);
  v_voltage_5 := NEW.voltage_input_5;  -- GPIO5: Pump relay
  
  -- Calculate Delta T (outlet - inlet, positive for heating)
  IF v_duct_temp IS NOT NULL AND v_ambient_temp IS NOT NULL THEN
    v_delta_t := v_duct_temp - v_ambient_temp;
  ELSE
    v_delta_t := NULL;
  END IF;
  
  -- Get configs from GENERIC tables (NOT alliance-specific tables!)
  SELECT * INTO v_voltage_config 
  FROM public.machine_voltage_config 
  WHERE machine_id = NEW.machine_id LIMIT 1;
  
  SELECT * INTO v_alert_config 
  FROM public.machine_alert_config 
  WHERE machine_id = NEW.machine_id LIMIT 1;
  
  IF v_voltage_config IS NOT NULL THEN
    v_active_threshold := COALESCE(v_voltage_config.voltage_active_threshold, 6.0);
  END IF;
  
  IF v_alert_config IS NOT NULL THEN
    v_current_min := COALESCE(v_alert_config.current_min_alert, 0.5);
    v_current_max := COALESCE(v_alert_config.current_max_alert, 30.0);
  END IF;
  
  -- ========================================
  -- HEATPUMP LOGIC
  -- ========================================
  -- GPIO5 (voltage_input_5) = Pump relay (shows if pump is on)
  -- Current > 1A = Heating/compressor active
  -- ========================================
  
  v_pump_active := COALESCE(v_voltage_5, 0) >= v_active_threshold;
  v_has_heat := v_current > 1.0;
  
  -- ========================================
  -- COMPRESSOR STATUS CALCULATION
  -- ========================================
  -- Rules:
  -- 1. If pump is off → always "good"
  -- 2. If pump is on AND heat is on:
  --    - Delta T > 2 → "good"
  --    - Current within limits → "good"
  --    - Otherwise wait 5 minutes before showing warning/failed
  -- ========================================
  
  IF NOT v_pump_active THEN
    -- Rule: If pump is off, always show "good"
    v_compressor_status := 'good';
    v_previous_issue_timestamp := NULL;
  ELSIF v_pump_active AND v_has_heat THEN
    -- Pump and heat are both on - evaluate compressor health
    IF v_delta_t IS NOT NULL AND v_delta_t > 2 THEN
      -- Good: Delta T is positive and significant
      v_compressor_status := 'good';
      v_previous_issue_timestamp := NULL;
    ELSIF v_current >= v_current_min AND v_current <= v_current_max THEN
      -- Good: Current is within acceptable range
      v_compressor_status := 'good';
      v_previous_issue_timestamp := NULL;
    ELSE
      -- Potential issue - check for 5-minute delay before showing warning
      SELECT compressor_issue_first_detected_at INTO v_previous_issue_timestamp
      FROM public.alliance 
      WHERE machine_id = NEW.machine_id 
        AND compressor_status IN ('warning', 'failed')
      ORDER BY timestamp DESC LIMIT 1;
      
      IF v_previous_issue_timestamp IS NULL THEN
        -- First detection of issue - start the timer
        v_previous_issue_timestamp := NOW();
        v_compressor_status := 'good';  -- Still showing good during delay
      ELSIF (EXTRACT(EPOCH FROM (NOW() - v_previous_issue_timestamp)) / 60) >= 5 THEN
        -- 5 minutes have passed - show the issue
        IF v_delta_t IS NOT NULL AND v_delta_t < -5 THEN
          v_compressor_status := 'failed';  -- Severe: cooling instead of heating
        ELSE
          v_compressor_status := 'warning';  -- General inefficiency
        END IF;
      ELSE
        -- Still within delay period
        v_compressor_status := 'good';
      END IF;
    END IF;
  ELSE
    -- Pump is on but heat is off (current < 1A) - compressor not running
    v_compressor_status := 'good';
    v_previous_issue_timestamp := NULL;
  END IF;
  
  -- Insert into ALLIANCE table (NOT alliance_calculated!)
  INSERT INTO public.alliance (
    machine_id, timestamp, ambient_temp, duct_temp, motor_temp, delta_t,
    voltage, current, power, voltage_5,
    fan_active, pump_active, is_heating, is_on, is_connected, has_water,
    overall_status, motor_status, heating_status, compressor_status,
    compressor_issue_first_detected_at, status_details
  ) VALUES (
    NEW.machine_id,
    COALESCE(NEW.timestamp, NEW.created_at, NOW()),
    v_ambient_temp, v_duct_temp, v_motor_temp, v_delta_t,
    v_voltage, v_current, v_power, v_voltage_5,
    false,  -- fan_active: heatpumps typically don't have separate fan status
    v_pump_active,  -- pump_active: GPIO5 relay status
    v_has_heat,  -- is_heating: current > 1A
    v_pump_active,  -- is_on: pump relay is active
    true,  -- is_connected: assumed true if receiving data
    v_pump_active,  -- has_water: repurposed as pump status for frontend
    'operational',  -- overall_status
    'normal',  -- motor_status
    CASE WHEN v_pump_active AND v_has_heat THEN 'active' ELSE 'idle' END,  -- heating_status
    v_compressor_status,
    v_previous_issue_timestamp,
    jsonb_build_object(
      'pump_active', v_pump_active, 
      'has_heat', v_has_heat, 
      'compressor_status', v_compressor_status,
      'current', v_current,
      'delta_t', v_delta_t
    )
  )
  ON CONFLICT (machine_id, timestamp) DO UPDATE SET
    ambient_temp = EXCLUDED.ambient_temp, 
    duct_temp = EXCLUDED.duct_temp, 
    motor_temp = EXCLUDED.motor_temp,
    delta_t = EXCLUDED.delta_t, 
    voltage = EXCLUDED.voltage, 
    current = EXCLUDED.current, 
    power = EXCLUDED.power,
    voltage_5 = EXCLUDED.voltage_5,
    fan_active = EXCLUDED.fan_active,
    pump_active = EXCLUDED.pump_active, 
    is_heating = EXCLUDED.is_heating, 
    is_on = EXCLUDED.is_on,
    has_water = EXCLUDED.has_water, 
    heating_status = EXCLUDED.heating_status,
    compressor_status = EXCLUDED.compressor_status, 
    compressor_issue_first_detected_at = EXCLUDED.compressor_issue_first_detected_at,
    status_details = EXCLUDED.status_details, 
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error processing alliance reading for machine %: %', NEW.machine_id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_process_alliance_reading
  AFTER INSERT ON public.readings_raw
  FOR EACH ROW
  EXECUTE FUNCTION public.process_alliance_reading();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.process_alliance_reading() TO authenticated, service_role;

-- ========================================
-- STEP 5: ENSURE ALL TRIGGERS ARE ENABLED
-- ========================================

ALTER TABLE public.readings_raw ENABLE TRIGGER trigger_process_cirrus_reading;
ALTER TABLE public.readings_raw ENABLE TRIGGER trigger_process_coolbreeze_reading;
ALTER TABLE public.readings_raw ENABLE TRIGGER trigger_process_alliance_reading;

-- ========================================
-- STEP 6: VERIFY TRIGGERS ARE WORKING
-- ========================================

-- This query will show you the current state of triggers
-- Run this after applying the migration to verify:
/*
SELECT 
  tgname AS trigger_name,
  tgenabled AS enabled,
  CASE tgenabled 
    WHEN 'O' THEN 'ENABLED (Origin)'
    WHEN 'D' THEN 'DISABLED'
    WHEN 'R' THEN 'ENABLED (Replica)'
    WHEN 'A' THEN 'ENABLED (Always)'
    ELSE 'UNKNOWN'
  END AS status
FROM pg_trigger 
WHERE tgrelid = 'public.readings_raw'::regclass
  AND tgname LIKE 'trigger_process_%';
*/

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- 
-- Summary of changes:
-- ✅ Dropped all old triggers and functions
-- ✅ Created new process_cirrus_reading() - uses machine_voltage_config
-- ✅ Created new process_coolbreeze_reading() - uses machine_voltage_config
-- ✅ Created new process_alliance_reading() - uses machine_voltage_config AND machine_alert_config
-- ✅ Alliance now inserts into 'alliance' table (NOT alliance_calculated)
-- ✅ All triggers enabled on readings_raw table
--
-- Data Flow:
-- ESP32 → readings_raw → trigger (checks manufacturer) → cirrus/coolbreeze/alliance
--
-- To test:
-- 1. Insert a test reading into readings_raw for a Cirrus machine
-- 2. Check if data appears in the cirrus table
-- 3. Repeat for CoolBreeze and Alliance
-- ========================================

SELECT 'Unified trigger migration complete! All triggers recreated and enabled.' AS status;

