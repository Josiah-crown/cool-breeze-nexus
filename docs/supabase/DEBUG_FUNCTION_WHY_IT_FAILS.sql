-- Debug: Why is the function failing?
-- This shows exactly what the function sees and calculates

-- Replace 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42' with your machine ID

SELECT 
  'Function Input Values' as step,
  c.is_connected,
  c.is_connected::text as is_connected_text,
  (c.is_connected IS TRUE) as condition1_is_true_check,
  c.timestamp,
  NOW() as current_time,
  EXTRACT(EPOCH FROM (NOW() - c.timestamp)) as seconds_ago,
  EXTRACT(EPOCH FROM (NOW() - c.timestamp))/60 as minutes_ago,
  (EXTRACT(EPOCH FROM (NOW() - c.timestamp))/60 <= 15) as condition2_within_15min,
  ((c.is_connected IS TRUE) AND (EXTRACT(EPOCH FROM (NOW() - c.timestamp))/60 <= 15)) as final_result_should_be
FROM public.cirrus c
WHERE c.machine_id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42'
ORDER BY c.timestamp DESC
LIMIT 1;

-- Also check what the machines table currently has
SELECT 
  'Current Machines Table' as step,
  m.is_connected,
  m.updated_at,
  EXTRACT(EPOCH FROM (NOW() - m.updated_at))/60 as minutes_since_update
FROM public.machines m
WHERE m.id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42';

