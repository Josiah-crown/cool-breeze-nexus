-- Check if the machine exists and has updated data
SELECT 
  id,
  name,
  machine_type,
  owner_id,
  motor_temp,
  current,
  is_on,
  overall_status,
  has_water,
  fan_active,
  last_seen,
  updated_at
FROM machines
WHERE id = '22066669-eb4a-4675-8916-bf4f235dfd85';


