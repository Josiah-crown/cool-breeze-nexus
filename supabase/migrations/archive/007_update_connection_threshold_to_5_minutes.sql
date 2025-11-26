-- ========================================
-- UPDATE CONNECTION THRESHOLD TO 5 MINUTES
-- ========================================
-- Purpose: Change connection status threshold from 15 minutes to 5 minutes
-- This matches the frontend calculation and user's requirement (posts every ~3 minutes)
-- ========================================

-- Update the update_machine_from_latest_reading function to use 5 minutes
CREATE OR REPLACE FUNCTION public.update_machine_from_latest_reading(p_machine_id UUID)
RETURNS void AS $$
DECLARE
  v_machine RECORD;
  v_last_cirrus RECORD;
  v_last_coolbreeze RECORD;
  v_last_alliance RECORD;
  v_is_connected BOOLEAN;
  v_last_reading TIMESTAMPTZ;
BEGIN
  -- Get machine info
  SELECT id, type, manufacturer INTO v_machine
  FROM public.machines
  WHERE id = p_machine_id;
  
  IF v_machine IS NULL THEN
    RETURN; -- Machine doesn't exist
  END IF;
  
  -- Determine which processing table to use
  IF v_machine.type = 'evaporative' AND COALESCE(v_machine.manufacturer, '') = 'Cirrus' THEN
    -- Get latest Cirrus reading
    SELECT * INTO v_last_cirrus
    FROM public.cirrus
    WHERE machine_id = p_machine_id
    ORDER BY timestamp DESC
    LIMIT 1;
    
    -- Get last reading time
    v_last_reading := COALESCE(v_last_cirrus.timestamp, '1970-01-01'::timestamptz);
    
    -- Check if connected (within 5 minutes)
    v_is_connected := (v_last_reading >= (NOW() - INTERVAL '5 minutes'));
    
    -- Update machines table
    IF v_is_connected AND v_last_cirrus IS NOT NULL THEN
      -- Machine is connected - use latest readings
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
      -- Machine is disconnected - set all readings to 0
      UPDATE public.machines SET
        motor_temp = 0,
        outside_temp = 0,
        inside_temp = 0,
        delta_t = 0,
        current = 0,
        voltage = 0,
        power = 0,
        is_connected = false,
        is_on = false,
        is_cooling = false,
        fan_active = false,
        has_water = false,
        overall_status = 'offline',
        motor_status = 'normal',
        updated_at = NOW()
      WHERE id = p_machine_id;
    END IF;
    
  ELSIF v_machine.type IN ('airconditioner', 'heatpump') OR COALESCE(v_machine.manufacturer, '') = 'CoolBreeze' THEN
    -- Get latest CoolBreeze reading
    SELECT * INTO v_last_coolbreeze
    FROM public.coolbreeze
    WHERE machine_id = p_machine_id
    ORDER BY timestamp DESC
    LIMIT 1;
    
    -- Get last reading time
    v_last_reading := COALESCE(v_last_coolbreeze.timestamp, '1970-01-01'::timestamptz);
    
    -- Check if connected (within 5 minutes)
    v_is_connected := (v_last_reading >= (NOW() - INTERVAL '5 minutes'));
    
    -- Update machines table
    IF v_is_connected AND v_last_coolbreeze IS NOT NULL THEN
      -- Machine is connected - use latest readings
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
      -- Machine is disconnected - set all readings to 0
      UPDATE public.machines SET
        motor_temp = 0,
        outside_temp = 0,
        inside_temp = 0,
        delta_t = 0,
        current = 0,
        voltage = 0,
        power = 0,
        is_connected = false,
        is_on = false,
        is_cooling = false,
        fan_active = false,
        has_water = false,
        overall_status = 'offline',
        motor_status = 'normal',
        updated_at = NOW()
      WHERE id = p_machine_id;
    END IF;
    
  ELSIF v_machine.type = 'heatpump' AND COALESCE(v_machine.manufacturer, '') = 'Alliance' THEN
    -- Get latest Alliance reading
    SELECT * INTO v_last_alliance
    FROM public.alliance
    WHERE machine_id = p_machine_id
    ORDER BY timestamp DESC
    LIMIT 1;
    
    -- Get last reading time
    v_last_reading := COALESCE(v_last_alliance.timestamp, '1970-01-01'::timestamptz);
    
    -- Check if connected (within 5 minutes)
    v_is_connected := (v_last_reading >= (NOW() - INTERVAL '5 minutes'));
    
    -- Update machines table
    IF v_is_connected AND v_last_alliance IS NOT NULL THEN
      -- Machine is connected - use latest readings
      UPDATE public.machines SET
        motor_temp = COALESCE(v_last_alliance.motor_temp, 0),
        outside_temp = COALESCE(v_last_alliance.ambient_temp, 0),
        inside_temp = COALESCE(v_last_alliance.duct_temp, 0),
        delta_t = COALESCE(v_last_alliance.delta_t, 0),
        current = COALESCE(v_last_alliance.current, 0),
        voltage = COALESCE(v_last_alliance.voltage, 0),
        power = COALESCE(v_last_alliance.power, 0),
        is_connected = true,
        is_on = v_last_alliance.is_on,
        is_cooling = v_last_alliance.is_cooling,
        fan_active = v_last_alliance.fan_active,
        has_water = v_last_alliance.has_water,
        overall_status = v_last_alliance.overall_status,
        motor_status = v_last_alliance.motor_status,
        updated_at = NOW()
      WHERE id = p_machine_id;
    ELSE
      -- Machine is disconnected - set all readings to 0
      UPDATE public.machines SET
        motor_temp = 0,
        outside_temp = 0,
        inside_temp = 0,
        delta_t = 0,
        current = 0,
        voltage = 0,
        power = 0,
        is_connected = false,
        is_on = false,
        is_cooling = false,
        fan_active = false,
        has_water = false,
        overall_status = 'offline',
        motor_status = 'normal',
        updated_at = NOW()
      WHERE id = p_machine_id;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.update_machine_from_latest_reading IS 'Updates a single machine in machines table from latest reading. Uses 5 minute connection threshold. Called automatically by triggers when new data is processed.';

