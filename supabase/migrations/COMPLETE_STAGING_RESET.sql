-- ========================================
-- COMPLETE STAGING RESET
-- ========================================
-- Purpose: Drop ALL objects to start completely fresh
-- Usage: Run this on STAGING before applying migrations
-- WARNING: This deletes EVERYTHING - tables, functions, triggers, views, types
-- ========================================

-- Disable triggers temporarily
SET session_replication_role = 'replica';

-- Drop all views first (they depend on tables)
DROP VIEW IF EXISTS public.historical_data_summary CASCADE;

-- Drop all tables (in dependency order)
DROP TABLE IF EXISTS public.SMM_unsubscribes CASCADE;
DROP TABLE IF EXISTS public.SMM_failed_addresses CASCADE;
DROP TABLE IF EXISTS public.SMM_bounces CASCADE;
DROP TABLE IF EXISTS public.SMM_clicks CASCADE;
DROP TABLE IF EXISTS public.SMM_opens CASCADE;
DROP TABLE IF EXISTS public.SMM_sends CASCADE;
DROP TABLE IF EXISTS public.SMM_campaign_recipients CASCADE;
DROP TABLE IF EXISTS public.SMM_campaigns CASCADE;
DROP TABLE IF EXISTS public.SMM_templates CASCADE;
DROP TABLE IF EXISTS public.SMM_contacts CASCADE;

DROP TABLE IF EXISTS public.alliance CASCADE;
DROP TABLE IF EXISTS public.coolbreeze CASCADE;
DROP TABLE IF EXISTS public.cirrus CASCADE;
DROP TABLE IF EXISTS public.readings_raw CASCADE;
DROP TABLE IF EXISTS public.machine_connection_status CASCADE;
DROP TABLE IF EXISTS public.machine_notification_preferences CASCADE;
DROP TABLE IF EXISTS public.machine_alert_config CASCADE;
DROP TABLE IF EXISTS public.machine_voltage_config CASCADE;
DROP TABLE IF EXISTS public.api_keys CASCADE;
DROP TABLE IF EXISTS public.machines CASCADE;
DROP TABLE IF EXISTS public.client_admin_assignments CASCADE;
DROP TABLE IF EXISTS public.installer_company_assignments CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS public.get_historical_data CASCADE;
DROP FUNCTION IF EXISTS public.process_cirrus_reading CASCADE;
DROP FUNCTION IF EXISTS public.process_coolbreeze_reading CASCADE;
DROP FUNCTION IF EXISTS public.process_alliance_reading CASCADE;
DROP FUNCTION IF EXISTS public.has_role CASCADE;
DROP FUNCTION IF EXISTS public.get_user_admin CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column CASCADE;
DROP FUNCTION IF EXISTS public.update_SMM_updated_at CASCADE;
DROP FUNCTION IF EXISTS public.SMM_handle_unsubscribe CASCADE;
DROP FUNCTION IF EXISTS public.SMM_cleanup_old_failed_addresses CASCADE;

-- Drop all types/enums
DROP TYPE IF EXISTS public.app_role CASCADE;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Clear migration history
DELETE FROM supabase_migrations.schema_migrations;

-- Verify everything is gone
SELECT 
    'VERIFICATION' AS status,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') AS remaining_tables,
    (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION') AS remaining_functions,
    (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public') AS remaining_triggers;

SELECT 'Staging database completely reset. Ready for fresh migrations.' AS status;



