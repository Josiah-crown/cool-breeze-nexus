-- Run this in Supabase SQL Editor to check if ESP32 data is arriving

-- 1. Check if machine exists
SELECT id, name, type, owner_id, created_at
FROM machines
ORDER BY created_at DESC
LIMIT 5;

-- 2. Check latest readings (should show ESP32 data)
SELECT 
  machine_id, 
  motor_temp, 
  outside_temp, 
  inside_temp, 
  current,
  is_on,
  overall_status,
  created_at
FROM readings_raw
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check if API key is assigned to machine
SELECT 
  k.id,
  k.key,
  k.machine_id,
  m.name as machine_name,
  k.is_active
FROM api_keys k
LEFT JOIN machines m ON k.machine_id = m.id
ORDER BY k.created_at DESC
LIMIT 5;


