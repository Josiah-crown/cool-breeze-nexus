-- ========================================
-- PROCESSING FUNCTIONS
-- ========================================
-- Triggers that process readings_raw into manufacturer-specific tables
-- All use generic machine_voltage_config and machine_alert_config tables
-- ========================================

-- ========================================
-- 1. CIRRUS PROCESSING FUNCTION
-- ========================================

DROP TRIGGER IF EXISTS trigger_process_cirrus_reading ON public.readings_raw;
DROP FUNCTION IF EXISTS public.process_cirrus_reading() CASCADE;

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
    fan_active = EXCLUDED.fan_active, pump_active = EXCLUDED.pump_active, drain_active = EXCLUDED.drain_active,
    exhaust_active = EXCLUDED.exhaust_active, is_cooling = EXCLUDED.is_cooling, is_on = EXCLUDED.is_on,
    has_water = EXCLUDED.has_water, status_details = EXCLUDED.status_details, updated_at = NOW();
  
  -- Update machines table status
  UPDATE public.machines SET
    is_on = (v_fan_active OR v_pump_active OR v_drain_active OR v_exhaust_active),
    is_connected = true,
    has_water = v_has_water,
    is_cooling = (v_fan_active AND v_pump_active),
    fan_active = v_fan_active,
    motor_temp = COALESCE(v_motor_temp, 0),
    outside_temp = COALESCE(v_ambient_temp, 0),
    inside_temp = COALESCE(v_duct_temp, 0),
    delta_t = COALESCE(v_delta_t, 0),
    current = COALESCE(v_current, 0),
    voltage = COALESCE(v_voltage, 0),
    power = COALESCE(v_power, 0),
    overall_status = 'operational',
    motor_status = 'normal',
    updated_at = NOW()
  WHERE id = NEW.machine_id;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error processing cirrus: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_process_cirrus_reading
  AFTER INSERT ON public.readings_raw
  FOR EACH ROW
  EXECUTE FUNCTION public.process_cirrus_reading();

GRANT EXECUTE ON FUNCTION public.process_cirrus_reading() TO authenticated, service_role;

-- ========================================
-- 2. COOLBREEZE PROCESSING FUNCTION
-- ========================================

DROP TRIGGER IF EXISTS trigger_process_coolbreeze_reading ON public.readings_raw;
DROP FUNCTION IF EXISTS public.process_coolbreeze_reading() CASCADE;

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
    fan_active = EXCLUDED.fan_active, pump_active = EXCLUDED.pump_active, drain_active = EXCLUDED.drain_active,
    exhaust_active = EXCLUDED.exhaust_active, is_cooling = EXCLUDED.is_cooling, is_on = EXCLUDED.is_on,
    has_water = EXCLUDED.has_water, water_level = EXCLUDED.water_level, status_details = EXCLUDED.status_details, updated_at = NOW();
  
  -- Update machines table status
  UPDATE public.machines SET
    is_on = (v_fan_active OR v_pump_active OR v_drain_active OR v_exhaust_active),
    is_connected = true,
    has_water = v_has_water,
    is_cooling = (v_fan_active AND v_pump_active),
    fan_active = v_fan_active,
    motor_temp = COALESCE(v_motor_temp, 0),
    outside_temp = COALESCE(v_ambient_temp, 0),
    inside_temp = COALESCE(v_duct_temp, 0),
    delta_t = COALESCE(v_delta_t, 0),
    current = COALESCE(v_current, 0),
    voltage = COALESCE(v_voltage, 0),
    power = COALESCE(v_power, 0),
    overall_status = 'operational',
    motor_status = 'normal',
    updated_at = NOW()
  WHERE id = NEW.machine_id;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error processing coolbreeze: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_process_coolbreeze_reading
  AFTER INSERT ON public.readings_raw
  FOR EACH ROW
  EXECUTE FUNCTION public.process_coolbreeze_reading();

GRANT EXECUTE ON FUNCTION public.process_coolbreeze_reading() TO authenticated, service_role;

-- ========================================
-- 3. ALLIANCE HEATPUMP PROCESSING FUNCTION
-- ========================================

DROP TRIGGER IF EXISTS trigger_process_alliance_reading ON public.readings_raw;
DROP FUNCTION IF EXISTS public.process_alliance_reading() CASCADE;

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
  v_motor_temp := NEW.motor_temp;
  v_current := COALESCE(NEW.current, 0);
  v_voltage := NEW.voltage;
  v_power := COALESCE((NEW.voltage * COALESCE(NEW.current, 0)), 0);
  v_voltage_5 := NEW.voltage_input_5;
  
  -- Calculate Delta T
  IF v_duct_temp IS NOT NULL AND v_ambient_temp IS NOT NULL THEN
    v_delta_t := v_duct_temp - v_ambient_temp;
  END IF;
  
  -- Get configs from GENERIC tables
  SELECT * INTO v_voltage_config FROM public.machine_voltage_config WHERE machine_id = NEW.machine_id LIMIT 1;
  SELECT * INTO v_alert_config FROM public.machine_alert_config WHERE machine_id = NEW.machine_id LIMIT 1;
  
  IF v_voltage_config IS NOT NULL THEN
    v_active_threshold := COALESCE(v_voltage_config.voltage_active_threshold, 6.0);
  END IF;
  
  IF v_alert_config IS NOT NULL THEN
    v_current_min := COALESCE(v_alert_config.current_min_alert, 0.5);
    v_current_max := COALESCE(v_alert_config.current_max_alert, 30.0);
  END IF;
  
  -- HEATPUMP LOGIC:
  -- GPIO5 (voltage_input_5) = Pump relay
  -- Current > 1A = Heating active
  v_pump_active := COALESCE(v_voltage_5, 0) >= v_active_threshold;
  v_has_heat := v_current > 1.0;
  
  -- Compressor status calculation
  IF NOT v_pump_active THEN
    v_compressor_status := 'good';
  ELSIF v_pump_active AND v_has_heat THEN
    IF v_delta_t IS NOT NULL AND v_delta_t > 2 THEN
      v_compressor_status := 'good';
    ELSIF v_current >= v_current_min AND v_current <= v_current_max THEN
      v_compressor_status := 'good';
    ELSE
      -- Check for 5-minute delay
      SELECT compressor_issue_first_detected_at INTO v_previous_issue_timestamp
      FROM public.alliance WHERE machine_id = NEW.machine_id AND compressor_status IN ('warning', 'failed')
      ORDER BY timestamp DESC LIMIT 1;
      
      IF v_previous_issue_timestamp IS NULL THEN
        v_previous_issue_timestamp := NOW();
        v_compressor_status := 'good';
      ELSIF (EXTRACT(EPOCH FROM (NOW() - v_previous_issue_timestamp)) / 60) >= 5 THEN
        v_compressor_status := CASE WHEN v_delta_t < -5 THEN 'failed' ELSE 'warning' END;
      ELSE
        v_compressor_status := 'good';
      END IF;
    END IF;
  ELSE
    v_compressor_status := 'good';
  END IF;
  
  -- Insert into alliance table
  INSERT INTO public.alliance (
    machine_id, timestamp, ambient_temp, duct_temp, motor_temp, delta_t,
    voltage, current, power, voltage_5,
    pump_active, is_heating, is_on, is_connected, has_water,
    overall_status, motor_status, heating_status, compressor_status,
    compressor_issue_first_detected_at, status_details
  ) VALUES (
    NEW.machine_id,
    COALESCE(NEW.timestamp, NEW.created_at, NOW()),
    v_ambient_temp, v_duct_temp, v_motor_temp, v_delta_t,
    v_voltage, v_current, v_power, v_voltage_5,
    v_pump_active, v_has_heat, v_pump_active, true, v_pump_active,
    'operational', 'normal',
    CASE WHEN v_pump_active AND v_has_heat THEN 'active' ELSE 'idle' END,
    v_compressor_status, v_previous_issue_timestamp,
    jsonb_build_object('pump_active', v_pump_active, 'has_heat', v_has_heat, 'compressor_status', v_compressor_status)
  )
  ON CONFLICT (machine_id, timestamp) DO UPDATE SET
    ambient_temp = EXCLUDED.ambient_temp, duct_temp = EXCLUDED.duct_temp, motor_temp = EXCLUDED.motor_temp,
    delta_t = EXCLUDED.delta_t, voltage = EXCLUDED.voltage, current = EXCLUDED.current, power = EXCLUDED.power,
    pump_active = EXCLUDED.pump_active, is_heating = EXCLUDED.is_heating, is_on = EXCLUDED.is_on,
    has_water = EXCLUDED.has_water, heating_status = EXCLUDED.heating_status,
    compressor_status = EXCLUDED.compressor_status, compressor_issue_first_detected_at = EXCLUDED.compressor_issue_first_detected_at,
    status_details = EXCLUDED.status_details, updated_at = NOW();
  
  -- Update machines table status
  UPDATE public.machines SET
    is_on = v_pump_active,
    is_connected = true,
    has_water = v_pump_active,  -- Repurposed as pump status
    has_heat = v_has_heat,
    has_pump = v_pump_active,
    motor_temp = COALESCE(v_motor_temp, 0),
    outside_temp = COALESCE(v_ambient_temp, 0),
    inside_temp = COALESCE(v_duct_temp, 0),
    delta_t = COALESCE(v_delta_t, 0),
    current = COALESCE(v_current, 0),
    voltage = COALESCE(v_voltage, 0),
    power = COALESCE(v_power, 0),
    overall_status = 'operational',
    motor_status = 'normal',
    updated_at = NOW()
  WHERE id = NEW.machine_id;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error processing alliance: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_process_alliance_reading
  AFTER INSERT ON public.readings_raw
  FOR EACH ROW
  EXECUTE FUNCTION public.process_alliance_reading();

GRANT EXECUTE ON FUNCTION public.process_alliance_reading() TO authenticated, service_role;

-- ========================================
-- END OF PROCESSING FUNCTIONS
-- ========================================
-- 
-- Data Flow:
-- ESP32 → readings_raw → triggers → cirrus/coolbreeze/alliance → machines table
-- 
-- Each trigger:
-- 1. Checks manufacturer
-- 2. Reads from generic machine_voltage_config
-- 3. Reads from generic machine_alert_config
-- 4. Processes data
-- 5. Inserts into manufacturer table
-- 6. Updates machines table status
-- ========================================

