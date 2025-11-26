-- ========================================
-- VERIFY TRIGGER CHAIN
-- ========================================
-- Purpose: Verify that triggers fire correctly and update machine status
-- This script checks:
-- 1. Triggers exist and are enabled
-- 2. Trigger functions exist
-- 3. Test trigger firing with sample data
-- 4. Verify connection status updates
-- ========================================

-- ========================================
-- 1. CHECK TRIGGERS EXIST
-- ========================================
SELECT 
  'Trigger Existence Check' as check_type,
  trigger_name,
  event_object_table as table_name,
  event_manipulation as event,
  action_timing as timing,
  action_statement as function
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'trigger_auto_update_machine_on_cirrus_insert',
    'trigger_auto_update_machine_on_coolbreeze_insert',
    'trigger_auto_update_machine_on_alliance_insert'
  )
ORDER BY trigger_name;

-- ========================================
-- 2. CHECK TRIGGER FUNCTIONS EXIST
-- ========================================
SELECT 
  'Function Existence Check' as check_type,
  proname as function_name,
  CASE 
    WHEN proname IS NOT NULL THEN '✓ EXISTS'
    ELSE 'X MISSING'
  END as status
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND proname IN (
    'trigger_update_machine_on_cirrus_insert',
    'trigger_update_machine_on_coolbreeze_insert',
    'trigger_update_machine_on_alliance_insert',
    'update_machine_from_latest_reading'
  )
ORDER BY proname;

-- ========================================
-- 3. GET SAMPLE MACHINES FOR TESTING
-- ========================================
SELECT 
  'Sample Machines' as check_type,
  id as machine_id,
  name,
  type,
  manufacturer,
  is_connected,
  updated_at as last_updated
FROM public.machines
WHERE (type = 'evaporative' AND manufacturer = 'Cirrus')
   OR (type = 'evaporative' AND manufacturer = 'CoolBreeze')
   OR (type = 'heatpump' AND manufacturer = 'Alliance')
LIMIT 5;

-- ========================================
-- 4. CHECK LATEST READINGS FOR SAMPLE MACHINES
-- ========================================
-- Get latest readings from cirrus table
SELECT 
  'Latest Cirrus Readings' as check_type,
  machine_id,
  timestamp,
  fan_active,
  is_cooling,
  is_on,
  is_connected,
  motor_temp,
  ambient_temp,
  duct_temp,
  NOW() - timestamp as time_since_reading
FROM public.cirrus
WHERE machine_id IN (
  SELECT id FROM public.machines 
  WHERE type = 'evaporative' AND manufacturer = 'Cirrus'
  LIMIT 1
)
ORDER BY timestamp DESC
LIMIT 3;

-- Get latest readings from coolbreeze table
SELECT 
  'Latest CoolBreeze Readings' as check_type,
  machine_id,
  timestamp,
  fan_active,
  is_cooling,
  is_on,
  is_connected,
  motor_temp,
  ambient_temp,
  duct_temp,
  NOW() - timestamp as time_since_reading
FROM public.coolbreeze
WHERE machine_id IN (
  SELECT id FROM public.machines 
  WHERE type = 'evaporative' AND manufacturer = 'CoolBreeze'
  LIMIT 1
)
ORDER BY timestamp DESC
LIMIT 3;

-- Get latest readings from alliance table
SELECT 
  'Latest Alliance Readings' as check_type,
  machine_id,
  timestamp,
  fan_active,
  is_cooling,
  is_heating,
  is_on,
  is_connected,
  motor_temp,
  ambient_temp,
  duct_temp,
  NOW() - timestamp as time_since_reading
FROM public.alliance
WHERE machine_id IN (
  SELECT id FROM public.machines 
  WHERE type = 'heatpump' AND manufacturer = 'Alliance'
  LIMIT 1
)
ORDER BY timestamp DESC
LIMIT 3;

-- ========================================
-- 5. VERIFY MACHINE STATUS MATCHES LATEST READINGS
-- ========================================
-- Compare machines table with latest cirrus readings
SELECT 
  'Status Comparison - Cirrus' as check_type,
  m.id as machine_id,
  m.name,
  m.is_connected as machine_is_connected,
  m.fan_active as machine_fan_active,
  m.is_cooling as machine_is_cooling,
  m.motor_temp as machine_motor_temp,
  c.timestamp as latest_reading_time,
  c.is_connected as reading_is_connected,
  c.fan_active as reading_fan_active,
  c.is_cooling as reading_is_cooling,
  c.motor_temp as reading_motor_temp,
  CASE 
    WHEN c.timestamp IS NULL THEN 'No readings found'
    WHEN m.is_connected != c.is_connected THEN 'MISMATCH: Connection status'
    WHEN m.fan_active != c.fan_active THEN 'MISMATCH: Fan active'
    WHEN m.is_cooling != c.is_cooling THEN 'MISMATCH: Cooling status'
    WHEN ABS(COALESCE(m.motor_temp, 0) - COALESCE(c.motor_temp, 0)) > 0.1 THEN 'MISMATCH: Motor temp'
    WHEN NOW() - c.timestamp > INTERVAL '5 minutes' AND m.is_connected THEN 'WARNING: Should be disconnected (>5 min)'
    ELSE '✓ MATCH'
  END as status
FROM public.machines m
LEFT JOIN LATERAL (
  SELECT * FROM public.cirrus
  WHERE machine_id = m.id
  ORDER BY timestamp DESC
  LIMIT 1
) c ON true
WHERE m.type = 'evaporative' AND m.manufacturer = 'Cirrus'
LIMIT 5;

-- Compare machines table with latest coolbreeze readings
SELECT 
  'Status Comparison - CoolBreeze' as check_type,
  m.id as machine_id,
  m.name,
  m.is_connected as machine_is_connected,
  m.fan_active as machine_fan_active,
  m.is_cooling as machine_is_cooling,
  m.motor_temp as machine_motor_temp,
  c.timestamp as latest_reading_time,
  c.is_connected as reading_is_connected,
  c.fan_active as reading_fan_active,
  c.is_cooling as reading_is_cooling,
  c.motor_temp as reading_motor_temp,
  CASE 
    WHEN c.timestamp IS NULL THEN 'No readings found'
    WHEN m.is_connected != c.is_connected THEN 'MISMATCH: Connection status'
    WHEN m.fan_active != c.fan_active THEN 'MISMATCH: Fan active'
    WHEN m.is_cooling != c.is_cooling THEN 'MISMATCH: Cooling status'
    WHEN ABS(COALESCE(m.motor_temp, 0) - COALESCE(c.motor_temp, 0)) > 0.1 THEN 'MISMATCH: Motor temp'
    WHEN NOW() - c.timestamp > INTERVAL '5 minutes' AND m.is_connected THEN 'WARNING: Should be disconnected (>5 min)'
    ELSE '✓ MATCH'
  END as status
FROM public.machines m
LEFT JOIN LATERAL (
  SELECT * FROM public.coolbreeze
  WHERE machine_id = m.id
  ORDER BY timestamp DESC
  LIMIT 1
) c ON true
WHERE m.type = 'evaporative' AND m.manufacturer = 'CoolBreeze'
LIMIT 5;

-- Compare machines table with latest alliance readings
SELECT 
  'Status Comparison - Alliance' as check_type,
  m.id as machine_id,
  m.name,
  m.is_connected as machine_is_connected,
  m.fan_active as machine_fan_active,
  m.is_cooling as machine_is_cooling,
  m.motor_temp as machine_motor_temp,
  a.timestamp as latest_reading_time,
  a.is_connected as reading_is_connected,
  a.fan_active as reading_fan_active,
  a.is_cooling as reading_is_cooling,
  a.motor_temp as reading_motor_temp,
  CASE 
    WHEN a.timestamp IS NULL THEN 'No readings found'
    WHEN m.is_connected != a.is_connected THEN 'MISMATCH: Connection status'
    WHEN m.fan_active != a.fan_active THEN 'MISMATCH: Fan active'
    WHEN m.is_cooling != a.is_cooling THEN 'MISMATCH: Cooling status'
    WHEN ABS(COALESCE(m.motor_temp, 0) - COALESCE(a.motor_temp, 0)) > 0.1 THEN 'MISMATCH: Motor temp'
    WHEN NOW() - a.timestamp > INTERVAL '5 minutes' AND m.is_connected THEN 'WARNING: Should be disconnected (>5 min)'
    ELSE '✓ MATCH'
  END as status
FROM public.machines m
LEFT JOIN LATERAL (
  SELECT * FROM public.alliance
  WHERE machine_id = m.id
  ORDER BY timestamp DESC
  LIMIT 1
) a ON true
WHERE m.type = 'heatpump' AND m.manufacturer = 'Alliance'
LIMIT 5;

-- ========================================
-- 6. CHECK DISCONNECTED MACHINES (>5 MINUTES)
-- ========================================
-- Machines that should be marked as disconnected
SELECT 
  'Disconnected Machines Check' as check_type,
  m.id as machine_id,
  m.name,
  m.is_connected as machine_is_connected,
  c.timestamp as last_reading_time,
  NOW() - c.timestamp as time_since_reading,
  CASE 
    WHEN c.timestamp IS NULL THEN 'No readings - should be disconnected'
    WHEN NOW() - c.timestamp > INTERVAL '5 minutes' AND m.is_connected THEN '⚠️ Should be disconnected (>5 min)'
    WHEN NOW() - c.timestamp <= INTERVAL '5 minutes' AND NOT m.is_connected THEN '⚠️ Should be connected (<5 min)'
    ELSE '✓ Correct'
  END as status
FROM public.machines m
LEFT JOIN LATERAL (
  SELECT timestamp FROM public.cirrus
  WHERE machine_id = m.id
  ORDER BY timestamp DESC
  LIMIT 1
) c ON true
WHERE m.type = 'evaporative' AND m.manufacturer = 'Cirrus'
UNION ALL
SELECT 
  'Disconnected Machines Check' as check_type,
  m.id as machine_id,
  m.name,
  m.is_connected as machine_is_connected,
  c.timestamp as last_reading_time,
  NOW() - c.timestamp as time_since_reading,
  CASE 
    WHEN c.timestamp IS NULL THEN 'No readings - should be disconnected'
    WHEN NOW() - c.timestamp > INTERVAL '5 minutes' AND m.is_connected THEN '⚠️ Should be disconnected (>5 min)'
    WHEN NOW() - c.timestamp <= INTERVAL '5 minutes' AND NOT m.is_connected THEN '⚠️ Should be connected (<5 min)'
    ELSE '✓ Correct'
  END as status
FROM public.machines m
LEFT JOIN LATERAL (
  SELECT timestamp FROM public.coolbreeze
  WHERE machine_id = m.id
  ORDER BY timestamp DESC
  LIMIT 1
) c ON true
WHERE m.type = 'evaporative' AND m.manufacturer = 'CoolBreeze'
UNION ALL
SELECT 
  'Disconnected Machines Check' as check_type,
  m.id as machine_id,
  m.name,
  m.is_connected as machine_is_connected,
  a.timestamp as last_reading_time,
  NOW() - a.timestamp as time_since_reading,
  CASE 
    WHEN a.timestamp IS NULL THEN 'No readings - should be disconnected'
    WHEN NOW() - a.timestamp > INTERVAL '5 minutes' AND m.is_connected THEN '⚠️ Should be disconnected (>5 min)'
    WHEN NOW() - a.timestamp <= INTERVAL '5 minutes' AND NOT m.is_connected THEN '⚠️ Should be connected (<5 min)'
    ELSE '✓ Correct'
  END as status
FROM public.machines m
LEFT JOIN LATERAL (
  SELECT timestamp FROM public.alliance
  WHERE machine_id = m.id
  ORDER BY timestamp DESC
  LIMIT 1
) a ON true
WHERE m.type = 'heatpump' AND m.manufacturer = 'Alliance';

-- ========================================
-- 7. SUMMARY
-- ========================================
SELECT 
  'Summary' as check_type,
  COUNT(DISTINCT CASE WHEN m.type = 'evaporative' AND m.manufacturer = 'Cirrus' THEN m.id END) as cirrus_machines,
  COUNT(DISTINCT CASE WHEN m.type = 'evaporative' AND m.manufacturer = 'CoolBreeze' THEN m.id END) as coolbreeze_machines,
  COUNT(DISTINCT CASE WHEN m.type = 'heatpump' AND m.manufacturer = 'Alliance' THEN m.id END) as alliance_machines,
  COUNT(DISTINCT CASE WHEN m.is_connected THEN m.id END) as connected_machines,
  COUNT(DISTINCT CASE WHEN NOT m.is_connected THEN m.id END) as disconnected_machines
FROM public.machines m;

