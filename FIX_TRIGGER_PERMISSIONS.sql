-- ============================================================
-- FIX: Make trigger function run with SECURITY DEFINER
-- This allows the trigger to UPDATE machines table even when
-- called by anon role (ESP32)
-- ============================================================

-- Recreate the trigger function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION update_machine_from_reading()
RETURNS TRIGGER
SECURITY DEFINER  -- Run with function creator's permissions, not caller's
SET search_path = public, pg_catalog  -- Security best practice
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update the machines table with latest reading
  UPDATE machines
  SET 
    motor_temp = NEW.motor_temp,
    outside_temp = NEW.outside_temp,
    inside_temp = NEW.inside_temp,
    current = NEW.current,
    voltage = NEW.voltage,
    power = NEW.power,
    is_on = NEW.is_on,
    fan_active = NEW.fan_active,
    overall_status = NEW.overall_status,
    is_cooling = NEW.is_cooling,
    has_water = NEW.has_water,
    exhaust_active = NEW.exhaust_active,
    pump_active = NEW.pump_active,
    drain_active = NEW.drain_active,
    fan_speed = NEW.fan_speed,
    last_seen = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.machine_id;
  
  RETURN NEW;
END;
$$;

-- Verify the function has SECURITY DEFINER
SELECT 
  proname as function_name,
  prosecdef as "Security Definer",
  proconfig as "Search Path"
FROM pg_proc
WHERE proname = 'update_machine_from_reading';

SELECT '✅ TRIGGER FUNCTION UPDATED WITH SECURITY DEFINER' as status;


