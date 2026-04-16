-- ========================================
-- VERIFY STAGING TABLES MATCH PRODUCTION
-- ========================================
-- Purpose: Check what tables exist and compare with production
-- Usage: Run this on STAGING, then compare with PRODUCTION
-- ========================================

-- List all tables in public schema
SELECT 
    'TABLE' AS object_type,
    table_name,
    'EXISTS' AS status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- List all views
SELECT 
    'VIEW' AS object_type,
    table_name AS view_name,
    'EXISTS' AS status
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- List all functions
SELECT 
    'FUNCTION' AS object_type,
    routine_name,
    'EXISTS' AS status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- List all triggers
SELECT 
    'TRIGGER' AS object_type,
    trigger_name,
    event_object_table,
    'EXISTS' AS status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Check for SMM tables (email marketing)
SELECT 
    'SMM_TABLE' AS object_type,
    table_name,
    'EXISTS' AS status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'SMM_%'
ORDER BY table_name;

-- Summary count
SELECT 
    'SUMMARY' AS info,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') AS total_tables,
    (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public') AS total_views,
    (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION') AS total_functions,
    (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public') AS total_triggers;



