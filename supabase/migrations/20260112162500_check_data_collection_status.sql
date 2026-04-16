-- ============================================================================
-- Check Data Collection Status (Why data stopped 7 days ago)
-- ============================================================================
-- Run this to see when data collection stopped and check triggers/functions
-- ============================================================================

-- 1. Check most recent data in each table
SELECT 
  'cirrus' as table_name,
  MAX(timestamp) as latest_timestamp,
  NOW() - MAX(timestamp) as time_since_last_data,
  COUNT(*) as total_rows
FROM cirrus
UNION ALL
SELECT 
  'alliance' as table_name,
  MAX(timestamp) as latest_timestamp,
  NOW() - MAX(timestamp) as time_since_last_data,
  COUNT(*) as total_rows
FROM alliance
UNION ALL
SELECT 
  'coolbreeze' as table_name,
  MAX(timestamp) as latest_timestamp,
  NOW() - MAX(timestamp) as time_since_last_data,
  COUNT(*) as total_rows
FROM coolbreeze;

-- 2. Check if triggers exist on readings_raw
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'readings_raw'
ORDER BY trigger_name;

-- 3. Check if processing functions exist
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%process%reading%'
ORDER BY routine_name;

-- 4. Check recent readings_raw data
SELECT 
  MAX(created_at) as latest_raw_reading,
  COUNT(*) as total_raw_readings,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as raw_last_7_days
FROM readings_raw;

-- 5. Check if there are any errors in the system (check logs if available)
-- Note: This would require checking Supabase logs dashboard

