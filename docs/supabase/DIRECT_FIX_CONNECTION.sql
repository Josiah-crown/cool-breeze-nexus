-- DIRECT FIX: Bypass the function and update directly
-- This will force the machines table to match the cirrus table
-- Replace 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42' with your machine ID

-- Step 1: See what we're working with
SELECT 
  'BEFORE FIX' as step,
  c.is_connected as cirrus_says,
  m.is_connected as machines_says,
  EXTRACT(EPOCH FROM (NOW() - c.timestamp))/60 as minutes_ago
FROM public.machines m
LEFT JOIN (
  SELECT machine_id, is_connected, timestamp, motor_temp, ambient_temp, duct_temp, 
         delta_t, current, voltage, power, is_on, is_cooling, fan_active, 
         has_water, overall_status, motor_status
  FROM public.cirrus
  WHERE machine_id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42'
  ORDER BY timestamp DESC
  LIMIT 1
) c ON c.machine_id = m.id
WHERE m.id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42';

-- Step 2: Direct update (bypasses function)
UPDATE public.machines m
SET 
  motor_temp = COALESCE(c.motor_temp, 0),
  outside_temp = COALESCE(c.ambient_temp, 0),
  inside_temp = COALESCE(c.duct_temp, 0),
  delta_t = COALESCE(c.delta_t, 0),
  current = COALESCE(c.current, 0),
  voltage = COALESCE(c.voltage, 0),
  power = COALESCE(c.power, 0),
  is_connected = CASE 
    WHEN c.is_connected = true AND EXTRACT(EPOCH FROM (NOW() - c.timestamp))/60 <= 15 
    THEN true 
    ELSE false 
  END,
  is_on = COALESCE(c.is_on, false),
  is_cooling = COALESCE(c.is_cooling, false),
  fan_active = COALESCE(c.fan_active, false),
  has_water = COALESCE(c.has_water, false),
  overall_status = COALESCE(c.overall_status, 'offline'),
  motor_status = COALESCE(c.motor_status, 'normal'),
  updated_at = NOW()
FROM (
  SELECT machine_id, is_connected, timestamp, motor_temp, ambient_temp, duct_temp, 
         delta_t, current, voltage, power, is_on, is_cooling, fan_active, 
         has_water, overall_status, motor_status
  FROM public.cirrus
  WHERE machine_id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42'
  ORDER BY timestamp DESC
  LIMIT 1
) c
WHERE m.id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42'
  AND c.machine_id = m.id;

-- Step 3: Verify it worked
SELECT 
  'AFTER FIX' as step,
  c.is_connected as cirrus_says,
  m.is_connected as machines_says,
  EXTRACT(EPOCH FROM (NOW() - c.timestamp))/60 as minutes_ago,
  CASE 
    WHEN m.is_connected = c.is_connected THEN '✓ MATCHED!'
    ELSE '✗ STILL MISMATCHED'
  END as result
FROM public.machines m
LEFT JOIN (
  SELECT machine_id, is_connected, timestamp
  FROM public.cirrus
  WHERE machine_id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42'
  ORDER BY timestamp DESC
  LIMIT 1
) c ON c.machine_id = m.id
WHERE m.id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42';

