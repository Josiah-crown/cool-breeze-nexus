-- Quick Diagnostic Queries
-- Run these to check connection status and current readings

-- 1. Check if machine has recent data and connection status
-- Replace 'YOUR_MACHINE_ID' with your actual machine ID
-- NOTE: If you get an error about test_machine_connection_status, use the query below instead
-- (Run Migration 22 first to get the test function, or use this detailed version:)
-- SELECT 
--   m.id,
--   m.name,
--   m.type,
--   m.manufacturer,
--   m.is_connected,
--   m.current,
--   m.voltage,
--   m.updated_at as machines_updated_at,
--   GREATEST(
--     COALESCE(MAX(c.timestamp), '1970-01-01'::timestamptz),
--     COALESCE(MAX(cb.timestamp), '1970-01-01'::timestamptz)
--   ) as last_reading_time,
--   EXTRACT(EPOCH FROM (NOW() - GREATEST(
--     COALESCE(MAX(c.timestamp), '1970-01-01'::timestamptz),
--     COALESCE(MAX(cb.timestamp), '1970-01-01'::timestamptz)
--   )))/60 as minutes_since_last_reading,
--   CASE 
--     WHEN GREATEST(
--       COALESCE(MAX(c.timestamp), '1970-01-01'::timestamptz),
--       COALESCE(MAX(cb.timestamp), '1970-01-01'::timestamptz)
--     ) >= (NOW() - INTERVAL '15 minutes') THEN 'CONNECTED'
--     ELSE 'DISCONNECTED'
--   END as 
should_be_connected
-- FROM public.machines m
-- LEFT JOIN public.cirrus c ON c.machine_id = m.id
-- LEFT JOIN public.coolbreeze cb ON cb.machine_id = m.id
-- WHERE m.id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42'
-- GROUP BY m.id, m.name, m.type, m.manufacturer, m.is_connected, m.current, m.voltage, m.updated_at;

-- 2. Check latest 5 readings from Cirrus table
SELECT 
  timestamp,
  current,
  voltage,
  power,
  is_connected,
  motor_temp,
  ambient_temp,
  duct_temp
FROM public.cirrus
WHERE machine_id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42'  -- Replace with your machine ID
ORDER BY timestamp DESC
LIMIT 5;

-- 3. Check latest 5 readings from CoolBreeze table
SELECT 
  timestamp,
  current,
  voltage,
  power,
  is_connected,
  motor_temp,
  ambient_temp,
  duct_temp
FROM public.coolbreeze
WHERE machine_id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42'  -- Replace with your machine ID
ORDER BY timestamp DESC
LIMIT 5;

-- 4. Manually trigger update for your machine (run this to force update)
SELECT public.update_machine_from_latest_reading('c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42');  -- Replace with your machine ID

-- 4b. After running the update above, check if it worked:
SELECT id, name, is_connected, current, updated_at
FROM public.machines
WHERE id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42';

-- 5. Check machines table after update
SELECT 
  id,
  name,
  is_connected,
  current,
  voltage,
  motor_temp,
  outside_temp,
  inside_temp,
  updated_at
FROM public.machines
WHERE id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42';  -- Replace with your machine ID

-- 6. Check if triggers are active
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE event_object_table IN ('cirrus', 'coolbreeze')
AND trigger_name LIKE '%update_machine%';

