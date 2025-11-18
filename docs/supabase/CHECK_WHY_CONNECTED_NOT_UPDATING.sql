-- Check why Connected status is not updating
-- Run these queries in order to diagnose the issue

-- Replace 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42' with your machine ID

-- 1. Check if data is in cirrus table (most recent)
SELECT 
  timestamp,
  current,
  motor_temp,
  ambient_temp,
  duct_temp,
  is_connected as cirrus_says_connected,
  EXTRACT(EPOCH FROM (NOW() - timestamp))/60 as minutes_ago,
  CASE 
    WHEN timestamp >= (NOW() - INTERVAL '15 minutes') THEN 'SHOULD BE CONNECTED'
    ELSE 'SHOULD BE DISCONNECTED'
  END as connection_status
FROM public.cirrus
WHERE machine_id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42'
ORDER BY timestamp DESC
LIMIT 1;

-- 2. Check machines table current state
SELECT 
  id,
  name,
  is_connected,
  current,
  voltage,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - updated_at))/60 as minutes_since_machines_updated
FROM public.machines
WHERE id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42';

-- 3. Check if triggers are active
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'cirrus'
AND trigger_name LIKE '%update_machine%';

-- 4. Manually trigger update and see what happens
SELECT public.update_machine_from_latest_reading('c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42');

-- 5. Check machines table again
SELECT 
  id,
  name,
  is_connected,
  current,
  updated_at
FROM public.machines
WHERE id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42';

-- 6. Compare: What should be vs what is
SELECT 
  'Latest Cirrus Reading' as source,
  MAX(c.timestamp) as timestamp,
  MAX(c.current) as current,
  MAX(c.is_connected::int) as is_connected,  -- Cast boolean to int for MAX()
  EXTRACT(EPOCH FROM (NOW() - MAX(c.timestamp)))/60 as minutes_ago
FROM public.cirrus c
WHERE c.machine_id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42'

UNION ALL

SELECT 
  'Machines Table' as source,
  m.updated_at as timestamp,
  m.current,
  m.is_connected::int as is_connected,
  EXTRACT(EPOCH FROM (NOW() - m.updated_at))/60 as minutes_ago
FROM public.machines m
WHERE m.id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42';

