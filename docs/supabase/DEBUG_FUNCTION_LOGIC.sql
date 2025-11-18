-- Debug: See what the function is actually calculating
-- Replace 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42' with your machine ID

-- Show what the function should see
SELECT 
  'Function Input' as step,
  c.is_connected as cirrus_is_connected,
  EXTRACT(EPOCH FROM (NOW() - c.timestamp))/60 as minutes_ago,
  (c.is_connected = true) as condition1_is_true,
  (EXTRACT(EPOCH FROM (NOW() - c.timestamp))/60 <= 15) as condition2_is_true,
  (c.is_connected = true AND EXTRACT(EPOCH FROM (NOW() - c.timestamp))/60 <= 15) as final_result_should_be
FROM public.cirrus c
WHERE c.machine_id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42'
ORDER BY c.timestamp DESC
LIMIT 1;

-- Check what machines table has
SELECT 
  'Current Machines Table' as step,
  is_connected,
  updated_at
FROM public.machines
WHERE id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42';

