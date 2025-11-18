-- Simple Connection Status Check
-- Run this query to see why Connected LED might not be showing

-- Replace 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42' with your actual machine ID

SELECT 
  m.id,
  m.name,
  m.type,
  m.manufacturer,
  m.is_connected as current_status_in_database,
  m.current,
  m.voltage,
  m.updated_at as machines_table_last_updated,
  GREATEST(
    COALESCE(MAX(c.timestamp), '1970-01-01'::timestamptz),
    COALESCE(MAX(cb.timestamp), '1970-01-01'::timestamptz)
  ) as last_reading_received,
  EXTRACT(EPOCH FROM (NOW() - GREATEST(
    COALESCE(MAX(c.timestamp), '1970-01-01'::timestamptz),
    COALESCE(MAX(cb.timestamp), '1970-01-01'::timestamptz)
  )))/60 as minutes_since_last_reading,
  CASE 
    WHEN GREATEST(
      COALESCE(MAX(c.timestamp), '1970-01-01'::timestamptz),
      COALESCE(MAX(cb.timestamp), '1970-01-01'::timestamptz)
    ) >= (NOW() - INTERVAL '15 minutes') THEN true
    ELSE false
  END as should_be_connected,
  (MAX(c.timestamp) IS NOT NULL) as has_cirrus_data,
  (MAX(cb.timestamp) IS NOT NULL) as has_coolbreeze_data
FROM public.machines m
LEFT JOIN public.cirrus c ON c.machine_id = m.id
LEFT JOIN public.coolbreeze cb ON cb.machine_id = m.id
WHERE m.id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42'
GROUP BY m.id, m.name, m.type, m.manufacturer, m.is_connected, m.current, m.voltage, m.updated_at;

-- After running the query above, check:
-- 1. If should_be_connected = true but current_status_in_database = false
--    → The trigger isn't updating. Run the manual update below.
-- 2. If minutes_since_last_reading < 15
--    → Machine should be connected
-- 3. If minutes_since_last_reading > 15
--    → Machine is actually disconnected (no recent data)

-- MANUAL FIX: Force update the machine status
SELECT public.update_machine_from_latest_reading('c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42');

-- Then check again:
SELECT id, name, is_connected, current, updated_at
FROM public.machines
WHERE id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42';

