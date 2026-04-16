-- ========================================
-- QUICK CHECK: Which Tables Have Data?
-- ========================================
-- Run this in PRODUCTION SQL Editor
-- ========================================

-- Check OLD vs NEW tables
SELECT 
    'alliance_calculated (OLD)' AS table_name, 
    COUNT(*) AS row_count 
FROM public.alliance_calculated
UNION ALL
SELECT 
    'alliance (NEW)', 
    COUNT(*) 
FROM public.alliance
UNION ALL
SELECT 
    'alliance_notifications (OLD)', 
    COUNT(*) 
FROM public.alliance_notifications
UNION ALL
SELECT 
    'machine_alert_config (NEW)', 
    COUNT(*) 
FROM public.machine_alert_config
ORDER BY table_name;

-- Check other key tables
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
ORDER BY table_name;



