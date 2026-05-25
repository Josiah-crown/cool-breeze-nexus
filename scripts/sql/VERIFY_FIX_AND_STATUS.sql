-- ============================================================================
-- Verify Fix and Check Current Status
-- ============================================================================

-- 1. Check if policies were updated correctly
SELECT 
  tablename,
  policyname,
  cmd,
  roles,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('cirrus', 'alliance', 'coolbreeze')
  AND cmd = 'INSERT'
ORDER BY tablename, policyname;

-- 2. Check latest data in readings_raw (are devices still sending?)
SELECT 
  MAX(created_at) as latest_reading_raw,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as readings_last_24h,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as readings_last_7d
FROM readings_raw;

-- 3. Check latest data in processed tables
SELECT 
  'cirrus' as table_name,
  MAX(timestamp) as latest_timestamp,
  COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '24 hours') as rows_last_24h
FROM cirrus
UNION ALL
SELECT 
  'alliance' as table_name,
  MAX(timestamp) as latest_timestamp,
  COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '24 hours') as rows_last_24h
FROM alliance
UNION ALL
SELECT 
  'coolbreeze' as table_name,
  MAX(timestamp) as latest_timestamp,
  COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '24 hours') as rows_last_24h
FROM coolbreeze;

-- 4. Check if there are any readings_raw entries that should have been processed but weren't
-- (Compare timestamps - if readings_raw has newer data than processed tables, triggers might have failed)
SELECT 
  'Unprocessed readings_raw entries' as status,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM readings_raw
WHERE created_at > (
  SELECT GREATEST(
    COALESCE((SELECT MAX(timestamp) FROM cirrus), '1970-01-01'::timestamptz),
    COALESCE((SELECT MAX(timestamp) FROM alliance), '1970-01-01'::timestamptz),
    COALESCE((SELECT MAX(timestamp) FROM coolbreeze), '1970-01-01'::timestamptz)
  )
);

