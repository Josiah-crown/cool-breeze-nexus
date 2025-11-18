-- Debug Trigger Chain
-- Use this to check if triggers are firing and where they might be failing

-- 1. Check latest readings_raw entry (should be empty - processed immediately)
SELECT 
  id,
  machine_id,
  created_at,
  current,
  motor_temp,
  inside_temp,
  outside_temp
FROM public.readings_raw
WHERE machine_id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42'
ORDER BY created_at DESC
LIMIT 5;

-- 2. Check latest cirrus entry (should have recent data)
SELECT 
  id,
  machine_id,
  timestamp,
  current,
  motor_temp,
  ambient_temp,
  duct_temp,
  is_connected,
  created_at
FROM public.cirrus
WHERE machine_id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42'
ORDER BY timestamp DESC
LIMIT 5;

-- 3. Check machines table current state
SELECT 
  id,
  name,
  is_connected,
  current,
  voltage,
  motor_temp,
  outside_temp,
  inside_temp,
  updated_at,
  -- Calculate what it should be
  EXTRACT(EPOCH FROM (NOW() - updated_at))/60 as minutes_since_machines_updated
FROM public.machines
WHERE id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42';

-- 4. Check if trigger exists and is enabled
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('cirrus', 'coolbreeze', 'readings_raw')
AND trigger_name LIKE '%update_machine%' OR trigger_name LIKE '%process_%'
ORDER BY event_object_table, trigger_name;

-- 5. Manually test the update function
SELECT public.update_machine_from_latest_reading('c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42');

-- 6. Check machines table again after manual update
SELECT 
  id,
  name,
  is_connected,
  current,
  voltage,
  updated_at
FROM public.machines
WHERE id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42';

-- 7. Check for any warnings/errors in database logs
-- (This would be in Supabase Dashboard > Logs > Postgres Logs)
-- Look for any RAISE WARNING messages from the trigger functions

