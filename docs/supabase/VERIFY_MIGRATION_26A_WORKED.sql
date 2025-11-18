-- Verify Migration 26a worked correctly
-- Run this after running Part A to check if the function is working

-- Replace 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42' with your machine ID

-- Check what the function should see
SELECT 
  'What function sees' as info,
  c.is_connected as cirrus_is_connected,
  c.timestamp,
  EXTRACT(EPOCH FROM (NOW() - c.timestamp))/60 as minutes_ago,
  (c.is_connected IS TRUE) as condition1,
  (EXTRACT(EPOCH FROM (NOW() - c.timestamp))/60 <= 15) as condition2,
  ((c.is_connected IS TRUE) AND (EXTRACT(EPOCH FROM (NOW() - c.timestamp))/60 <= 15)) as should_be_connected
FROM public.cirrus c
WHERE c.machine_id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42'
ORDER BY c.timestamp DESC
LIMIT 1;

-- Check what machines table has now
SELECT 
  'Machines table status' as info,
  m.name,
  m.is_connected,
  m.updated_at,
  EXTRACT(EPOCH FROM (NOW() - m.updated_at))/60 as minutes_since_update,
  m.current,
  m.motor_temp
FROM public.machines m
WHERE m.id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42';

-- Compare: Should they match?
SELECT 
  'Comparison' as info,
  c.is_connected as cirrus_says,
  m.is_connected as machines_says,
  CASE 
    WHEN c.is_connected = m.is_connected THEN '✅ MATCH - Function is working!'
    ELSE '❌ MISMATCH - Function still has issues'
  END as result
FROM public.machines m
LEFT JOIN (
  SELECT machine_id, is_connected
  FROM public.cirrus
  WHERE machine_id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42'
  ORDER BY timestamp DESC
  LIMIT 1
) c ON c.machine_id = m.id
WHERE m.id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42';

