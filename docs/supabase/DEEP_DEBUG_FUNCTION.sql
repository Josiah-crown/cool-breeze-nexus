-- Deep debug: See exactly what the function sees vs what direct fix sees
-- Replace 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42' with your machine ID

-- What the function should see (from cirrus table)
SELECT 
  '=== CIRRUS TABLE DATA ===' as section,
  c.machine_id,
  c.timestamp,
  c.is_connected,
  c.is_connected::text as is_connected_text,
  c.is_connected::int as is_connected_int,
  EXTRACT(EPOCH FROM (NOW() - c.timestamp)) as seconds_ago,
  EXTRACT(EPOCH FROM (NOW() - c.timestamp))/60 as minutes_ago,
  (c.is_connected = true) as test_equals_true,
  (c.is_connected IS TRUE) as test_is_true,
  (c.is_connected IS NOT FALSE) as test_is_not_false,
  (c.is_connected = true AND EXTRACT(EPOCH FROM (NOW() - c.timestamp))/60 <= 15) as direct_fix_logic,
  ((c.is_connected IS TRUE) AND (EXTRACT(EPOCH FROM (NOW() - c.timestamp))/60 <= 15)) as function_logic_is_true,
  ((c.is_connected = true) AND (EXTRACT(EPOCH FROM (NOW() - c.timestamp))/60 <= 15)) as function_logic_equals_true
FROM public.cirrus c
WHERE c.machine_id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42'
ORDER BY c.timestamp DESC
LIMIT 1;

-- What machines table currently has
SELECT 
  '=== MACHINES TABLE CURRENT ===' as section,
  m.id,
  m.name,
  m.is_connected,
  m.is_connected::text as is_connected_text,
  m.updated_at,
  EXTRACT(EPOCH FROM (NOW() - m.updated_at))/60 as minutes_since_update
FROM public.machines m
WHERE m.id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42';

-- Simulate what the function should calculate
WITH latest_cirrus AS (
  SELECT 
    machine_id,
    is_connected,
    timestamp,
    motor_temp,
    ambient_temp,
    duct_temp,
    delta_t,
    current,
    voltage,
    power,
    is_on,
    is_cooling,
    fan_active,
    has_water,
    overall_status,
    motor_status,
    EXTRACT(EPOCH FROM (NOW() - timestamp))/60 as minutes_ago
  FROM public.cirrus
  WHERE machine_id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42'
  ORDER BY timestamp DESC
  LIMIT 1
)
SELECT 
  '=== FUNCTION SIMULATION ===' as section,
  lc.is_connected as cirrus_is_connected,
  lc.minutes_ago,
  (lc.is_connected = true) as condition1,
  (lc.minutes_ago <= 15) as condition2,
  ((lc.is_connected = true) AND (lc.minutes_ago <= 15)) as should_be_connected,
  CASE 
    WHEN (lc.is_connected = true) AND (lc.minutes_ago <= 15) THEN 'CONNECTED'
    ELSE 'DISCONNECTED'
  END as expected_result
FROM latest_cirrus lc;

