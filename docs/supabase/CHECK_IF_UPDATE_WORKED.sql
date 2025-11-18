-- Check if the update function worked
-- Run this AFTER running: SELECT public.update_machine_from_latest_reading('YOUR_MACHINE_ID');

-- Replace 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42' with your machine ID

-- Check machines table
SELECT 
  id,
  name,
  is_connected,
  current,
  voltage,
  motor_temp,
  outside_temp,
  inside_temp,
  updated_at
FROM public.machines
WHERE id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42';

-- Check if there's recent data in processing tables
SELECT 
  'cirrus' as source_table,
  timestamp,
  current,
  voltage,
  is_connected,
  motor_temp,
  ambient_temp as outside_temp,
  duct_temp as inside_temp
FROM public.cirrus
WHERE machine_id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42'
ORDER BY timestamp DESC
LIMIT 1

UNION ALL

SELECT 
  'coolbreeze' as source_table,
  timestamp,
  current,
  voltage,
  is_connected,
  motor_temp,
  ambient_temp as outside_temp,
  duct_temp as inside_temp
FROM public.coolbreeze
WHERE machine_id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42'
ORDER BY timestamp DESC
LIMIT 1;

-- Compare: What should be in machines table vs what is there
SELECT 
  'Expected (from latest reading)' as source,
  COALESCE(c.current, cb.current, 0) as current,
  COALESCE(c.voltage, cb.voltage, 0) as voltage,
  COALESCE(c.motor_temp, cb.motor_temp, 0) as motor_temp,
  COALESCE(c.ambient_temp, cb.ambient_temp, 0) as outside_temp,
  COALESCE(c.duct_temp, cb.duct_temp, 0) as inside_temp,
  CASE 
    WHEN GREATEST(
      COALESCE(c.timestamp, '1970-01-01'::timestamptz),
      COALESCE(cb.timestamp, '1970-01-01'::timestamptz)
    ) >= (NOW() - INTERVAL '15 minutes') THEN true
    ELSE false
  END as is_connected
FROM public.machines m
LEFT JOIN public.cirrus c ON c.machine_id = m.id
LEFT JOIN public.coolbreeze cb ON cb.machine_id = m.id
WHERE m.id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42'
ORDER BY GREATEST(
  COALESCE(c.timestamp, '1970-01-01'::timestamptz),
  COALESCE(cb.timestamp, '1970-01-01'::timestamptz)
) DESC
LIMIT 1

UNION ALL

SELECT 
  'Actual (in machines table)' as source,
  m.current,
  m.voltage,
  m.motor_temp,
  m.outside_temp,
  m.inside_temp,
  m.is_connected
FROM public.machines m
WHERE m.id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42';

