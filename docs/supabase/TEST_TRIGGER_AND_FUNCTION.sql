-- Test if trigger is working and function logic is correct
-- Replace 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42' with your machine ID

-- Step 1: Check current state
SELECT 
  'BEFORE TEST' as step,
  m.is_connected,
  m.updated_at,
  c.is_connected as cirrus_is_connected,
  c.timestamp as cirrus_timestamp,
  EXTRACT(EPOCH FROM (NOW() - c.timestamp))/60 as minutes_ago
FROM public.machines m
LEFT JOIN (
  SELECT machine_id, is_connected, timestamp
  FROM public.cirrus
  WHERE machine_id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42'
  ORDER BY timestamp DESC
  LIMIT 1
) c ON c.machine_id = m.id
WHERE m.id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42';

-- Step 2: Manually call the update function
SELECT public.update_machine_from_latest_reading('c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42') as function_result;

-- Step 3: Check state after manual update
SELECT 
  'AFTER MANUAL UPDATE' as step,
  m.is_connected,
  m.updated_at,
  c.is_connected as cirrus_is_connected,
  c.timestamp as cirrus_timestamp,
  EXTRACT(EPOCH FROM (NOW() - c.timestamp))/60 as minutes_ago
FROM public.machines m
LEFT JOIN (
  SELECT machine_id, is_connected, timestamp
  FROM public.cirrus
  WHERE machine_id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42'
  ORDER BY timestamp DESC
  LIMIT 1
) c ON c.machine_id = m.id
WHERE m.id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42';

-- Step 4: Check if trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'cirrus'
  AND trigger_name LIKE '%update_machine%';

-- Step 5: Simulate a trigger by updating a row (this should fire the trigger)
-- First, let's see the latest cirrus row
SELECT 
  id,
  machine_id,
  timestamp,
  is_connected,
  current
FROM public.cirrus
WHERE machine_id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42'
ORDER BY timestamp DESC
LIMIT 1;

-- Step 6: Update the cirrus row to trigger the trigger (this should update machines table)
-- Note: This will only work if there's a row to update
UPDATE public.cirrus
SET current = current  -- No actual change, just to fire the trigger
WHERE machine_id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42'
  AND id = (
    SELECT id FROM public.cirrus 
    WHERE machine_id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42'
    ORDER BY timestamp DESC 
    LIMIT 1
  );

-- Step 7: Check state after trigger
SELECT 
  'AFTER TRIGGER' as step,
  m.is_connected,
  m.updated_at,
  c.is_connected as cirrus_is_connected,
  c.timestamp as cirrus_timestamp,
  EXTRACT(EPOCH FROM (NOW() - c.timestamp))/60 as minutes_ago
FROM public.machines m
LEFT JOIN (
  SELECT machine_id, is_connected, timestamp
  FROM public.cirrus
  WHERE machine_id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42'
  ORDER BY timestamp DESC
  LIMIT 1
) c ON c.machine_id = m.id
WHERE m.id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42';

