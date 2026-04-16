-- ========================================
-- SIMPLE DATA EXPORT FOR STAGING MIGRATION (UTILITY SCRIPT - NOT A MIGRATION)
-- ========================================
-- Purpose: Generate INSERT statements for all tables
-- Usage: 
--   1. Run this script MANUALLY in PRODUCTION Supabase SQL Editor
--   2. Copy the output (all INSERT statements)
--   3. Run the copied statements in STAGING Supabase SQL Editor
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

-- ========================================
-- 1. PROFILES
-- ========================================
SELECT '-- Migrating profiles...' AS info;
SELECT 
  format('INSERT INTO public.profiles (id, name, email, cell_number, country, state, city, street, suburb, po_box, full_name_business, email_subscribed, created_at, updated_at) VALUES (%L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %s, %L, %L) ON CONFLICT (id) DO NOTHING;',
    id, name, email, cell_number, country, state, city, street, suburb, po_box, full_name_business, email_subscribed, created_at, updated_at)
FROM public.profiles
ORDER BY created_at;

-- ========================================
-- 2. USER ROLES
-- ========================================
SELECT '-- Migrating user_roles...' AS info;
SELECT 
  format('INSERT INTO public.user_roles (id, user_id, role, created_by, created_at) VALUES (%L, %L, %L, %L, %L) ON CONFLICT (user_id, role) DO NOTHING;',
    id, user_id, role, created_by, created_at)
FROM public.user_roles
ORDER BY created_at;

-- ========================================
-- 3. INSTALLER-COMPANY ASSIGNMENTS
-- ========================================
SELECT '-- Migrating installer_company_assignments...' AS info;
SELECT 
  format('INSERT INTO public.installer_company_assignments (id, installer_id, company_id, assigned_by, assigned_at) VALUES (%L, %L, %L, %L, %L) ON CONFLICT DO NOTHING;',
    id, installer_id, company_id, assigned_by, assigned_at)
FROM public.installer_company_assignments
ORDER BY assigned_at;

-- ========================================
-- 4. CLIENT-ADMIN ASSIGNMENTS
-- ========================================
SELECT '-- Migrating client_admin_assignments...' AS info;
SELECT 
  format('INSERT INTO public.client_admin_assignments (id, client_id, admin_id, assigned_at, assigned_by) VALUES (%L, %L, %L, %L, %L) ON CONFLICT (client_id) DO NOTHING;',
    id, client_id, admin_id, assigned_at, assigned_by)
FROM public.client_admin_assignments
ORDER BY assigned_at;

-- ========================================
-- 5. MACHINES
-- ========================================
SELECT '-- Migrating machines...' AS info;
SELECT 
  format('INSERT INTO public.machines (id, name, type, manufacturer, owner_id, location, api_key, api_endpoint, temperature_setpoint, created_at, updated_at) VALUES (%L, %L, %L, %L, %L, %L, %L, %L, %s, %L, %L) ON CONFLICT (id) DO NOTHING;',
    id, name, type, manufacturer, owner_id, location, api_key, api_endpoint, temperature_setpoint, created_at, updated_at)
FROM public.machines
ORDER BY created_at;

-- ========================================
-- 6. API KEYS
-- ========================================
SELECT '-- Migrating api_keys...' AS info;
SELECT 
  format('INSERT INTO public.api_keys (id, key, machine_id, created_by, created_at, last_used_at, is_active, description) VALUES (%L, %L, %L, %L, %L, %L, %s, %L) ON CONFLICT (key) DO NOTHING;',
    id, key, machine_id, created_by, created_at, last_used_at, is_active, description)
FROM public.api_keys
ORDER BY created_at;

-- ========================================
-- 7. MACHINE VOLTAGE CONFIG
-- ========================================
SELECT '-- Migrating machine_voltage_config...' AS info;
SELECT 
  format('INSERT INTO public.machine_voltage_config (id, machine_id, voltage_input_1_function, voltage_input_2_function, voltage_input_3_function, voltage_input_4_function, voltage_input_5_function, voltage_input_6_function, voltage_active_threshold, created_at, updated_at) VALUES (%L, %L, %L, %L, %L, %L, %L, %L, %s, %L, %L) ON CONFLICT (machine_id) DO UPDATE SET voltage_input_1_function = EXCLUDED.voltage_input_1_function, voltage_input_2_function = EXCLUDED.voltage_input_2_function, voltage_input_3_function = EXCLUDED.voltage_input_3_function, voltage_input_4_function = EXCLUDED.voltage_input_4_function, voltage_input_5_function = EXCLUDED.voltage_input_5_function, voltage_input_6_function = EXCLUDED.voltage_input_6_function, voltage_active_threshold = EXCLUDED.voltage_active_threshold, updated_at = EXCLUDED.updated_at;',
    id, machine_id, voltage_input_1_function, voltage_input_2_function, voltage_input_3_function, voltage_input_4_function, voltage_input_5_function, voltage_input_6_function, voltage_active_threshold, created_at, updated_at)
FROM public.machine_voltage_config
ORDER BY created_at;

-- ========================================
-- 8. MACHINE ALERT CONFIG
-- ========================================
SELECT '-- Migrating machine_alert_config...' AS info;
SELECT 
  format('INSERT INTO public.machine_alert_config (id, machine_id, motor_temp_warning, motor_temp_critical, motor_amps_warning, current_min_alert, current_max_alert, voltage_min, voltage_max, delta_t_min_cooling, delta_t_min_heating, delta_t_max_heating, setpoint_tolerance, duration_motor_temp_critical, duration_fan_failure, duration_water_empty, duration_compressor_failure, reminder_interval_hours, send_recovery_emails, created_at, updated_at) VALUES (%L, %L, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %L, %L) ON CONFLICT (machine_id) DO UPDATE SET motor_temp_warning = EXCLUDED.motor_temp_warning, motor_temp_critical = EXCLUDED.motor_temp_critical, motor_amps_warning = EXCLUDED.motor_amps_warning, current_min_alert = EXCLUDED.current_min_alert, current_max_alert = EXCLUDED.current_max_alert, voltage_min = EXCLUDED.voltage_min, voltage_max = EXCLUDED.voltage_max, delta_t_min_cooling = EXCLUDED.delta_t_min_cooling, delta_t_min_heating = EXCLUDED.delta_t_min_heating, delta_t_max_heating = EXCLUDED.delta_t_max_heating, setpoint_tolerance = EXCLUDED.setpoint_tolerance, duration_motor_temp_critical = EXCLUDED.duration_motor_temp_critical, duration_fan_failure = EXCLUDED.duration_fan_failure, duration_water_empty = EXCLUDED.duration_water_empty, duration_compressor_failure = EXCLUDED.duration_compressor_failure, reminder_interval_hours = EXCLUDED.reminder_interval_hours, send_recovery_emails = EXCLUDED.send_recovery_emails, updated_at = EXCLUDED.updated_at;',
    id, machine_id, motor_temp_warning, motor_temp_critical, motor_amps_warning, current_min_alert, current_max_alert, voltage_min, voltage_max, delta_t_min_cooling, delta_t_min_heating, delta_t_max_heating, setpoint_tolerance, duration_motor_temp_critical, duration_fan_failure, duration_water_empty, duration_compressor_failure, reminder_interval_hours, send_recovery_emails, created_at, updated_at)
FROM public.machine_alert_config
ORDER BY created_at;

-- ========================================
-- 9. NOTIFICATION PREFERENCES
-- ========================================
SELECT '-- Migrating machine_notification_preferences...' AS info;
SELECT 
  format('INSERT INTO public.machine_notification_preferences (id, machine_id, user_id, enabled, created_at, updated_at) VALUES (%L, %L, %L, %s, %L, %L) ON CONFLICT (machine_id, user_id) DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = EXCLUDED.updated_at;',
    id, machine_id, user_id, enabled, created_at, updated_at)
FROM public.machine_notification_preferences
ORDER BY created_at;

-- ========================================
-- 10. CONNECTION STATUS
-- ========================================
SELECT '-- Migrating machine_connection_status...' AS info;
SELECT 
  format('INSERT INTO public.machine_connection_status (id, machine_id, last_seen_at, is_connected, connection_quality, last_reading_timestamp, consecutive_failures, created_at, updated_at) VALUES (%L, %L, %L, %s, %L, %L, %s, %L, %L) ON CONFLICT (machine_id) DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at, is_connected = EXCLUDED.is_connected, connection_quality = EXCLUDED.connection_quality, last_reading_timestamp = EXCLUDED.last_reading_timestamp, consecutive_failures = EXCLUDED.consecutive_failures, updated_at = EXCLUDED.updated_at;',
    id, machine_id, last_seen_at, is_connected, connection_quality, last_reading_timestamp, consecutive_failures, created_at, updated_at)
FROM public.machine_connection_status
ORDER BY created_at;

-- ========================================
-- 11. READINGS_RAW (may be large - consider date filtering)
-- ========================================
SELECT '-- Migrating readings_raw (this may take a while)...' AS info;
SELECT 
  format('INSERT INTO public.readings_raw (id, machine_id, timestamp, motor_temp, inside_temp, outside_temp, current, voltage, power, voltage_input_1, voltage_input_2, voltage_input_3, voltage_input_4, voltage_input_5, voltage_input_6, has_water, sensor_read_count, api_key_used, created_at) VALUES (%L, %L, %L, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %L, %L) ON CONFLICT (machine_id, timestamp) DO NOTHING;',
    id, machine_id, timestamp, motor_temp, inside_temp, outside_temp, current, voltage, power, voltage_input_1, voltage_input_2, voltage_input_3, voltage_input_4, voltage_input_5, voltage_input_6, has_water, sensor_read_count, api_key_used, created_at)
FROM public.readings_raw
ORDER BY created_at;

-- ========================================
-- 12. CIRRUS DATA
-- ========================================
SELECT '-- Migrating cirrus data...' AS info;
SELECT 
  format('INSERT INTO public.cirrus (id, machine_id, timestamp, ambient_temp, duct_temp, motor_temp, delta_t, voltage, current, power, fan_voltage, pump_voltage, drain_voltage, exhaust_voltage, fan_active, pump_active, drain_active, exhaust_active, is_cooling, is_on, is_connected, has_water, fan_status, pump_status, drain_status, exhaust_status, fan_speed, overall_status, motor_status, water_status, cooling_status, motor_temp_within_parameters, current_within_parameters, voltage_within_parameters, power_within_parameters, water_within_parameters, status_details, created_at, updated_at) VALUES (%L, %L, %L, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %L, %L, %L, %L, %s, %L, %L, %L, %L, %s, %s, %s, %s, %s, %L, %L, %L) ON CONFLICT (machine_id, timestamp) DO NOTHING;',
    id, machine_id, timestamp, ambient_temp, duct_temp, motor_temp, delta_t, voltage, current, power, fan_voltage, pump_voltage, drain_voltage, exhaust_voltage, fan_active, pump_active, drain_active, exhaust_active, is_cooling, is_on, is_connected, has_water, fan_status, pump_status, drain_status, exhaust_status, fan_speed, overall_status, motor_status, water_status, cooling_status, motor_temp_within_parameters, current_within_parameters, voltage_within_parameters, power_within_parameters, water_within_parameters, status_details, created_at, updated_at)
FROM public.cirrus
ORDER BY timestamp;

-- ========================================
-- 13. COOLBREEZE DATA
-- ========================================
SELECT '-- Migrating coolbreeze data...' AS info;
SELECT 
  format('INSERT INTO public.coolbreeze (id, machine_id, timestamp, ambient_temp, duct_temp, motor_temp, delta_t, voltage, current, power, fan_voltage, pump_voltage, drain_voltage, exhaust_voltage, fan_active, pump_active, drain_active, exhaust_active, is_cooling, is_on, is_connected, has_water, water_level, fan_status, pump_status, drain_status, exhaust_status, fan_speed, overall_status, motor_status, water_status, cooling_status, motor_temp_within_parameters, current_within_parameters, voltage_within_parameters, power_within_parameters, water_within_parameters, status_details, created_at, updated_at) VALUES (%L, %L, %L, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %L, %L, %L, %L, %s, %L, %L, %L, %L, %s, %s, %s, %s, %s, %L, %L, %L) ON CONFLICT (machine_id, timestamp) DO NOTHING;',
    id, machine_id, timestamp, ambient_temp, duct_temp, motor_temp, delta_t, voltage, current, power, fan_voltage, pump_voltage, drain_voltage, exhaust_voltage, fan_active, pump_active, drain_active, exhaust_active, is_cooling, is_on, is_connected, has_water, water_level, fan_status, pump_status, drain_status, exhaust_status, fan_speed, overall_status, motor_status, water_status, cooling_status, motor_temp_within_parameters, current_within_parameters, voltage_within_parameters, power_within_parameters, water_within_parameters, status_details, created_at, updated_at)
FROM public.coolbreeze
ORDER BY timestamp;

-- ========================================
-- 14. ALLIANCE DATA
-- ========================================
SELECT '-- Migrating alliance data...' AS info;
SELECT 
  format('INSERT INTO public.alliance (id, machine_id, timestamp, ambient_temp, duct_temp, motor_temp, delta_t, voltage, current, power, voltage_1, voltage_2, voltage_3, voltage_4, voltage_5, voltage_6, fan_active, pump_active, drain_active, exhaust_active, is_cooling, is_heating, is_on, is_connected, has_water, overall_status, motor_status, water_status, cooling_status, heating_status, compressor_status, compressor_issue_first_detected_at, motor_temp_within_parameters, current_within_parameters, voltage_within_parameters, power_within_parameters, water_within_parameters, setpoint_within_parameters, status_details, created_at, updated_at) VALUES (%L, %L, %L, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %L, %L, %L, %L, %L, %L, %L, %s, %s, %s, %s, %s, %s, %L, %L, %L) ON CONFLICT (machine_id, timestamp) DO NOTHING;',
    id, machine_id, timestamp, ambient_temp, duct_temp, motor_temp, delta_t, voltage, current, power, voltage_1, voltage_2, voltage_3, voltage_4, voltage_5, voltage_6, fan_active, pump_active, drain_active, exhaust_active, is_cooling, is_heating, is_on, is_connected, has_water, overall_status, motor_status, water_status, cooling_status, heating_status, compressor_status, compressor_issue_first_detected_at, motor_temp_within_parameters, current_within_parameters, voltage_within_parameters, power_within_parameters, water_within_parameters, setpoint_within_parameters, status_details, created_at, updated_at)
FROM public.alliance
ORDER BY timestamp;
*/

SELECT '-- Migration export complete! Copy all INSERT statements above and run them in your staging database.' AS info;
*/

