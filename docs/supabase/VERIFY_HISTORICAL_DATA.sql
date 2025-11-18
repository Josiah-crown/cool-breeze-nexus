-- Verify Historical Data Storage
-- This script checks if historical data is being stored correctly in cirrus and coolbreeze tables

-- 1. Check total counts in each table
SELECT 
  'cirrus' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT machine_id) as unique_machines,
  MIN(timestamp) as oldest_record,
  MAX(timestamp) as newest_record
FROM public.cirrus
UNION ALL
SELECT 
  'coolbreeze' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT machine_id) as unique_machines,
  MIN(timestamp) as oldest_record,
  MAX(timestamp) as newest_record
FROM public.coolbreeze;

-- 2. Check data distribution by machine
SELECT 
  'cirrus' as table_name,
  machine_id,
  COUNT(*) as record_count,
  MIN(timestamp) as first_reading,
  MAX(timestamp) as last_reading,
  EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp)))/3600 as hours_span
FROM public.cirrus
GROUP BY machine_id
ORDER BY record_count DESC
LIMIT 10;

-- 3. Check recent data (last 24 hours)
SELECT 
  'cirrus' as table_name,
  COUNT(*) as records_last_24h,
  COUNT(DISTINCT machine_id) as machines_with_data
FROM public.cirrus
WHERE timestamp >= NOW() - INTERVAL '24 hours'
UNION ALL
SELECT 
  'coolbreeze' as table_name,
  COUNT(*) as records_last_24h,
  COUNT(DISTINCT machine_id) as machines_with_data
FROM public.coolbreeze
WHERE timestamp >= NOW() - INTERVAL '24 hours';

-- 4. Check data quality - verify required fields are populated
SELECT 
  'cirrus' as table_name,
  COUNT(*) as total,
  COUNT(ambient_temp) as has_ambient_temp,
  COUNT(duct_temp) as has_duct_temp,
  COUNT(motor_temp) as has_motor_temp,
  COUNT(current) as has_current,
  COUNT(voltage) as has_voltage,
  COUNT(power) as has_power,
  COUNT(delta_t) as has_delta_t
FROM public.cirrus
UNION ALL
SELECT 
  'coolbreeze' as table_name,
  COUNT(*) as total,
  COUNT(ambient_temp) as has_ambient_temp,
  COUNT(duct_temp) as has_duct_temp,
  COUNT(motor_temp) as has_motor_temp,
  COUNT(current) as has_current,
  COUNT(voltage) as has_voltage,
  COUNT(power) as has_power,
  COUNT(delta_t) as has_delta_t
FROM public.coolbreeze;

-- 5. Check data retention - verify old data exists (should have data up to 1 year)
SELECT 
  'cirrus' as table_name,
  COUNT(*) as records_older_than_1_year
FROM public.cirrus
WHERE timestamp < NOW() - INTERVAL '1 year'
UNION ALL
SELECT 
  'coolbreeze' as table_name,
  COUNT(*) as records_older_than_1_year
FROM public.coolbreeze
WHERE timestamp < NOW() - INTERVAL '1 year';

-- 6. Sample recent data for a specific machine (replace with actual machine_id)
-- SELECT 
--   machine_id,
--   timestamp,
--   ambient_temp,
--   duct_temp,
--   motor_temp,
--   delta_t,
--   current,
--   voltage,
--   power,
--   fan_active,
--   is_cooling,
--   has_water
-- FROM public.cirrus
-- WHERE machine_id = 'YOUR_MACHINE_ID_HERE'
-- ORDER BY timestamp DESC
-- LIMIT 10;

-- 7. Check if indexes exist (performance check)
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('cirrus', 'coolbreeze')
  AND schemaname = 'public'
ORDER BY tablename, indexname;

