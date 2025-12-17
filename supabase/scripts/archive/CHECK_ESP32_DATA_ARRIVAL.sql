-- ============================================================
-- Check if ESP32 data is arriving in readings_raw
-- ============================================================

-- Check last 10 readings for this specific machine
SELECT 
  created_at,
  machine_id,
  motor_temp,
  current,
  is_on,
  overall_status
FROM readings_raw
WHERE machine_id = '22066669-eb4a-4675-8916-bf4f235dfd85'
ORDER BY created_at DESC
LIMIT 10;

-- Check if ANY data exists in readings_raw
SELECT 
  COUNT(*) as total_readings,
  COUNT(DISTINCT machine_id) as unique_machines,
  MAX(created_at) as latest_reading
FROM readings_raw;

-- Check the machines table for this specific machine
SELECT 
  id,
  name,
  owner_id,
  motor_temp,
  current,
  is_on,
  overall_status,
  last_seen
FROM machines
WHERE id = '22066669-eb4a-4675-8916-bf4f235dfd85';

-- Check if trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'readings_raw';


