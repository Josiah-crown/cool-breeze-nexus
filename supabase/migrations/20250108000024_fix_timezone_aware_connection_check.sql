-- Fix timezone-aware connection status check
-- Ensure all time comparisons use UTC consistently

-- Enhanced update function with explicit UTC timezone handling
CREATE OR REPLACE FUNCTION public.update_machine_from_latest_reading(p_machine_id UUID)
RETURNS void AS $$
DECLARE
  v_machine RECORD;
  v_last_cirrus RECORD;
  v_last_coolbreeze RECORD;
  v_is_connected BOOLEAN;
  v_last_reading TIMESTAMPTZ;
  v_now_utc TIMESTAMPTZ;
  v_minutes_ago NUMERIC;
BEGIN
  -- Get current time in UTC explicitly
  v_now_utc := (NOW() AT TIME ZONE 'UTC');
  
  -- Get machine info
  SELECT id, type, COALESCE(manufacturer, '') as manufacturer INTO v_machine
  FROM public.machines
  WHERE id = p_machine_id;
  
  IF v_machine IS NULL THEN
    RAISE WARNING 'Machine % not found', p_machine_id;
    RETURN; -- Machine doesn't exist
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
  
  -- Determine which reading is more recent
  IF v_last_cirrus IS NOT NULL AND v_last_coolbreeze IS NOT NULL THEN
    -- Both exist - use the more recent one
    IF v_last_cirrus.timestamp > v_last_coolbreeze.timestamp THEN
      v_last_reading := v_last_cirrus.timestamp;
      v_minutes_ago := EXTRACT(EPOCH FROM (v_now_utc - v_last_reading))/60;
      v_is_connected := (v_minutes_ago <= 15);
      
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
          updated_at = v_now_utc
        WHERE id = p_machine_id;
      ELSE
        -- Disconnected - set to 0
        UPDATE public.machines SET
          motor_temp = 0, outside_temp = 0, inside_temp = 0, delta_t = 0,
          current = 0, voltage = 0, power = 0,
          is_connected = false, is_on = false, is_cooling = false,
          fan_active = false, has_water = false,
          overall_status = 'offline', motor_status = 'normal',
          updated_at = v_now_utc
        WHERE id = p_machine_id;
      END IF;
    ELSE
      -- CoolBreeze is more recent
      v_last_reading := v_last_coolbreeze.timestamp;
      v_minutes_ago := EXTRACT(EPOCH FROM (v_now_utc - v_last_reading))/60;
      v_is_connected := (v_minutes_ago <= 15);
      
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
          updated_at = v_now_utc
        WHERE id = p_machine_id;
      ELSE
        -- Disconnected - set to 0
        UPDATE public.machines SET
          motor_temp = 0, outside_temp = 0, inside_temp = 0, delta_t = 0,
          current = 0, voltage = 0, power = 0,
          is_connected = false, is_on = false, is_cooling = false,
          fan_active = false, has_water = false,
          overall_status = 'offline', motor_status = 'normal',
          updated_at = v_now_utc
        WHERE id = p_machine_id;
      END IF;
    END IF;
  ELSIF v_last_cirrus IS NOT NULL THEN
    -- Only Cirrus data exists
    v_last_reading := v_last_cirrus.timestamp;
    v_minutes_ago := EXTRACT(EPOCH FROM (v_now_utc - v_last_reading))/60;
    v_is_connected := (v_minutes_ago <= 15);
    
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
        updated_at = v_now_utc
      WHERE id = p_machine_id;
    ELSE
      -- Disconnected - set to 0
      UPDATE public.machines SET
        motor_temp = 0, outside_temp = 0, inside_temp = 0, delta_t = 0,
        current = 0, voltage = 0, power = 0,
        is_connected = false, is_on = false, is_cooling = false,
        fan_active = false, has_water = false,
        overall_status = 'offline', motor_status = 'normal',
        updated_at = v_now_utc
      WHERE id = p_machine_id;
    END IF;
  ELSIF v_last_coolbreeze IS NOT NULL THEN
    -- Only CoolBreeze data exists
    v_last_reading := v_last_coolbreeze.timestamp;
    v_minutes_ago := EXTRACT(EPOCH FROM (v_now_utc - v_last_reading))/60;
    v_is_connected := (v_minutes_ago <= 15);
    
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
        updated_at = v_now_utc
      WHERE id = p_machine_id;
    ELSE
      -- Disconnected - set to 0
      UPDATE public.machines SET
        motor_temp = 0, outside_temp = 0, inside_temp = 0, delta_t = 0,
        current = 0, voltage = 0, power = 0,
        is_connected = false, is_on = false, is_cooling = false,
        fan_active = false, has_water = false,
        overall_status = 'offline', motor_status = 'normal',
        updated_at = v_now_utc
      WHERE id = p_machine_id;
    END IF;
  ELSE
    -- No readings at all - disconnected
    UPDATE public.machines SET
      motor_temp = 0, outside_temp = 0, inside_temp = 0, delta_t = 0,
      current = 0, voltage = 0, power = 0,
      is_connected = false, is_on = false, is_cooling = false,
      fan_active = false, has_water = false,
      overall_status = 'offline', motor_status = 'normal',
      updated_at = v_now_utc
    WHERE id = p_machine_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also update the connection status calculation function
CREATE OR REPLACE FUNCTION public.calculate_machine_connection_status(
  p_machine_id UUID,
  p_timeout_minutes INTEGER DEFAULT 15
) RETURNS BOOLEAN AS $$
DECLARE
  v_last_reading TIMESTAMPTZ;
  v_now_utc TIMESTAMPTZ;
  v_minutes_ago NUMERIC;
BEGIN
  -- Get current time in UTC explicitly
  v_now_utc := (NOW() AT TIME ZONE 'UTC');
  
  -- Get the most recent reading timestamp for this machine
  -- Check both cirrus and coolbreeze tables
  SELECT GREATEST(
    COALESCE((SELECT MAX(timestamp) FROM public.cirrus WHERE machine_id = p_machine_id), '1970-01-01'::timestamptz),
    COALESCE((SELECT MAX(timestamp) FROM public.coolbreeze WHERE machine_id = p_machine_id), '1970-01-01'::timestamptz)
  ) INTO v_last_reading;
  
  -- If no readings exist, return false
  IF v_last_reading = '1970-01-01'::timestamptz THEN
    RETURN false;
  END IF;
  
  -- Calculate minutes ago
  v_minutes_ago := EXTRACT(EPOCH FROM (v_now_utc - v_last_reading))/60;
  
  -- Check if last reading is within timeout period (15 minutes)
  RETURN (v_minutes_ago <= p_timeout_minutes);
END;
$$ LANGUAGE plpgsql STABLE;

-- Update all machines now with correct timezone handling
DO $$
DECLARE
  v_machine RECORD;
BEGIN
  FOR v_machine IN SELECT id FROM public.machines LOOP
    BEGIN
      PERFORM public.update_machine_from_latest_reading(v_machine.id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error updating machine %: %', v_machine.id, SQLERRM;
    END;
  END LOOP;
END $$;

COMMENT ON FUNCTION public.update_machine_from_latest_reading IS 'Updates machines table from latest reading. Uses explicit UTC timezone for all time comparisons.';
COMMENT ON FUNCTION public.calculate_machine_connection_status IS 'Calculates if machine is connected based on last reading time (default 15 minute timeout). Uses explicit UTC timezone.';

