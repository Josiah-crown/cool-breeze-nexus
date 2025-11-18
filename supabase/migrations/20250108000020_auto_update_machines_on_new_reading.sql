-- Auto-update machines table when new reading is processed
-- This ensures machines table is always up-to-date without needing to call update function manually

-- Function to update a single machine's status from latest reading
CREATE OR REPLACE FUNCTION public.update_machine_from_latest_reading(p_machine_id UUID)
RETURNS void AS $$
DECLARE
  v_machine RECORD;
  v_last_cirrus RECORD;
  v_last_coolbreeze RECORD;
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
    
    -- Check if connected (within 15 minutes)
    v_is_connected := (v_last_reading >= (NOW() - INTERVAL '15 minutes'));
    
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
    
    -- Check if connected (within 15 minutes)
    v_is_connected := (v_last_reading >= (NOW() - INTERVAL '15 minutes'));
    
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
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to auto-update machines table when new Cirrus reading is inserted
CREATE OR REPLACE FUNCTION public.trigger_update_machine_on_cirrus_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Update machines table with latest reading
  PERFORM public.update_machine_from_latest_reading(NEW.machine_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_auto_update_machine_on_cirrus_insert ON public.cirrus;
CREATE TRIGGER trigger_auto_update_machine_on_cirrus_insert
  AFTER INSERT OR UPDATE ON public.cirrus
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_machine_on_cirrus_insert();

-- Add trigger to auto-update machines table when new CoolBreeze reading is inserted
CREATE OR REPLACE FUNCTION public.trigger_update_machine_on_coolbreeze_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Update machines table with latest reading
  PERFORM public.update_machine_from_latest_reading(NEW.machine_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_auto_update_machine_on_coolbreeze_insert ON public.coolbreeze;
CREATE TRIGGER trigger_auto_update_machine_on_coolbreeze_insert
  AFTER INSERT OR UPDATE ON public.coolbreeze
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_machine_on_coolbreeze_insert();

COMMENT ON FUNCTION public.update_machine_from_latest_reading IS 'Updates a single machine in machines table from latest reading. Called automatically by triggers when new data is processed.';
COMMENT ON FUNCTION public.trigger_update_machine_on_cirrus_insert IS 'Trigger function to auto-update machines table when new Cirrus reading is inserted.';
COMMENT ON FUNCTION public.trigger_update_machine_on_coolbreeze_insert IS 'Trigger function to auto-update machines table when new CoolBreeze reading is inserted.';

