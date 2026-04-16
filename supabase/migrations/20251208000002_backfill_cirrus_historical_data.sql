-- ========================================
-- ONE-TIME BACKFILL: Cirrus Historical Data
-- ========================================
-- This migrates all readings_raw data for the Cirrus evaporative cooler
-- into the cirrus table for historical graphs
-- Machine ID: c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42
-- ========================================

-- First, let's see how many records we're dealing with
SELECT COUNT(*) as records_to_migrate 
FROM readings_raw 
WHERE machine_id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42';

-- Now perform the backfill
INSERT INTO cirrus (
  machine_id, 
  timestamp, 
  ambient_temp, 
  duct_temp, 
  motor_temp, 
  delta_t,
  voltage, 
  current, 
  power,
  fan_active, 
  pump_active, 
  drain_active,
  exhaust_active,
  is_cooling, 
  is_on, 
  is_connected, 
  has_water,
  overall_status, 
  motor_status, 
  water_status,
  cooling_status,
  status_details
)
SELECT 
  r.machine_id,
  COALESCE(r.created_at, NOW()) as timestamp,
  r.outside_temp as ambient_temp,
  r.inside_temp as duct_temp,
  r.motor_temp,
  ABS(COALESCE(r.outside_temp, 0) - COALESCE(r.inside_temp, 0)) as delta_t,
  r.voltage,
  r.current,
  COALESCE(r.voltage, 0) * COALESCE(r.current, 0) as power,
  COALESCE(r.voltage_input_1, 0) >= 6.0 as fan_active,
  COALESCE(r.voltage_input_2, 0) >= 6.0 as pump_active,
  COALESCE(r.voltage_input_3, 0) >= 6.0 as drain_active,
  COALESCE(r.voltage_input_4, 0) >= 6.0 as exhaust_active,
  (COALESCE(r.voltage_input_1, 0) >= 6.0 AND COALESCE(r.voltage_input_2, 0) >= 6.0) as is_cooling,
  (COALESCE(r.voltage_input_1, 0) >= 6.0 OR COALESCE(r.voltage_input_2, 0) >= 6.0) as is_on,
  true as is_connected,
  COALESCE(r.has_water, COALESCE(r.voltage_input_5, 0) >= 6.0, true) as has_water,
  'operational' as overall_status,
  'normal' as motor_status,
  CASE WHEN COALESCE(r.has_water, true) THEN 'ok' ELSE 'empty' END as water_status,
  CASE WHEN COALESCE(r.voltage_input_1, 0) >= 6.0 AND COALESCE(r.voltage_input_2, 0) >= 6.0 
       THEN 'active' ELSE 'idle' END as cooling_status,
  jsonb_build_object(
    'fan_active', COALESCE(r.voltage_input_1, 0) >= 6.0,
    'pump_active', COALESCE(r.voltage_input_2, 0) >= 6.0,
    'has_water', COALESCE(r.has_water, true),
    'backfilled', true
  ) as status_details
FROM readings_raw r
WHERE r.machine_id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42'
ON CONFLICT (machine_id, timestamp) DO NOTHING;

-- Check how many records were inserted
SELECT COUNT(*) as total_cirrus_records 
FROM cirrus 
WHERE machine_id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42';

-- Show date range of data
SELECT 
  MIN(timestamp) as oldest,
  MAX(timestamp) as newest,
  COUNT(*) as total_records
FROM cirrus 
WHERE machine_id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42';

