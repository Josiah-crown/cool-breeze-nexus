-- ========================================
-- CREATE ALLIANCE PROCESSING TRIGGER
-- ========================================
-- Purpose: Automatically process alliance_raw → alliance (calculated) data
-- Date: 2025-11-25
-- Usage: Run this in Supabase SQL Editor after creating alliance tables
-- ========================================

-- Function to process alliance_raw readings into alliance (calculated) table
CREATE OR REPLACE FUNCTION public.process_alliance_reading()
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
  v_is_cooling BOOLEAN := false;
  v_is_heating BOOLEAN := false;
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
  v_active_threshold NUMERIC := 6.0;
BEGIN
  -- Check if this machine is an Alliance heat pump
  SELECT m.type, COALESCE(m.manufacturer, '') INTO v_machine_type, v_machine_manufacturer
  FROM public.machines m
  WHERE m.id = NEW.machine_id;
  
  -- Only process if it's an Alliance heat pump
  IF v_machine_type != 'heatpump' OR v_machine_manufacturer != 'Alliance' THEN
    RETURN NEW; -- Skip processing, but allow the insert to continue
  END IF;
  
  -- VALIDATE TEMPERATURE READINGS (reject electrical interference errors)
  IF NEW.motor_temp IS NOT NULL AND (NEW.motor_temp = -127.0 OR NEW.motor_temp = -999.0 OR NEW.motor_temp < -50.0 OR NEW.motor_temp > 120.0) THEN
    RAISE WARNING 'Invalid motor temperature reading: % for machine %', NEW.motor_temp, NEW.machine_id;
    DELETE FROM public.alliance_raw WHERE id = NEW.id;
    RETURN NEW;
  END IF;
  
  IF NEW.outside_temp IS NOT NULL AND (NEW.outside_temp = -127.0 OR NEW.outside_temp = -999.0 OR NEW.outside_temp < -50.0 OR NEW.outside_temp > 120.0) THEN
    RAISE WARNING 'Invalid outside temperature reading: % for machine %', NEW.outside_temp, NEW.machine_id;
    DELETE FROM public.alliance_raw WHERE id = NEW.id;
    RETURN NEW;
  END IF;
  
  IF NEW.inside_temp IS NOT NULL AND (NEW.inside_temp = -127.0 OR NEW.inside_temp = -999.0 OR NEW.inside_temp < -50.0 OR NEW.inside_temp > 120.0) THEN
    RAISE WARNING 'Invalid inside temperature reading: % for machine %', NEW.inside_temp, NEW.machine_id;
    DELETE FROM public.alliance_raw WHERE id = NEW.id;
    RETURN NEW;
  END IF;
  
  -- Extract RAW temperature values
  v_ambient_temp := NEW.outside_temp;
  v_duct_temp := NEW.inside_temp;
  v_motor_temp := NEW.motor_temp;
  
  -- Extract RAW water status
  v_has_water := COALESCE(NEW.has_water, true);
  
  -- Extract RAW electrical values
  v_current := NEW.current;
  v_voltage := NEW.voltage;
  v_power := COALESCE((NEW.voltage * COALESCE(NEW.current, 0)), 0);
  
  -- Calculate Delta T (ambient - duct)
  IF v_ambient_temp IS NOT NULL AND v_duct_temp IS NOT NULL THEN
    v_delta_t := ABS(v_ambient_temp - v_duct_temp);
  ELSE
    v_delta_t := NULL;
  END IF;
  
  -- Get voltage configuration for this machine (if exists)
  SELECT * INTO v_voltage_config
  FROM public.alliance_voltage_config
  WHERE machine_id = NEW.machine_id
  LIMIT 1;
  
  -- Get active threshold from config or use default
  IF v_voltage_config IS NOT NULL THEN
    v_active_threshold := COALESCE(v_voltage_config.voltage_active_threshold, 6.0);
  END IF;
  
  -- Map voltage inputs to voltage_1 through voltage_6 based on config
  -- If no config exists, use direct mapping (voltage_input_1 → voltage_1, etc.)
  IF v_voltage_config IS NOT NULL THEN
    -- Map based on voltage_config
    v_voltage_1 := CASE 
      WHEN v_voltage_config.voltage_input_1_function = 'Custom_1' THEN NEW.voltage_input_1
      WHEN v_voltage_config.voltage_input_2_function = 'Custom_1' THEN NEW.voltage_input_2
      WHEN v_voltage_config.voltage_input_3_function = 'Custom_1' THEN NEW.voltage_input_3
      WHEN v_voltage_config.voltage_input_4_function = 'Custom_1' THEN NEW.voltage_input_4
      WHEN v_voltage_config.voltage_input_5_function = 'Custom_1' THEN NEW.voltage_input_5
      WHEN v_voltage_config.voltage_input_6_function = 'Custom_1' THEN NEW.voltage_input_6
      ELSE NULL
    END;
    
    v_voltage_2 := CASE 
      WHEN v_voltage_config.voltage_input_1_function = 'Custom_2' THEN NEW.voltage_input_1
      WHEN v_voltage_config.voltage_input_2_function = 'Custom_2' THEN NEW.voltage_input_2
      WHEN v_voltage_config.voltage_input_3_function = 'Custom_2' THEN NEW.voltage_input_3
      WHEN v_voltage_config.voltage_input_4_function = 'Custom_2' THEN NEW.voltage_input_4
      WHEN v_voltage_config.voltage_input_5_function = 'Custom_2' THEN NEW.voltage_input_5
      WHEN v_voltage_config.voltage_input_6_function = 'Custom_2' THEN NEW.voltage_input_6
      ELSE NULL
    END;
    
    v_voltage_3 := CASE 
      WHEN v_voltage_config.voltage_input_1_function = 'Custom_3' THEN NEW.voltage_input_1
      WHEN v_voltage_config.voltage_input_2_function = 'Custom_3' THEN NEW.voltage_input_2
      WHEN v_voltage_config.voltage_input_3_function = 'Custom_3' THEN NEW.voltage_input_3
      WHEN v_voltage_config.voltage_input_4_function = 'Custom_3' THEN NEW.voltage_input_4
      WHEN v_voltage_config.voltage_input_5_function = 'Custom_3' THEN NEW.voltage_input_5
      WHEN v_voltage_config.voltage_input_6_function = 'Custom_3' THEN NEW.voltage_input_6
      ELSE NULL
    END;
    
    v_voltage_4 := CASE 
      WHEN v_voltage_config.voltage_input_1_function = 'Custom_4' THEN NEW.voltage_input_1
      WHEN v_voltage_config.voltage_input_2_function = 'Custom_4' THEN NEW.voltage_input_2
      WHEN v_voltage_config.voltage_input_3_function = 'Custom_4' THEN NEW.voltage_input_3
      WHEN v_voltage_config.voltage_input_4_function = 'Custom_4' THEN NEW.voltage_input_4
      WHEN v_voltage_config.voltage_input_5_function = 'Custom_4' THEN NEW.voltage_input_5
      WHEN v_voltage_config.voltage_input_6_function = 'Custom_4' THEN NEW.voltage_input_6
      ELSE NULL
    END;
    
    v_voltage_5 := CASE 
      WHEN v_voltage_config.voltage_input_1_function = 'Custom_5' THEN NEW.voltage_input_1
      WHEN v_voltage_config.voltage_input_2_function = 'Custom_5' THEN NEW.voltage_input_2
      WHEN v_voltage_config.voltage_input_3_function = 'Custom_5' THEN NEW.voltage_input_3
      WHEN v_voltage_config.voltage_input_4_function = 'Custom_5' THEN NEW.voltage_input_4
      WHEN v_voltage_config.voltage_input_5_function = 'Custom_5' THEN NEW.voltage_input_5
      WHEN v_voltage_config.voltage_input_6_function = 'Custom_5' THEN NEW.voltage_input_6
      ELSE NULL
    END;
    
    v_voltage_6 := CASE 
      WHEN v_voltage_config.voltage_input_1_function = 'Custom_6' THEN NEW.voltage_input_1
      WHEN v_voltage_config.voltage_input_2_function = 'Custom_6' THEN NEW.voltage_input_2
      WHEN v_voltage_config.voltage_input_3_function = 'Custom_6' THEN NEW.voltage_input_3
      WHEN v_voltage_config.voltage_input_4_function = 'Custom_6' THEN NEW.voltage_input_4
      WHEN v_voltage_config.voltage_input_5_function = 'Custom_6' THEN NEW.voltage_input_5
      WHEN v_voltage_config.voltage_input_6_function = 'Custom_6' THEN NEW.voltage_input_6
      ELSE NULL
    END;
  ELSE
    -- No config: direct mapping
    v_voltage_1 := NEW.voltage_input_1;
    v_voltage_2 := NEW.voltage_input_2;
    v_voltage_3 := NEW.voltage_input_3;
    v_voltage_4 := NEW.voltage_input_4;
    v_voltage_5 := NEW.voltage_input_5;
    v_voltage_6 := NEW.voltage_input_6;
  END IF;
  
  -- Determine active states from pickup voltages (threshold-based)
  v_fan_active := COALESCE(v_voltage_1, 0) >= v_active_threshold;
  v_pump_active := COALESCE(v_voltage_2, 0) >= v_active_threshold;
  v_drain_active := COALESCE(v_voltage_3, 0) >= v_active_threshold;
  v_exhaust_active := COALESCE(v_voltage_4, 0) >= v_active_threshold;
  
  -- For heat pumps: determine cooling/heating based on delta_t and setpoint
  -- If delta_t is positive (ambient > duct), it's cooling
  -- If delta_t is negative (ambient < duct), it's heating
  IF v_ambient_temp IS NOT NULL AND v_duct_temp IS NOT NULL THEN
    IF v_ambient_temp > v_duct_temp THEN
      v_is_cooling := true;
      v_is_heating := false;
    ELSIF v_ambient_temp < v_duct_temp THEN
      v_is_cooling := false;
      v_is_heating := true;
    ELSE
      v_is_cooling := false;
      v_is_heating := false;
    END IF;
  END IF;
  
  -- Machine is "on" if any component is active
  v_is_on := v_fan_active OR v_pump_active OR v_drain_active OR v_exhaust_active OR v_is_cooling OR v_is_heating;
  
  -- Calculate basic status (simplified for now)
  -- TODO: Add more sophisticated status calculation based on thresholds
  v_status_calc := jsonb_build_object(
    'fan_active', v_fan_active,
    'pump_active', v_pump_active,
    'drain_active', v_drain_active,
    'exhaust_active', v_exhaust_active,
    'is_cooling', v_is_cooling,
    'is_heating', v_is_heating,
    'is_on', v_is_on
  );
  
  -- Insert into alliance (calculated) table
  INSERT INTO public.alliance (
    machine_id,
    timestamp,
    ambient_temp,
    duct_temp,
    motor_temp,
    delta_t,
    voltage,
    current,
    power,
    voltage_1,
    voltage_2,
    voltage_3,
    voltage_4,
    voltage_5,
    voltage_6,
    fan_active,
    pump_active,
    drain_active,
    exhaust_active,
    is_cooling,
    is_heating,
    is_on,
    is_connected,
    has_water,
    overall_status,
    motor_status,
    water_status,
    cooling_status,
    heating_status,
    status_details
  ) VALUES (
    NEW.machine_id,
    NEW.timestamp,
    v_ambient_temp,
    v_duct_temp,
    v_motor_temp,
    v_delta_t,
    v_voltage,
    v_current,
    v_power,
    v_voltage_1,
    v_voltage_2,
    v_voltage_3,
    v_voltage_4,
    v_voltage_5,
    v_voltage_6,
    v_fan_active,
    v_pump_active,
    v_drain_active,
    v_exhaust_active,
    v_is_cooling,
    v_is_heating,
    v_is_on,
    true, -- is_connected (assumed true if we're receiving data)
    v_has_water,
    'operational', -- overall_status (default, can be enhanced)
    'normal', -- motor_status (default)
    CASE WHEN v_has_water THEN 'ok' ELSE 'empty' END, -- water_status
    CASE WHEN v_is_cooling THEN 'active' ELSE 'idle' END, -- cooling_status
    CASE WHEN v_is_heating THEN 'active' ELSE 'idle' END, -- heating_status
    v_status_calc
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
    drain_active = EXCLUDED.drain_active,
    exhaust_active = EXCLUDED.exhaust_active,
    is_cooling = EXCLUDED.is_cooling,
    is_heating = EXCLUDED.is_heating,
    is_on = EXCLUDED.is_on,
    has_water = EXCLUDED.has_water,
    status_details = EXCLUDED.status_details,
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'Error processing alliance reading for machine %: %', NEW.machine_id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on alliance_raw table
DROP TRIGGER IF EXISTS trigger_process_alliance_reading ON public.alliance_raw;
CREATE TRIGGER trigger_process_alliance_reading
  AFTER INSERT ON public.alliance_raw
  FOR EACH ROW
  EXECUTE FUNCTION public.process_alliance_reading();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.process_alliance_reading() TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_alliance_reading() TO service_role;

COMMENT ON FUNCTION public.process_alliance_reading IS 'Automatically processes alliance_raw entries into alliance (calculated) table for heat pump machines. SECURITY DEFINER allows bypassing RLS to read from machines table.';

