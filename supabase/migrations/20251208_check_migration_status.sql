-- ========================================
-- CHECK MIGRATION STATUS (UTILITY SCRIPT - NOT A MIGRATION)
-- ========================================
-- Purpose: Check which migrations have been applied to the current database
-- Usage: Run this MANUALLY in SQL Editor in both PRODUCTION and STAGING to compare
-- Date: 2025-12-08
-- ========================================
-- NOTE: This is a utility script, not a migration. It should be run manually.
-- If this file is being applied as a migration, it will do nothing.
-- ========================================

-- Wrap in DO block to make it safe if run as migration
DO $$
BEGIN
  -- This script is meant to be run manually, not as a migration
  -- If run as migration, do nothing
  NULL;
END $$;

-- The actual queries below are for manual execution only:
/*
-- Check Supabase migration tracking table
-- Note: schema_migrations table has: version (primary key), name, statements
SELECT 
  'Applied Migrations' AS status_type,
  version,
  name
FROM supabase_migrations.schema_migrations
ORDER BY version DESC;

-- Count total migrations applied
SELECT 
  'Total Migrations Applied' AS info,
  COUNT(*) AS count
FROM supabase_migrations.schema_migrations;

-- Check for specific key tables/functions to verify schema
SELECT 
  'Schema Verification' AS status_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN '✓ profiles'
    ELSE '✗ profiles'
  END AS profiles_table,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'machines') THEN '✓ machines'
    ELSE '✗ machines'
  END AS machines_table,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'readings_raw') THEN '✓ readings_raw'
    ELSE '✗ readings_raw'
  END AS readings_raw_table,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cirrus') THEN '✓ cirrus'
    ELSE '✗ cirrus'
  END AS cirrus_table,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'alliance') THEN '✓ alliance'
    ELSE '✗ alliance'
  END AS alliance_table,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'coolbreeze') THEN '✓ coolbreeze'
    ELSE '✗ coolbreeze'
  END AS coolbreeze_table,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_historical_data') THEN '✓ get_historical_data'
    ELSE '✗ get_historical_data'
  END AS historical_data_function,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'process_cirrus_reading') THEN '✓ process_cirrus_reading'
    ELSE '✗ process_cirrus_reading'
  END AS process_cirrus_function,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'process_alliance_reading') THEN '✓ process_alliance_reading'
    ELSE '✗ process_alliance_reading'
  END AS process_alliance_function,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'alliance' AND column_name = 'compressor_status') THEN '✓ alliance.compressor_status'
    ELSE '✗ alliance.compressor_status'
  END AS compressor_status_column;

-- Check for triggers
SELECT 
  'Trigger Status' AS status_type,
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND (trigger_name LIKE '%cirrus%' OR trigger_name LIKE '%alliance%' OR trigger_name LIKE '%coolbreeze%')
ORDER BY event_object_table, trigger_name;

-- Get table row counts (to verify data exists)
SELECT 
  'Data Verification' AS status_type,
  'profiles' AS table_name,
  COUNT(*) AS row_count
FROM public.profiles
UNION ALL
SELECT 
  'Data Verification',
  'machines',
  COUNT(*)
FROM public.machines
UNION ALL
SELECT 
  'Data Verification',
  'readings_raw',
  COUNT(*)
FROM public.readings_raw
UNION ALL
SELECT 
  'Data Verification',
  'cirrus',
  COUNT(*)
FROM public.cirrus
UNION ALL
SELECT 
  'Data Verification',
  'alliance',
  COUNT(*)
FROM public.alliance
UNION ALL
SELECT 
  'Data Verification',
  'coolbreeze',
  COUNT(*)
FROM public.coolbreeze
ORDER BY table_name;
*/
