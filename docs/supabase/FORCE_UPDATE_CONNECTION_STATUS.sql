-- Force update connection status for a specific machine
-- This will manually call the update function and verify the result
-- Replace 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42' with your machine ID

-- Step 1: Show current state
SELECT 
  '=== CURRENT STATE ===' as step,
  'Cirrus Table' as source,
  c.timestamp,
  c.is_connected::int as is_connected,  -- Cast boolean to int for UNION compatibility
  EXTRACT(EPOCH FROM (NOW() - c.timestamp))/60 as minutes_ago
FROM public.cirrus c
WHERE c.machine_id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42'
ORDER BY c.timestamp DESC
LIMIT 1

UNION ALL

SELECT 
  '=== CURRENT STATE ===' as step,
  'Machines Table' as source,
  m.updated_at as timestamp,
  m.is_connected::int as is_connected,
  EXTRACT(EPOCH FROM (NOW() - m.updated_at))/60 as minutes_ago
FROM public.machines m
WHERE m.id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42';

-- Step 2: Force update
SELECT public.update_machine_from_latest_reading('c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42') as update_result;

-- Step 3: Show updated state
SELECT 
  '=== AFTER UPDATE ===' as step,
  'Machines Table' as source,
  m.updated_at as timestamp,
  m.is_connected::int as is_connected,
  EXTRACT(EPOCH FROM (NOW() - m.updated_at))/60 as minutes_ago,
  m.current,
  m.motor_temp
FROM public.machines m
WHERE m.id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42';

-- Step 4: If still not connected, check the function logic manually
-- This shows what the function should calculate
SELECT 
  '=== FUNCTION LOGIC CHECK ===' as step,
  c.is_connected as cirrus_is_connected,
  EXTRACT(EPOCH FROM (NOW() - c.timestamp))/60 as minutes_ago,
  (c.is_connected = true) as condition1,
  (EXTRACT(EPOCH FROM (NOW() - c.timestamp))/60 <= 15) as condition2,
  ((c.is_connected = true) AND (EXTRACT(EPOCH FROM (NOW() - c.timestamp))/60 <= 15)) as should_be_connected
FROM public.cirrus c
WHERE c.machine_id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42'
ORDER BY c.timestamp DESC
LIMIT 1;

