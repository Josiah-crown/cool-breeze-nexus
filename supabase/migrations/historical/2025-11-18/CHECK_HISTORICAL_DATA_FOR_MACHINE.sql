-- Check Historical Data for a Specific Machine
-- Replace 'YOUR_MACHINE_ID_HERE' with your actual machine ID

-- 1. First, find your machine ID and manufacturer
SELECT 
  id,
  name,
  type,
  manufacturer,
  owner_id,
  created_at
FROM public.machines
WHERE name LIKE '%Cirrus%' OR manufacturer = 'Cirrus'
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check if data exists in cirrus table for your machine
-- Replace 'YOUR_MACHINE_ID_HERE' with the actual machine ID from step 1
SELECT 
  COUNT(*) as total_records,
  MIN(timestamp) as oldest_record,
  MAX(timestamp) as newest_record,
  EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp)))/3600 as hours_span
FROM public.cirrus
WHERE machine_id = 'YOUR_MACHINE_ID_HERE';

-- 3. Check recent data (last 24 hours)
SELECT 
  COUNT(*) as records_last_24h,
  MIN(timestamp) as oldest_in_24h,
  MAX(timestamp) as newest_in_24h
FROM public.cirrus
WHERE machine_id = 'YOUR_MACHINE_ID_HERE'
  AND timestamp >= NOW() - INTERVAL '24 hours';

-- 4. Sample recent data points
SELECT 
  timestamp,
  ambient_temp,
  duct_temp,
  motor_temp,
  delta_t,
  current,
  voltage,
  power,
  fan_active,
  is_cooling,
  has_water
FROM public.cirrus
WHERE machine_id = 'YOUR_MACHINE_ID_HERE'
ORDER BY timestamp DESC
LIMIT 10;

-- 5. Check if machine has manufacturer set correctly
SELECT 
  id,
  name,
  type,
  manufacturer,
  CASE 
    WHEN manufacturer = 'Cirrus' THEN 'cirrus'
    WHEN manufacturer = 'CoolBreeze' THEN 'coolbreeze'
    ELSE 'unknown'
  END as expected_table
FROM public.machines
WHERE id = 'YOUR_MACHINE_ID_HERE';

-- 6. Quick check: All machines with their data counts
SELECT 
  m.id,
  m.name,
  m.type,
  m.manufacturer,
  COUNT(c.id) as cirrus_records,
  COUNT(cb.id) as coolbreeze_records
FROM public.machines m
LEFT JOIN public.cirrus c ON c.machine_id = m.id
LEFT JOIN public.coolbreeze cb ON cb.machine_id = m.id
GROUP BY m.id, m.name, m.type, m.manufacturer
ORDER BY m.created_at DESC;

