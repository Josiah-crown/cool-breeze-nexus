-- Quick Diagnostic: Check Everything at Once
-- Run this to see the current state of your setup

WITH machine_info AS (
  SELECT 
    id,
    name,
    type,
    manufacturer,
    owner_id,
    created_at
  FROM public.machines
  WHERE type = 'evaporative'
  ORDER BY created_at DESC
  LIMIT 5
)
SELECT 
  m.id as machine_id,
  m.name,
  m.type,
  m.manufacturer,
  CASE 
    WHEN m.manufacturer IS NULL THEN '❌ NULL - NEEDS FIX'
    WHEN m.manufacturer = 'Cirrus' THEN '✅ Cirrus'
    WHEN m.manufacturer = 'CoolBreeze' THEN '✅ CoolBreeze'
    ELSE '⚠️ ' || m.manufacturer
  END as manufacturer_status,
  CASE 
    WHEN m.manufacturer = 'Cirrus' THEN 'cirrus'
    WHEN m.manufacturer = 'CoolBreeze' THEN 'coolbreeze'
    WHEN m.type = 'evaporative' THEN 'cirrus (default)'
    ELSE 'unknown'
  END as expected_table,
  COUNT(c.id) as total_cirrus_records,
  COUNT(c.id) FILTER (WHERE c.timestamp >= NOW() - INTERVAL '24 hours') as records_last_24h,
  MAX(c.timestamp) as latest_reading,
  CASE 
    WHEN MAX(c.timestamp) IS NULL THEN '❌ No data'
    WHEN MAX(c.timestamp) >= NOW() - INTERVAL '15 minutes' THEN '✅ Recent'
    WHEN MAX(c.timestamp) >= NOW() - INTERVAL '1 hour' THEN '⚠️ Old (>15min)'
    ELSE '❌ Very old'
  END as data_status
FROM machine_info m
LEFT JOIN public.cirrus c ON c.machine_id = m.id
GROUP BY m.id, m.name, m.type, m.manufacturer, m.created_at
ORDER BY m.created_at DESC;

