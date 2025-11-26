-- CIRRUS Data Processor Function and Trigger
-- Automatically processes readings_raw data into CIRRUS table
-- Only processes data for evaporative cooler machines (Cirrus units)

-- Function to calculate Cirrus-specific status
-- Uses machine_alert_config for thresholds
CREATE OR REPLACE FUNCTION public.calculate_cirrus_status(
  p_machine_id UUID,
  p_ambient_temp NUMERIC,
  p_duct_temp NUMERIC,
  p_motor_temp NUMERIC,
  p_has_water BOOLEAN,
  p_fan_active BOOLEAN,
  p_pump_active BOOLEAN,
  p_voltage NUMERIC,
  p_current NUMERIC
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
  -- Get machine alert configuration (thresholds)
  SELECT * INTO v_alert_config
  FROM public.machine_alert_config
  WHERE machine_id = p_machine_id;
  
  -- Use defaults if no config exists
  IF v_alert_config IS NULL THEN
    v_alert_config.motor_temp_warning := 60.0;
    v_alert_config.motor_temp_critical := 70.0;
    v_alert_config.motor_amps_warning := 15.0;
    v_alert_config.delta_t_min_cooling := 2.0;
  END IF;
  
  -- Calculate delta T
  v_delta_t := COALESCE(p_ambient_temp, 0) - COALESCE(p_duct_temp, 0);
  
  -- Determine water status (based on has_water boolean)
  IF NOT p_has_water THEN
    v_water_status := 'empty';
  ELSE
    v_water_status := 'ok';
  END IF;
  
  -- Determine motor status (using machine thresholds)
  IF p_motor_temp IS NOT NULL THEN
    IF p_motor_temp >= v_alert_config.motor_temp_critical THEN
      v_motor_status := 'critical';
    ELSIF p_motor_temp >= v_alert_config.motor_temp_warning THEN
      v_motor_status := 'warning';
    ELSE
      v_motor_status := 'normal';
    END IF;
  END IF;
  
  -- Determine cooling status (using machine threshold)
  IF p_fan_active AND p_pump_active THEN
    IF v_delta_t >= v_alert_config.delta_t_min_cooling THEN
      v_cooling_status := 'active';
    ELSE
      v_cooling_status := 'inefficient';
    END IF;
  ELSIF p_fan_active OR p_pump_active THEN
    v_cooling_status := 'idle';
  ELSE
    v_cooling_status := 'idle';
  END IF;
  
  -- Check current within parameters (using machine threshold)
  -- Note: Current thresholds are in machine_alert_config.motor_amps_warning
  
  -- Determine overall status
  IF v_water_status = 'empty' THEN
    v_overall_status := 'error';
  ELSIF v_motor_status = 'critical' THEN
    v_overall_status := 'error';
  ELSIF p_current IS NOT NULL AND p_current >= v_alert_config.motor_amps_warning THEN
    v_overall_status := 'warning'; -- High current
  ELSIF v_water_status = 'low' OR v_motor_status = 'warning' OR v_cooling_status = 'inefficient' THEN
    v_overall_status := 'warning';
  ELSIF p_fan_active OR p_pump_active THEN
    v_overall_status := 'operational';
  ELSE
    v_overall_status := 'offline';
  END IF;
  
  -- Build status details JSON (includes parameter checks)
  v_status_details := jsonb_build_object(
    'delta_t', v_delta_t,
    'cooling_efficiency', CASE 
      WHEN v_delta_t > 5 THEN 'excellent'
      WHEN v_delta_t > 3 THEN 'good'
      WHEN v_delta_t > 1 THEN 'fair'
      ELSE 'poor'
    END,
    'motor_temp_category', CASE
      WHEN p_motor_temp >= v_alert_config.motor_temp_critical THEN 'critical'
      WHEN p_motor_temp >= v_alert_config.motor_temp_warning THEN 'warning'
      WHEN p_motor_temp > 50 THEN 'normal'
      ELSE 'cold'
    END,
    'motor_temp_within_parameters', CASE
      WHEN p_motor_temp IS NULL THEN NULL
      WHEN p_motor_temp < v_alert_config.motor_temp_critical THEN true
      ELSE false
    END,
    'current_within_parameters', CASE
      WHEN p_current IS NULL THEN NULL
      WHEN p_current < v_alert_config.motor_amps_warning THEN true
      ELSE false
    END,
    'voltage_within_parameters', CASE
      WHEN p_voltage IS NULL THEN NULL
      WHEN p_voltage >= 200 AND p_voltage <= 250 THEN true -- Standard voltage range
      ELSE false
    END,
    'power_within_parameters', CASE
      WHEN p_voltage IS NULL OR p_current IS NULL THEN NULL
      WHEN (p_voltage * p_current) < (v_alert_config.motor_amps_warning * 230) THEN true -- Rough estimate
      ELSE false
    END,
    'operational_mode', CASE
      WHEN p_fan_active AND p_pump_active THEN 'full_cooling'
      WHEN p_fan_active THEN 'fan_only'
      WHEN p_pump_active THEN 'pump_only'
      ELSE 'standby'
    END
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

-- Main function to process readings_raw into CIRRUS table
-- SECURITY DEFINER allows function to bypass RLS when reading from machines table
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
  -- DS18B20 returns -127°C on communication error, -999°C on invalid reading
  -- Reject out-of-range values that indicate sensor issues
  IF NEW.motor_temp IS NOT NULL AND (NEW.motor_temp = -127.0 OR NEW.motor_temp = -999.0 OR NEW.motor_temp < -50.0 OR NEW.motor_temp > 120.0) THEN
    RAISE WARNING 'Invalid motor temperature reading: % for machine %', NEW.motor_temp, NEW.machine_id;
    DELETE FROM public.readings_raw WHERE id = NEW.id;
    RETURN NEW; -- Skip processing invalid data
  END IF;
  
  IF NEW.outside_temp IS NOT NULL AND (NEW.outside_temp = -127.0 OR NEW.outside_temp = -999.0 OR NEW.outside_temp < -50.0 OR NEW.outside_temp > 120.0) THEN
    RAISE WARNING 'Invalid outside temperature reading: % for machine %', NEW.outside_temp, NEW.machine_id;
    DELETE FROM public.readings_raw WHERE id = NEW.id;
    RETURN NEW; -- Skip processing invalid data
  END IF;
  
  IF NEW.inside_temp IS NOT NULL AND (NEW.inside_temp = -127.0 OR NEW.inside_temp = -999.0 OR NEW.inside_temp < -50.0 OR NEW.inside_temp > 120.0) THEN
    RAISE WARNING 'Invalid inside temperature reading: % for machine %', NEW.inside_temp, NEW.machine_id;
    DELETE FROM public.readings_raw WHERE id = NEW.id;
    RETURN NEW; -- Skip processing invalid data
  END IF;
  
  -- Get voltage input configuration for this machine
  SELECT * INTO v_voltage_config
  FROM public.machine_voltage_config
  WHERE machine_id = NEW.machine_id;
  
  -- If no config exists, use defaults
  IF v_voltage_config IS NULL THEN
    v_voltage_config.voltage_input_1_function := 'fan';
    v_voltage_config.voltage_input_2_function := 'pump';
    v_voltage_config.voltage_input_3_function := 'drain';
    v_voltage_config.voltage_input_4_function := 'exhaust';
    v_voltage_config.voltage_active_threshold := 6.0;
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
  
  -- Map voltage inputs to functions based on machine configuration
  -- Determine which inputs are active based on voltage threshold
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
  
  -- Calculate status using machine alert config thresholds
  v_status_calc := public.calculate_cirrus_status(
    NEW.machine_id, -- Pass machine_id to get thresholds
    v_ambient_temp,
    v_duct_temp,
    v_motor_temp,
    v_has_water,
    v_fan_active,
    v_pump_active,
    v_voltage,
    v_current
  );
  
  -- Connection status: Since we just received data, machine is connected
  -- This will be recalculated when querying (last reading within 10 minutes = connected)
  -- For this record, is_connected = true since we just received it
  
  -- Insert into CIRRUS table (use ON CONFLICT to handle duplicates)
  INSERT INTO public.cirrus (
    machine_id,
    timestamp,
    ambient_temp,
    duct_temp,
    motor_temp,
    delta_t,
    fan_active,
    pump_active,
    drain_active,
    exhaust_active,
    is_cooling,
    is_on,
    is_connected,
    has_water,
    voltage,
    current,
    power,
    overall_status,
    motor_status,
    water_status,
    cooling_status,
    status_details,
    motor_temp_within_parameters,
    current_within_parameters,
    voltage_within_parameters,
    power_within_parameters,
    water_within_parameters
  ) VALUES (
    NEW.machine_id,
    NEW.created_at,
    v_ambient_temp,
    v_duct_temp,
    v_motor_temp,
    v_delta_t,
    v_fan_active,
    v_pump_active,
    v_drain_active,
    v_exhaust_active,
    (v_pump_active OR v_drain_active), -- is_cooling
    v_pump_active, -- is_on (pump indicates system is on)
    true, -- is_connected (we just received data, so it's connected)
    v_has_water,
    v_voltage,
    v_current,
    v_power,
    (v_status_calc->>'overall_status')::TEXT,
    (v_status_calc->>'motor_status')::TEXT,
    (v_status_calc->>'water_status')::TEXT,
    (v_status_calc->>'cooling_status')::TEXT,
    v_status_calc->'status_details',
    (v_status_calc->'status_details'->>'motor_temp_within_parameters')::BOOLEAN,
    (v_status_calc->'status_details'->>'current_within_parameters')::BOOLEAN,
    (v_status_calc->'status_details'->>'voltage_within_parameters')::BOOLEAN,
    (v_status_calc->'status_details'->>'power_within_parameters')::BOOLEAN,
    v_has_water -- water_within_parameters (true if has_water)
  )
  ON CONFLICT (machine_id, timestamp) 
  DO UPDATE SET
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

-- Create trigger to automatically process readings_raw into CIRRUS
CREATE TRIGGER trigger_process_cirrus_reading
  AFTER INSERT ON public.readings_raw
  FOR EACH ROW
  EXECUTE FUNCTION public.process_cirrus_reading();

-- Comment on function
COMMENT ON FUNCTION public.calculate_cirrus_status IS 'Calculates Cirrus-specific status based on sensor readings';
COMMENT ON FUNCTION public.process_cirrus_reading IS 'Automatically processes readings_raw entries into CIRRUS table for evaporative cooler machines';

