-- Simple diagnostic - run each query separately
-- Replace 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42' with your machine ID

-- Query 1: Check Cirrus table
SELECT 
  'Cirrus Table' as source,
  timestamp,
  is_connected,
  EXTRACT(EPOCH FROM (NOW() - timestamp))/60 as minutes_ago
FROM public.cirrus
WHERE machine_id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42'
ORDER BY timestamp DESC
LIMIT 1;

-- Query 2: Check Machines table
SELECT 
  'Machines Table' as source,
  name,
  is_connected,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - updated_at))/60 as minutes_since_update,
  current,
  motor_temp
FROM public.machines
WHERE id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42';

-- Query 3: Manually update
SELECT public.update_machine_from_latest_reading('c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42') as update_result;

-- Query 4: Check Machines table again
SELECT 
  'After Update' as source,
  name,
  is_connected,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - updated_at))/60 as minutes_since_update,
  current,
  motor_temp
FROM public.machines
WHERE id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42';

