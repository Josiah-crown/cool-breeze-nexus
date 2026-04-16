-- ============================================================================
-- Check Recent Data and Timestamp Issues
-- ============================================================================
-- This will help diagnose why there's no data in the past 7 days
-- ============================================================================

-- Check the most recent timestamps in each table
SELECT 
  'cirrus' as table_name,
  MAX(timestamp) as latest_timestamp,
  MIN(timestamp) as earliest_timestamp,
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '7 days') as rows_last_7_days,
  COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '24 hours') as rows_last_24_hours
FROM cirrus
UNION ALL
SELECT 
  'alliance' as table_name,
  MAX(timestamp) as latest_timestamp,
  MIN(timestamp) as earliest_timestamp,
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '7 days') as rows_last_7_days,
  COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '24 hours') as rows_last_24_hours
FROM alliance
UNION ALL
SELECT 
  'coolbreeze' as table_name,
  MAX(timestamp) as latest_timestamp,
  MIN(timestamp) as earliest_timestamp,
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '7 days') as rows_last_7_days,
  COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '24 hours') as rows_last_24_hours
FROM coolbreeze;

-- Check specific machines' latest data
SELECT 
  'cirrus' as table_name,
  machine_id,
  MAX(timestamp) as latest_timestamp,
  COUNT(*) as total_rows
FROM cirrus
WHERE machine_id IN (
  'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42',
  '8dfa717a-0edf-40f5-b5f9-f662673c2066',
  '01aa6c63-2d54-4461-a3d7-e1006cf054eb'
)
GROUP BY machine_id
UNION ALL
SELECT 
  'alliance' as table_name,
  machine_id,
  MAX(timestamp) as latest_timestamp,
  COUNT(*) as total_rows
FROM alliance
WHERE machine_id IN (
  'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42',
  '8dfa717a-0edf-40f5-b5f9-f662673c2066',
  '01aa6c63-2d54-4461-a3d7-e1006cf054eb'
)
GROUP BY machine_id
UNION ALL
SELECT 
  'coolbreeze' as table_name,
  machine_id,
  MAX(timestamp) as latest_timestamp,
  COUNT(*) as total_rows
FROM coolbreeze
WHERE machine_id IN (
  'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42',
  '8dfa717a-0edf-40f5-b5f9-f662673c2066',
  '01aa6c63-2d54-4461-a3d7-e1006cf054eb'
)
GROUP BY machine_id
ORDER BY table_name, machine_id;

-- Check if there are any readings_raw entries (source data)
SELECT 
  MAX(created_at) as latest_raw_reading,
  COUNT(*) as total_raw_readings,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as raw_last_7_days
FROM readings_raw;

