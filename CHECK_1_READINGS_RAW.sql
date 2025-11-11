-- Check if ANY data exists in readings_raw for this machine
SELECT 
  created_at,
  machine_id,
  motor_temp,
  current,
  is_on,
  overall_status,
  has_water,
  fan_active
FROM readings_raw
WHERE machine_id = '22066669-eb4a-4675-8916-bf4f235dfd85'
ORDER BY created_at DESC
LIMIT 5;


