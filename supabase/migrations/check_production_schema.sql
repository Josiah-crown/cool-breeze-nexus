-- ========================================
-- CHECK PRODUCTION SCHEMA
-- ========================================
-- Purpose: See what tables actually exist in production
-- Usage: Run this in PRODUCTION SQL Editor
-- ========================================

-- List all tables
SELECT 
    'TABLE' AS object_type,
    table_name,
    'EXISTS' AS status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check for old vs new schema
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'alliance_calculated') THEN 'OLD SCHEMA (alliance_calculated exists)'
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'alliance') THEN 'NEW SCHEMA (alliance exists)'
        ELSE 'UNKNOWN'
    END AS schema_version,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'alliance_notifications') THEN 'OLD (alliance_notifications exists)'
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'machine_alert_config') THEN 'NEW (machine_alert_config exists)'
        ELSE 'UNKNOWN'
    END AS config_tables;

-- Count rows in key tables
SELECT 
    'profiles' AS table_name, COUNT(*) AS row_count FROM public.profiles
UNION ALL
SELECT 'machines', COUNT(*) FROM public.machines
UNION ALL
SELECT 'readings_raw', COUNT(*) FROM public.readings_raw
UNION ALL
SELECT 'cirrus', COUNT(*) FROM public.cirrus
UNION ALL
SELECT 'coolbreeze', COUNT(*) FROM public.coolbreeze
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'alliance_calculated') 
        THEN 'alliance_calculated' 
        ELSE 'alliance' 
    END,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'alliance_calculated') 
        THEN (SELECT COUNT(*) FROM public.alliance_calculated)
        ELSE (SELECT COUNT(*) FROM public.alliance)
    END
ORDER BY table_name;



