-- ========================================
-- RESET STAGING DATABASE
-- ========================================
-- Purpose: Drop all objects to prepare for fresh migration
-- Usage: Run this on STAGING database before applying migrations
-- WARNING: This will delete ALL data and schema!
-- ========================================

-- Disable triggers temporarily
SET session_replication_role = 'replica';

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

-- Drop all triggers (should be dropped with functions, but just in case)
DROP TRIGGER IF EXISTS trigger_process_cirrus_reading ON public.readings_raw;
DROP TRIGGER IF EXISTS trigger_process_coolbreeze_reading ON public.readings_raw;
DROP TRIGGER IF EXISTS trigger_process_alliance_reading ON public.readings_raw;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Clear migration history (optional - only if you want to start fresh)
-- WARNING: This will make Supabase think no migrations have been applied
-- DELETE FROM supabase_migrations.schema_migrations;

SELECT 'Database reset complete. You can now apply migrations.' AS status;



