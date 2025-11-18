-- CoolBreeze Data Processor Function and Trigger
-- Automatically processes readings_raw data into CoolBreeze table
-- Only processes data for HVAC machines (CoolBreeze units)

-- Function to calculate CoolBreeze-specific status
CREATE OR REPLACE FUNCTION public.calculate_coolbreeze_status(
  p_machine_id UUID,
  p_ambient_temp NUMERIC,
  p_duct_temp NUMERIC,
  p_motor_temp NUMERIC,
  p_has_water BOOLEAN,
  p_fan_active BOOLEAN,
  p_pump_active BOOLEAN,
  p_voltage NUMERIC,
  p_current NUMERIC,
  p_exhaust_status TEXT,
  p_fan_status TEXT,
  p_pump_status TEXT
) RETURNS JSONB AS $$
DECLARE
  v_overall_status TEXT := 'unknown';
  v_motor_status TEXT := 'normal';
  v_water_status TEXT := 'ok';
  v_cooling_status TEXT := 'idle';
  v_status_details JSONB := '{}'::JSONB;
  v_delta_t NUMERIC;
  v_alert_config RECORD;
BEGIN
  -- Get alert configuration for this machine
  SELECT * INTO v_alert_config FROM public.machine_alert_config WHERE machine_id = p_machine_id;
  
  -- Set defaults if no config found
  IF v_alert_config IS NULL THEN
    v_alert_config.motor_temp_warning := 60.0;
    v_alert_config.motor_temp_critical := 70.0;
    v_alert_config.delta_t_min_cooling := 3.0;
    v_alert_config.motor_amps_warning := 12.0;
  END IF;
  
  -- Calculate Delta T
  v_delta_t := COALESCE(p_ambient_temp, 0) - COALESCE(p_duct_temp, 0);
  
  -- Determine water status
  IF NOT p_has_water THEN
    v_water_status := 'empty';
  ELSE
    v_water_status := 'ok';
  END IF;
  
  -- Determine motor status
  IF p_motor_temp IS NOT NULL THEN
    IF p_motor_temp >= v_alert_config.motor_temp_critical THEN
      v_motor_status := 'critical';
    ELSIF p_motor_temp >= v_alert_config.motor_temp_warning THEN
      v_motor_status := 'warning';
    ELSE
      v_motor_status := 'normal';
    END IF;
  END IF;
  
  -- Determine cooling status
  IF p_fan_active AND p_pump_active THEN
    IF v_delta_t >= v_alert_config.delta_t_min_cooling THEN
      v_cooling_status := 'active';
    ELSE
      v_cooling_status := 'inefficient';
    END IF;
  ELSE
    v_cooling_status := 'idle';
  END IF;
  
  -- Determine overall status
  IF v_motor_status = 'critical' OR (p_fan_status = 'ON' AND p_current < 0.5) OR (p_pump_status = 'ON' AND NOT p_has_water) THEN
    v_overall_status := 'error';
  ELSIF v_motor_status = 'warning' OR v_cooling_status = 'inefficient' OR 
        p_exhaust_status = 'DISCONNECTED' OR p_fan_status = 'DISCONNECTED' OR p_pump_status = 'DISCONNECTED' THEN
    v_overall_status := 'warning';
  ELSIF p_fan_active OR p_pump_active THEN
    v_overall_status := 'operational';
  ELSE
    v_overall_status := 'unknown';
  END IF;
  
  -- Build status details
  v_status_details := jsonb_build_object(
    'delta_t', v_delta_t,
    'motor_temp_within_parameters', CASE WHEN p_motor_temp IS NULL THEN NULL WHEN p_motor_temp < v_alert_config.motor_temp_critical THEN true ELSE false END,
    'current_within_parameters', CASE WHEN p_current IS NULL THEN NULL WHEN p_current < v_alert_config.motor_amps_warning THEN true ELSE false END,
    'voltage_within_parameters', CASE WHEN p_voltage IS NULL THEN NULL WHEN p_voltage >= 200 AND p_voltage <= 250 THEN true ELSE false END,
    'power_within_parameters', CASE WHEN p_voltage IS NULL OR p_current IS NULL THEN NULL WHEN (p_voltage * p_current) < (v_alert_config.motor_amps_warning * 230) THEN true ELSE false END,
    'operational_mode', CASE WHEN p_fan_active AND p_pump_active THEN 'full_cooling' WHEN p_fan_active THEN 'fan_only' WHEN p_pump_active THEN 'pump_only' ELSE 'standby' END
  );
  
  RETURN jsonb_build_object(
    'overall_status', v_overall_status,
    'motor_status', v_motor_status,
    'water_status', v_water_status,
    'cooling_status', v_cooling_status,
    'status_details', v_status_details
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Main function to process readings_raw into CoolBreeze table
-- SECURITY DEFINER allows function to bypass RLS when reading from machines table
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
  -- Note: HVAC machines might be type 'airconditioner' or 'heatpump', or manufacturer 'CoolBreeze'
  IF v_machine_type NOT IN ('airconditioner', 'heatpump') AND v_machine_manufacturer != 'CoolBreeze' THEN
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
  
  -- Extract RAW temperature values
  v_ambient_temp := NEW.outside_temp;
  v_duct_temp := NEW.inside_temp;
  v_motor_temp := NEW.motor_temp;
  
  -- Extract RAW water status
  v_has_water := NEW.has_water;
  
  -- Extract RAW electrical values
  v_current := NEW.current;
  v_voltage := NEW.voltage;
  v_power := COALESCE(NEW.power, (NEW.voltage * COALESCE(NEW.current, 0)));
  
  -- Calculate Delta T (ambient - duct)
  v_delta_t := ABS(v_ambient_temp - v_duct_temp);
  
  -- Extract pickup voltages (CoolBreeze uses exhaust_voltage, fan_voltage, pump_voltage, drain_voltage)
  -- These come from readings_raw as voltage_input_1-4, but we need to map them based on machine config
  -- For now, we'll use voltage_input_1-4 directly and map them in the processor
  -- The edge function should map exhaust_voltage/fan_voltage/etc. to voltage_input_1-4
  
  -- For CoolBreeze, we need to check if the data came with named fields or numbered fields
  -- If named fields exist in readings_raw (we'll add them), use those
  -- Otherwise, use voltage_input_1-4 and map based on machine_voltage_config
  
  -- For now, assume voltage_input_1 = exhaust, voltage_input_2 = fan, voltage_input_3 = pump, voltage_input_4 = drain
  -- This mapping should be configured per machine in machine_voltage_config
  v_exhaust_voltage := NEW.voltage_input_1;
  v_fan_voltage := NEW.voltage_input_2;
  v_pump_voltage := NEW.voltage_input_3;
  v_drain_voltage := NEW.voltage_input_4;
  
  -- Determine pickup statuses from voltages (CoolBreeze uses inverted/higher voltage logic)
  -- Voltage thresholds: < 0.5V = DISCONNECTED, 0.8-2.632V = ON, > 2.807V = OFF
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
  
  -- Calculate fan speed from fan_voltage (if fan is ON)
  -- Fan speed: 100% at 1.053V, 0% at 2.035V
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
    (v_fan_active AND v_pump_active), -- is_cooling
    (v_fan_active OR v_pump_active), -- is_on
    true, -- is_connected (we just received data, so it's connected)
    v_has_water, CASE WHEN v_has_water THEN 100.0 ELSE 0.0 END, -- water_level
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
    v_has_water -- water_within_parameters
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

-- Create trigger to automatically process readings_raw into CoolBreeze
CREATE TRIGGER trigger_process_coolbreeze_reading
  AFTER INSERT ON public.readings_raw
  FOR EACH ROW
  EXECUTE FUNCTION public.process_coolbreeze_reading();

COMMENT ON FUNCTION public.calculate_coolbreeze_status IS 'Calculates CoolBreeze-specific status based on sensor readings';
COMMENT ON FUNCTION public.process_coolbreeze_reading IS 'Automatically processes readings_raw entries into CoolBreeze table for HVAC machines';


