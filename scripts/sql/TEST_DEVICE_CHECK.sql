-- ============================================================================
-- Test Device Data Check
-- Run this after sending test data from your device to verify processing
-- ============================================================================

-- 1. Check if new data arrived in readings_raw
SELECT 
  'readings_raw' as table_name,
  COUNT(*) as total_rows,
  MAX(created_at) as latest_entry,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '5 minutes') as last_5_min,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as last_hour
FROM readings_raw;

-- 2. Check if data was processed into the processed tables
SELECT 
  'cirrus' as table_name,
  COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '5 minutes') as last_5_min,
  COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '1 hour') as last_hour,
  MAX(timestamp) as latest_timestamp
FROM cirrus
UNION ALL
SELECT 
  'alliance' as table_name,
  COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '5 minutes') as last_5_min,
  COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '1 hour') as last_hour,
  MAX(timestamp) as latest_timestamp
FROM alliance
UNION ALL
SELECT 
  'coolbreeze' as table_name,
  COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '5 minutes') as last_5_min,
  COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '1 hour') as last_hour,
  MAX(timestamp) as latest_timestamp
FROM coolbreeze;

-- 3. Compare: readings_raw entries vs processed entries in last hour
-- If readings_raw has entries but processed tables don't, triggers are failing
SELECT 
  (SELECT COUNT(*) FROM readings_raw WHERE created_at > NOW() - INTERVAL '1 hour') as readings_raw_count,
  (SELECT COUNT(*) FROM cirrus WHERE timestamp > NOW() - INTERVAL '1 hour') as cirrus_processed_count,
  (SELECT COUNT(*) FROM alliance WHERE timestamp > NOW() - INTERVAL '1 hour') as alliance_processed_count,
  (SELECT COUNT(*) FROM coolbreeze WHERE timestamp > NOW() - INTERVAL '1 hour') as coolbreeze_processed_count;

-- 4. Check for any trigger errors in the last hour (if available in logs)
-- Note: This requires checking Supabase logs, not SQL

