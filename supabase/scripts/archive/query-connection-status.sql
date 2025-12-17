-- Query connection status for debugging
SELECT 
  '=== CIRRUS TABLE ===' as section,
  c.timestamp,
  c.is_connected,
  EXTRACT(EPOCH FROM (NOW() - c.timestamp))/60 as minutes_ago,
  c.current
FROM public.cirrus c
WHERE c.machine_id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42'
ORDER BY c.timestamp DESC
LIMIT 1;

SELECT 
  '=== MACHINES TABLE ===' as section,
  m.name,
  m.is_connected,
  m.updated_at,
  EXTRACT(EPOCH FROM (NOW() - m.updated_at))/60 as minutes_since_update,
  m.current
FROM public.machines m
WHERE m.id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42';

SELECT 
  '=== DIAGNOSTIC ===' as section,
  c.is_connected as cirrus_says,
  m.is_connected as machines_says,
  (c.is_connected = m.is_connected) as match,
  CASE 
    WHEN c.is_connected = true AND EXTRACT(EPOCH FROM (NOW() - c.timestamp))/60 <= 15 
    THEN 'SHOULD BE CONNECTED'
    ELSE 'SHOULD BE DISCONNECTED'
  END as expected_status
FROM public.machines m
LEFT JOIN (
  SELECT machine_id, is_connected, timestamp
  FROM public.cirrus
  WHERE machine_id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42'
  ORDER BY timestamp DESC
  LIMIT 1
) c ON c.machine_id = m.id
WHERE m.id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42';

