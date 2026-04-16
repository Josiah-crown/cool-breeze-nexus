-- ============================================================================
-- Check if triggers are failing due to RLS policies blocking INSERTs
-- ============================================================================
-- Date: January 12, 2026
-- Purpose: Check if RLS policies are blocking trigger INSERTs into cirrus/alliance/coolbreeze
-- ============================================================================

-- Check if RLS is enabled on the tables
SELECT 
  'cirrus' as table_name,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'cirrus'
UNION ALL
SELECT 
  'alliance' as table_name,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'alliance'
UNION ALL
SELECT 
  'coolbreeze' as table_name,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'coolbreeze';

-- Check INSERT policies on cirrus table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('cirrus', 'alliance', 'coolbreeze')
  AND cmd = 'INSERT'
ORDER BY tablename, policyname;

-- Check if triggers exist and are enabled
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation,
  action_statement,
  action_orientation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table = 'readings_raw'
ORDER BY trigger_name;

-- Check the function definitions to see if they're SECURITY DEFINER
SELECT
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  r.rolname as owner,
  p.prosecdef as is_security_definer,
  pg_get_functiondef(p.oid) LIKE '%SECURITY DEFINER%' as has_security_definer_in_def
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_roles r ON p.proowner = r.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('process_cirrus_reading', 'process_alliance_reading', 'process_coolbreeze_reading');

-- Check for any error logs or failed inserts (this would require checking Supabase logs)
-- But we can check if there are readings_raw entries that should have been processed
SELECT 
  COUNT(*) as unprocessed_readings,
  MIN(created_at) as oldest_unprocessed,
  MAX(created_at) as newest_unprocessed
FROM readings_raw
WHERE created_at > NOW() - INTERVAL '7 days'
  AND machine_id IN (
    SELECT id FROM machines WHERE type = 'evaporative' OR manufacturer IN ('Cirrus', 'CoolBreeze', 'Alliance')
  );

