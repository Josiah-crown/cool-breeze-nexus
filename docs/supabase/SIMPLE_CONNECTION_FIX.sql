-- Simple diagnostic and fix for connection status
-- Replace 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42' with your machine ID

-- 1. Check what the function should see
SELECT 
  'What function sees' as info,
  c.is_connected as cirrus_says_connected,
  c.timestamp,
  EXTRACT(EPOCH FROM (NOW() - c.timestamp))/60 as minutes_ago,
  CASE 
    WHEN c.is_connected = true AND EXTRACT(EPOCH FROM (NOW() - c.timestamp))/60 <= 15 
    THEN 'SHOULD BE CONNECTED'
    ELSE 'SHOULD BE DISCONNECTED'
  END as expected_result
FROM public.cirrus c
WHERE c.machine_id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42'
ORDER BY c.timestamp DESC
LIMIT 1;

-- 2. Check what machines table currently has
SELECT 
  'Current machines table' as info,
  m.is_connected,
  m.updated_at,
  EXTRACT(EPOCH FROM (NOW() - m.updated_at))/60 as minutes_since_update
FROM public.machines m
WHERE m.id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42';

-- 3. Manually update (this should work if function is correct)
SELECT public.update_machine_from_latest_reading('c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42');

-- 4. Check machines table again
SELECT 
  'After manual update' as info,
  m.is_connected,
  m.updated_at,
  EXTRACT(EPOCH FROM (NOW() - m.updated_at))/60 as minutes_since_update
FROM public.machines m
WHERE m.id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42';

