-- Update Connection Status and Zero Readings When Disconnected
-- Changes timeout from 10 to 15 minutes
-- Sets all readings to 0 when machine is disconnected

-- Update connection status calculation to use 15 minutes
CREATE OR REPLACE FUNCTION public.calculate_machine_connection_status(
  p_machine_id UUID,
  p_timeout_minutes INTEGER DEFAULT 15  -- Changed from 10 to 15 minutes
) RETURNS BOOLEAN AS $$
DECLARE
  v_last_reading TIMESTAMPTZ;
BEGIN
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
  
  -- Check if last reading is within timeout period (15 minutes)
  IF v_last_reading >= (NOW() - (p_timeout_minutes || ' minutes')::INTERVAL) THEN
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to update machines table with latest readings
-- Sets readings to 0 if machine is disconnected
CREATE OR REPLACE FUNCTION public.update_machines_from_latest_readings()
RETURNS void AS $$
DECLARE
  v_machine RECORD;
  v_last_cirrus RECORD;
  v_last_coolbreeze RECORD;
  v_is_connected BOOLEAN;
  v_last_reading TIMESTAMPTZ;
BEGIN
  -- Loop through all machines
  FOR v_machine IN SELECT id, type, manufacturer FROM public.machines LOOP
    -- Determine which processing table to use
    IF v_machine.type = 'evaporative' AND COALESCE(v_machine.manufacturer, '') = 'Cirrus' THEN
      -- Get latest Cirrus reading
      SELECT * INTO v_last_cirrus
      FROM public.cirrus
      WHERE machine_id = v_machine.id
      ORDER BY timestamp DESC
      LIMIT 1;
      
      -- Get last reading time
      v_last_reading := COALESCE(v_last_cirrus.timestamp, '1970-01-01'::timestamptz);
      
      -- Check if connected (within 15 minutes)
      v_is_connected := (v_last_reading >= (NOW() - INTERVAL '15 minutes'));
      
      -- Update machines table
      IF v_is_connected AND v_last_cirrus IS NOT NULL THEN
        -- Machine is connected - use latest readings
        UPDATE public.machines SET
          motor_temp = v_last_cirrus.motor_temp,
          outside_temp = v_last_cirrus.ambient_temp,
          inside_temp = v_last_cirrus.duct_temp,
          delta_t = v_last_cirrus.delta_t,
          current = v_last_cirrus.current,
          voltage = v_last_cirrus.voltage,
          power = v_last_cirrus.power,
          is_connected = true,
          is_on = v_last_cirrus.is_on,
          is_cooling = v_last_cirrus.is_cooling,
          fan_active = v_last_cirrus.fan_active,
          has_water = v_last_cirrus.has_water,
          overall_status = v_last_cirrus.overall_status,
          motor_status = v_last_cirrus.motor_status,
          updated_at = NOW()
        WHERE id = v_machine.id;
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
          has_water = false,  -- Assume no water when disconnected
          overall_status = 'offline',
          motor_status = 'normal',
          updated_at = NOW()
        WHERE id = v_machine.id;
      END IF;
      
    ELSIF v_machine.type IN ('airconditioner', 'heatpump') OR COALESCE(v_machine.manufacturer, '') = 'CoolBreeze' THEN
      -- Get latest CoolBreeze reading
      SELECT * INTO v_last_coolbreeze
      FROM public.coolbreeze
      WHERE machine_id = v_machine.id
      ORDER BY timestamp DESC
      LIMIT 1;
      
      -- Get last reading time
      v_last_reading := COALESCE(v_last_coolbreeze.timestamp, '1970-01-01'::timestamptz);
      
      -- Check if connected (within 15 minutes)
      v_is_connected := (v_last_reading >= (NOW() - INTERVAL '15 minutes'));
      
      -- Update machines table
      IF v_is_connected AND v_last_coolbreeze IS NOT NULL THEN
        -- Machine is connected - use latest readings
        UPDATE public.machines SET
          motor_temp = v_last_coolbreeze.motor_temp,
          outside_temp = v_last_coolbreeze.ambient_temp,
          inside_temp = v_last_coolbreeze.duct_temp,
          delta_t = v_last_coolbreeze.delta_t,
          current = v_last_coolbreeze.current,
          voltage = v_last_coolbreeze.voltage,
          power = v_last_coolbreeze.power,
          is_connected = true,
          is_on = v_last_coolbreeze.is_on,
          is_cooling = v_last_coolbreeze.is_cooling,
          fan_active = v_last_coolbreeze.fan_active,
          has_water = v_last_coolbreeze.has_water,
          overall_status = v_last_coolbreeze.overall_status,
          motor_status = v_last_coolbreeze.motor_status,
          updated_at = NOW()
        WHERE id = v_machine.id;
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
          has_water = false,  -- Assume no water when disconnected
          overall_status = 'offline',
          motor_status = 'normal',
          updated_at = NOW()
        WHERE id = v_machine.id;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the view to use 15 minutes
CREATE OR REPLACE VIEW public.machine_connection_status AS
SELECT 
  m.id as machine_id,
  m.name as machine_name,
  m.type as machine_type,
  GREATEST(
    COALESCE(MAX(c.timestamp), '1970-01-01'::timestamptz),
    COALESCE(MAX(cb.timestamp), '1970-01-01'::timestamptz)
  ) as last_reading_time,
  CASE 
    WHEN GREATEST(
      COALESCE(MAX(c.timestamp), '1970-01-01'::timestamptz),
      COALESCE(MAX(cb.timestamp), '1970-01-01'::timestamptz)
    ) >= (NOW() - INTERVAL '15 minutes') THEN true
    ELSE false
  END as is_connected,
  EXTRACT(EPOCH FROM (NOW() - GREATEST(
    COALESCE(MAX(c.timestamp), '1970-01-01'::timestamptz),
    COALESCE(MAX(cb.timestamp), '1970-01-01'::timestamptz)
  )))/60 as minutes_since_last_reading
FROM public.machines m
LEFT JOIN public.cirrus c ON c.machine_id = m.id
LEFT JOIN public.coolbreeze cb ON cb.machine_id = m.id
GROUP BY m.id, m.name, m.type;

-- Update comments
COMMENT ON FUNCTION public.calculate_machine_connection_status IS 'Calculates if machine is connected based on last reading time (default 15 minute timeout)';
COMMENT ON FUNCTION public.update_machines_from_latest_readings IS 'Updates machines table with latest readings from processing tables. Sets readings to 0 if machine is disconnected (no reading in last 15 minutes).';
COMMENT ON VIEW public.machine_connection_status IS 'Shows current connection status for all machines based on last reading time (15 minute timeout)';

