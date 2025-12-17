-- Check total readings in the database
SELECT 
  COUNT(*) as total_readings,
  COUNT(DISTINCT machine_id) as unique_machines,
  MAX(created_at) as latest_reading,
  MIN(created_at) as oldest_reading
FROM readings_raw;


