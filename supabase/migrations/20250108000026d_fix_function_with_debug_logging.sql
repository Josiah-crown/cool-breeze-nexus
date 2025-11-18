-- Migration 26d: Fix function with debug logging to see what's happening
-- This version adds RAISE NOTICE to help debug why it's not working

CREATE OR REPLACE FUNCTION public.update_machine_from_latest_reading(p_machine_id UUID)
RETURNS void AS $$
DECLARE
  v_machine RECORD;
  v_last_cirrus RECORD;
  v_last_coolbreeze RECORD;
  v_is_connected BOOLEAN;
  v_last_reading TIMESTAMPTZ;
  v_minutes_ago NUMERIC;
BEGIN
  -- Get machine info
  SELECT id, type, COALESCE(manufacturer, '') as manufacturer INTO v_machine
  FROM public.machines
  WHERE id = p_machine_id;
  
  IF v_machine IS NULL THEN
    RAISE WARNING 'Machine % not found', p_machine_id;
    RETURN;
  END IF;
  
  -- Check both tables for latest reading
  SELECT * INTO v_last_cirrus
  FROM public.cirrus
  WHERE machine_id = p_machine_id
  ORDER BY timestamp DESC
  LIMIT 1;
  
  SELECT * INTO v_last_coolbreeze
  FROM public.coolbreeze
  WHERE machine_id = p_machine_id
  ORDER BY timestamp DESC
  LIMIT 1;
  
  -- Determine which reading is more recent and calculate connection status
  IF v_last_cirrus IS NOT NULL AND v_last_coolbreeze IS NOT NULL THEN
    -- Both exist - use the more recent one
    IF v_last_cirrus.timestamp > v_last_coolbreeze.timestamp THEN
      v_minutes_ago := EXTRACT(EPOCH FROM (NOW() - v_last_cirrus.timestamp))/60;
      v_is_connected := (v_last_cirrus.is_connected = true) AND (v_minutes_ago <= 15);
      
      RAISE NOTICE 'DEBUG: Both tables exist, using Cirrus. is_connected=%, minutes_ago=%, result=%', 
        v_last_cirrus.is_connected, v_minutes_ago, v_is_connected;
      
      IF v_is_connected THEN
        UPDATE public.machines SET
          motor_temp = COALESCE(v_last_cirrus.motor_temp, 0),
          outside_temp = COALESCE(v_last_cirrus.ambient_temp, 0),
          inside_temp = COALESCE(v_last_cirrus.duct_temp, 0),
          delta_t = COALESCE(v_last_cirrus.delta_t, 0),
          current = COALESCE(v_last_cirrus.current, 0),
          voltage = COALESCE(v_last_cirrus.voltage, 0),
          power = COALESCE(v_last_cirrus.power, 0),
          is_connected = true,
          is_on = v_last_cirrus.is_on,
          is_cooling = v_last_cirrus.is_cooling,
          fan_active = v_last_cirrus.fan_active,
          has_water = v_last_cirrus.has_water,
          overall_status = v_last_cirrus.overall_status,
          motor_status = v_last_cirrus.motor_status,
          updated_at = NOW()
        WHERE id = p_machine_id;
      ELSE
        UPDATE public.machines SET
          motor_temp = 0, outside_temp = 0, inside_temp = 0, delta_t = 0,
          current = 0, voltage = 0, power = 0,
          is_connected = false, is_on = false, is_cooling = false,
          fan_active = false, has_water = false,
          overall_status = 'offline', motor_status = 'normal',
          updated_at = NOW()
        WHERE id = p_machine_id;
      END IF;
    ELSE
      -- CoolBreeze is more recent
      v_minutes_ago := EXTRACT(EPOCH FROM (NOW() - v_last_coolbreeze.timestamp))/60;
      v_is_connected := (v_last_coolbreeze.is_connected = true) AND (v_minutes_ago <= 15);
      
      RAISE NOTICE 'DEBUG: Both tables exist, using CoolBreeze. is_connected=%, minutes_ago=%, result=%', 
        v_last_coolbreeze.is_connected, v_minutes_ago, v_is_connected;
      
      IF v_is_connected THEN
        UPDATE public.machines SET
          motor_temp = COALESCE(v_last_coolbreeze.motor_temp, 0),
          outside_temp = COALESCE(v_last_coolbreeze.ambient_temp, 0),
          inside_temp = COALESCE(v_last_coolbreeze.duct_temp, 0),
          delta_t = COALESCE(v_last_coolbreeze.delta_t, 0),
          current = COALESCE(v_last_coolbreeze.current, 0),
          voltage = COALESCE(v_last_coolbreeze.voltage, 0),
          power = COALESCE(v_last_coolbreeze.power, 0),
          is_connected = true,
          is_on = v_last_coolbreeze.is_on,
          is_cooling = v_last_coolbreeze.is_cooling,
          fan_active = v_last_coolbreeze.fan_active,
          has_water = v_last_coolbreeze.has_water,
          overall_status = v_last_coolbreeze.overall_status,
          motor_status = v_last_coolbreeze.motor_status,
          updated_at = NOW()
        WHERE id = p_machine_id;
      ELSE
        UPDATE public.machines SET
          motor_temp = 0, outside_temp = 0, inside_temp = 0, delta_t = 0,
          current = 0, voltage = 0, power = 0,
          is_connected = false, is_on = false, is_cooling = false,
          fan_active = false, has_water = false,
          overall_status = 'offline', motor_status = 'normal',
          updated_at = NOW()
        WHERE id = p_machine_id;
      END IF;
    END IF;
  ELSIF v_last_cirrus IS NOT NULL THEN
    -- Only Cirrus data exists
    v_minutes_ago := EXTRACT(EPOCH FROM (NOW() - v_last_cirrus.timestamp))/60;
    v_is_connected := (v_last_cirrus.is_connected = true) AND (v_minutes_ago <= 15);
    
    RAISE NOTICE 'DEBUG: Only Cirrus exists. is_connected=%, minutes_ago=%, result=%', 
      v_last_cirrus.is_connected, v_minutes_ago, v_is_connected;
    
    IF v_is_connected THEN
      UPDATE public.machines SET
        motor_temp = COALESCE(v_last_cirrus.motor_temp, 0),
        outside_temp = COALESCE(v_last_cirrus.ambient_temp, 0),
        inside_temp = COALESCE(v_last_cirrus.duct_temp, 0),
        delta_t = COALESCE(v_last_cirrus.delta_t, 0),
        current = COALESCE(v_last_cirrus.current, 0),
        voltage = COALESCE(v_last_cirrus.voltage, 0),
        power = COALESCE(v_last_cirrus.power, 0),
        is_connected = true,
        is_on = v_last_cirrus.is_on,
        is_cooling = v_last_cirrus.is_cooling,
        fan_active = v_last_cirrus.fan_active,
        has_water = v_last_cirrus.has_water,
        overall_status = v_last_cirrus.overall_status,
        motor_status = v_last_cirrus.motor_status,
        updated_at = NOW()
      WHERE id = p_machine_id;
    ELSE
      UPDATE public.machines SET
        motor_temp = 0, outside_temp = 0, inside_temp = 0, delta_t = 0,
        current = 0, voltage = 0, power = 0,
        is_connected = false, is_on = false, is_cooling = false,
        fan_active = false, has_water = false,
        overall_status = 'offline', motor_status = 'normal',
        updated_at = NOW()
      WHERE id = p_machine_id;
    END IF;
  ELSIF v_last_coolbreeze IS NOT NULL THEN
    -- Only CoolBreeze data exists
    v_minutes_ago := EXTRACT(EPOCH FROM (NOW() - v_last_coolbreeze.timestamp))/60;
    v_is_connected := (v_last_coolbreeze.is_connected = true) AND (v_minutes_ago <= 15);
    
    RAISE NOTICE 'DEBUG: Only CoolBreeze exists. is_connected=%, minutes_ago=%, result=%', 
      v_last_coolbreeze.is_connected, v_minutes_ago, v_is_connected;
    
    IF v_is_connected THEN
      UPDATE public.machines SET
        motor_temp = COALESCE(v_last_coolbreeze.motor_temp, 0),
        outside_temp = COALESCE(v_last_coolbreeze.ambient_temp, 0),
        inside_temp = COALESCE(v_last_coolbreeze.duct_temp, 0),
        delta_t = COALESCE(v_last_coolbreeze.delta_t, 0),
        current = COALESCE(v_last_coolbreeze.current, 0),
        voltage = COALESCE(v_last_coolbreeze.voltage, 0),
        power = COALESCE(v_last_coolbreeze.power, 0),
        is_connected = true,
        is_on = v_last_coolbreeze.is_on,
        is_cooling = v_last_coolbreeze.is_cooling,
        fan_active = v_last_coolbreeze.fan_active,
        has_water = v_last_coolbreeze.has_water,
        overall_status = v_last_coolbreeze.overall_status,
        motor_status = v_last_coolbreeze.motor_status,
        updated_at = NOW()
      WHERE id = p_machine_id;
    ELSE
      UPDATE public.machines SET
        motor_temp = 0, outside_temp = 0, inside_temp = 0, delta_t = 0,
        current = 0, voltage = 0, power = 0,
        is_connected = false, is_on = false, is_cooling = false,
        fan_active = false, has_water = false,
        overall_status = 'offline', motor_status = 'normal',
        updated_at = NOW()
      WHERE id = p_machine_id;
    END IF;
  ELSE
    -- No readings at all - disconnected
    RAISE NOTICE 'DEBUG: No readings found for machine %', p_machine_id;
    UPDATE public.machines SET
      motor_temp = 0, outside_temp = 0, inside_temp = 0, delta_t = 0,
      current = 0, voltage = 0, power = 0,
      is_connected = false, is_on = false, is_cooling = false,
      fan_active = false, has_water = false,
      overall_status = 'offline', motor_status = 'normal',
      updated_at = NOW()
    WHERE id = p_machine_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.update_machine_from_latest_reading IS 'Updates machines table from latest reading. Includes debug logging to diagnose connection status issues.';

