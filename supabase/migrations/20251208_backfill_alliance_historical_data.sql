-- ========================================
-- ONE-TIME BACKFILL: Alliance Historical Data
-- ========================================
-- This migrates all readings_raw data for the Alliance heatpump
-- into the alliance table for historical graphs
-- Machine ID: 01aa6c63-2d54-4461-a3d7-e1006cf054eb
-- ========================================

-- First, let's see how many records we're dealing with
SELECT COUNT(*) as records_to_migrate 
FROM readings_raw 
WHERE machine_id = '01aa6c63-2d54-4461-a3d7-e1006cf054eb';

-- Now perform the backfill
INSERT INTO alliance (
  machine_id, 
  timestamp, 
  ambient_temp, 
  duct_temp, 
  motor_temp, 
  delta_t,
  voltage, 
  current, 
  power, 
  voltage_5,
  fan_active, 
  pump_active, 
  is_heating, 
  is_on, 
  is_connected, 
  has_water,
  overall_status, 
  motor_status, 
  heating_status, 
  compressor_status,
  status_details
)
SELECT 
  r.machine_id,
  COALESCE(r.created_at, NOW()) as timestamp,
  r.outside_temp as ambient_temp,
  r.inside_temp as duct_temp,
  r.motor_temp,
  COALESCE(r.inside_temp, 0) - COALESCE(r.outside_temp, 0) as delta_t,
  r.voltage,
  r.current,
  COALESCE(r.voltage, 0) * COALESCE(r.current, 0) as power,
  r.voltage_input_5 as voltage_5,
  false as fan_active,
  COALESCE(r.voltage_input_5, 0) >= 6.0 as pump_active,
  COALESCE(r.current, 0) > 1.0 as is_heating,
  COALESCE(r.voltage_input_5, 0) >= 6.0 as is_on,
  true as is_connected,
  COALESCE(r.voltage_input_5, 0) >= 6.0 as has_water,
  'operational' as overall_status,
  'normal' as motor_status,
  CASE WHEN COALESCE(r.voltage_input_5, 0) >= 6.0 AND COALESCE(r.current, 0) > 1.0 
       THEN 'active' ELSE 'idle' END as heating_status,
  CASE 
    WHEN COALESCE(r.voltage_input_5, 0) < 6.0 THEN 'good'  -- Pump off = good
    WHEN COALESCE(r.current, 0) > 1.0 AND (COALESCE(r.inside_temp, 0) - COALESCE(r.outside_temp, 0)) > 2 THEN 'good'  -- Heating well
    WHEN COALESCE(r.current, 0) > 1.0 AND COALESCE(r.current, 0) BETWEEN 0.5 AND 30.0 THEN 'good'  -- Current in range
    ELSE 'good'  -- Default to good for historical data
  END as compressor_status,
  jsonb_build_object(
    'pump_active', COALESCE(r.voltage_input_5, 0) >= 6.0,
    'has_heat', COALESCE(r.current, 0) > 1.0,
    'backfilled', true
  ) as status_details
FROM readings_raw r
WHERE r.machine_id = '01aa6c63-2d54-4461-a3d7-e1006cf054eb'
ON CONFLICT (machine_id, timestamp) DO NOTHING;

-- Check how many records were inserted
SELECT COUNT(*) as total_alliance_records 
FROM alliance 
WHERE machine_id = '01aa6c63-2d54-4461-a3d7-e1006cf054eb';

-- Show date range of data
SELECT 
  MIN(timestamp) as oldest,
  MAX(timestamp) as newest,
  COUNT(*) as total_records
FROM alliance 
WHERE machine_id = '01aa6c63-2d54-4461-a3d7-e1006cf054eb';

