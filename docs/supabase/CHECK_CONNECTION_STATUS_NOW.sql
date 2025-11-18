-- Quick check: Is the machine actually connected?
-- Replace 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42' with your machine ID

-- 1. Latest reading in cirrus table
SELECT 
  'Cirrus Table' as source,
  timestamp,
  is_connected as cirrus_is_connected,
  EXTRACT(EPOCH FROM (NOW() - timestamp))/60 as minutes_ago,
  CASE 
    WHEN timestamp >= (NOW() - INTERVAL '15 minutes') THEN 'SHOULD BE CONNECTED'
    ELSE 'SHOULD BE DISCONNECTED'
  END as should_be_status
FROM public.cirrus
WHERE machine_id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42'
ORDER BY timestamp DESC
LIMIT 1;

-- 2. Current state in machines table
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

-- 3. Manually trigger the update function
SELECT public.update_machine_from_latest_reading('c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42') as update_result;

-- 4. Check machines table again after manual update
SELECT 
  'After Manual Update' as source,
  name,
  is_connected,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - updated_at))/60 as minutes_since_update,
  current,
  motor_temp
FROM public.machines
WHERE id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42';

