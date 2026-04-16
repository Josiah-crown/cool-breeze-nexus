-- ========================================
-- EXPORT PRODUCTION DATA TO STAGING (UTILITY SCRIPT - NOT A MIGRATION)
-- ========================================
-- Purpose: Export all data from production Supabase to staging
-- Usage: Run this MANUALLY on PRODUCTION database, then use the output to import into staging
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
-- 1. EXPORT PROFILES
-- ========================================
SELECT '-- Exporting profiles...' AS info;
SELECT 
  'INSERT INTO public.profiles (id, name, email, cell_number, country, state, city, street, suburb, po_box, full_name_business, email_subscribed, created_at, updated_at) VALUES (' ||
  quote_literal(id::text) || ', ' ||
  quote_literal(name) || ', ' ||
  quote_literal(email) || ', ' ||
  quote_literal(cell_number) || ', ' ||
  quote_literal(country) || ', ' ||
  quote_literal(state) || ', ' ||
  quote_literal(city) || ', ' ||
  quote_literal(street) || ', ' ||
  quote_literal(suburb) || ', ' ||
  COALESCE(quote_literal(po_box), 'NULL') || ', ' ||
  quote_literal(full_name_business) || ', ' ||
  email_subscribed || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || 
  ') ON CONFLICT (id) DO NOTHING;' AS sql_statement
FROM public.profiles
ORDER BY created_at;

-- ========================================
-- 2. EXPORT USER ROLES
-- ========================================
SELECT '-- Exporting user_roles...' AS info;
SELECT 
  'INSERT INTO public.user_roles (id, user_id, role, created_by, created_at) VALUES (' ||
  quote_literal(id::text) || ', ' ||
  quote_literal(user_id::text) || ', ' ||
  quote_literal(role::text) || ', ' ||
  COALESCE(quote_literal(created_by::text), 'NULL') || ', ' ||
  quote_literal(created_at::text) || 
  ') ON CONFLICT (user_id, role) DO NOTHING;' AS sql_statement
FROM public.user_roles
ORDER BY created_at;

-- ========================================
-- 3. EXPORT INSTALLER-COMPANY ASSIGNMENTS
-- ========================================
SELECT '-- Exporting installer_company_assignments...' AS info;
SELECT 
  'INSERT INTO public.installer_company_assignments (id, installer_id, company_id, assigned_by, assigned_at) VALUES (' ||
  quote_literal(id::text) || ', ' ||
  quote_literal(installer_id::text) || ', ' ||
  quote_literal(company_id::text) || ', ' ||
  COALESCE(quote_literal(assigned_by::text), 'NULL') || ', ' ||
  quote_literal(assigned_at::text) || 
  ') ON CONFLICT DO NOTHING;' AS sql_statement
FROM public.installer_company_assignments
ORDER BY assigned_at;

-- ========================================
-- 4. EXPORT CLIENT-ADMIN ASSIGNMENTS
-- ========================================
SELECT '-- Exporting client_admin_assignments...' AS info;
SELECT 
  'INSERT INTO public.client_admin_assignments (id, client_id, admin_id, assigned_at, assigned_by) VALUES (' ||
  quote_literal(id::text) || ', ' ||
  quote_literal(client_id::text) || ', ' ||
  quote_literal(admin_id::text) || ', ' ||
  quote_literal(assigned_at::text) || ', ' ||
  COALESCE(quote_literal(assigned_by::text), 'NULL') || 
  ') ON CONFLICT (client_id) DO NOTHING;' AS sql_statement
FROM public.client_admin_assignments
ORDER BY assigned_at;

-- ========================================
-- 5. EXPORT MACHINES
-- ========================================
SELECT '-- Exporting machines...' AS info;
SELECT 
  'INSERT INTO public.machines (id, name, type, manufacturer, owner_id, location, api_key, api_endpoint, temperature_setpoint, created_at, updated_at) VALUES (' ||
  quote_literal(id::text) || ', ' ||
  quote_literal(name) || ', ' ||
  quote_literal(type) || ', ' ||
  COALESCE(quote_literal(manufacturer), 'NULL') || ', ' ||
  quote_literal(owner_id::text) || ', ' ||
  COALESCE(quote_literal(location), 'NULL') || ', ' ||
  quote_literal(api_key) || ', ' ||
  COALESCE(quote_literal(api_endpoint), 'NULL') || ', ' ||
  COALESCE(temperature_setpoint::text, 'NULL') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || 
  ') ON CONFLICT (id) DO NOTHING;' AS sql_statement
FROM public.machines
ORDER BY created_at;

-- ========================================
-- 6. EXPORT API KEYS
-- ========================================
SELECT '-- Exporting api_keys...' AS info;
SELECT 
  'INSERT INTO public.api_keys (id, key, machine_id, created_by, created_at, last_used_at, is_active, description) VALUES (' ||
  quote_literal(id::text) || ', ' ||
  quote_literal(key) || ', ' ||
  quote_literal(machine_id::text) || ', ' ||
  quote_literal(created_by::text) || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  COALESCE(quote_literal(last_used_at::text), 'NULL') || ', ' ||
  is_active || ', ' ||
  COALESCE(quote_literal(description), 'NULL') || 
  ') ON CONFLICT (key) DO NOTHING;' AS sql_statement
FROM public.api_keys
ORDER BY created_at;

-- ========================================
-- 7. EXPORT MACHINE VOLTAGE CONFIG
-- ========================================
SELECT '-- Exporting machine_voltage_config...' AS info;
SELECT 
  'INSERT INTO public.machine_voltage_config (id, machine_id, voltage_input_1_function, voltage_input_2_function, voltage_input_3_function, voltage_input_4_function, voltage_input_5_function, voltage_input_6_function, voltage_active_threshold, created_at, updated_at) VALUES (' ||
  quote_literal(id::text) || ', ' ||
  quote_literal(machine_id::text) || ', ' ||
  quote_literal(voltage_input_1_function) || ', ' ||
  quote_literal(voltage_input_2_function) || ', ' ||
  quote_literal(voltage_input_3_function) || ', ' ||
  quote_literal(voltage_input_4_function) || ', ' ||
  quote_literal(voltage_input_5_function) || ', ' ||
  quote_literal(voltage_input_6_function) || ', ' ||
  voltage_active_threshold || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || 
  ') ON CONFLICT (machine_id) DO UPDATE SET ' ||
  'voltage_input_1_function = EXCLUDED.voltage_input_1_function, ' ||
  'voltage_input_2_function = EXCLUDED.voltage_input_2_function, ' ||
  'voltage_input_3_function = EXCLUDED.voltage_input_3_function, ' ||
  'voltage_input_4_function = EXCLUDED.voltage_input_4_function, ' ||
  'voltage_input_5_function = EXCLUDED.voltage_input_5_function, ' ||
  'voltage_input_6_function = EXCLUDED.voltage_input_6_function, ' ||
  'voltage_active_threshold = EXCLUDED.voltage_active_threshold, ' ||
  'updated_at = EXCLUDED.updated_at;' AS sql_statement
FROM public.machine_voltage_config
ORDER BY created_at;

-- ========================================
-- 8. EXPORT MACHINE ALERT CONFIG
-- ========================================
SELECT '-- Exporting machine_alert_config...' AS info;
SELECT 
  'INSERT INTO public.machine_alert_config (id, machine_id, motor_temp_warning, motor_temp_critical, motor_amps_warning, current_min_alert, current_max_alert, voltage_min, voltage_max, delta_t_min_cooling, delta_t_min_heating, delta_t_max_heating, setpoint_tolerance, duration_motor_temp_critical, duration_fan_failure, duration_water_empty, duration_compressor_failure, reminder_interval_hours, send_recovery_emails, created_at, updated_at) VALUES (' ||
  quote_literal(id::text) || ', ' ||
  quote_literal(machine_id::text) || ', ' ||
  motor_temp_warning || ', ' ||
  motor_temp_critical || ', ' ||
  motor_amps_warning || ', ' ||
  current_min_alert || ', ' ||
  current_max_alert || ', ' ||
  voltage_min || ', ' ||
  voltage_max || ', ' ||
  delta_t_min_cooling || ', ' ||
  delta_t_min_heating || ', ' ||
  delta_t_max_heating || ', ' ||
  setpoint_tolerance || ', ' ||
  duration_motor_temp_critical || ', ' ||
  duration_fan_failure || ', ' ||
  duration_water_empty || ', ' ||
  duration_compressor_failure || ', ' ||
  reminder_interval_hours || ', ' ||
  send_recovery_emails || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || 
  ') ON CONFLICT (machine_id) DO UPDATE SET ' ||
  'motor_temp_warning = EXCLUDED.motor_temp_warning, ' ||
  'motor_temp_critical = EXCLUDED.motor_temp_critical, ' ||
  'motor_amps_warning = EXCLUDED.motor_amps_warning, ' ||
  'current_min_alert = EXCLUDED.current_min_alert, ' ||
  'current_max_alert = EXCLUDED.current_max_alert, ' ||
  'voltage_min = EXCLUDED.voltage_min, ' ||
  'voltage_max = EXCLUDED.voltage_max, ' ||
  'delta_t_min_cooling = EXCLUDED.delta_t_min_cooling, ' ||
  'delta_t_min_heating = EXCLUDED.delta_t_min_heating, ' ||
  'delta_t_max_heating = EXCLUDED.delta_t_max_heating, ' ||
  'setpoint_tolerance = EXCLUDED.setpoint_tolerance, ' ||
  'duration_motor_temp_critical = EXCLUDED.duration_motor_temp_critical, ' ||
  'duration_fan_failure = EXCLUDED.duration_fan_failure, ' ||
  'duration_water_empty = EXCLUDED.duration_water_empty, ' ||
  'duration_compressor_failure = EXCLUDED.duration_compressor_failure, ' ||
  'reminder_interval_hours = EXCLUDED.reminder_interval_hours, ' ||
  'send_recovery_emails = EXCLUDED.send_recovery_emails, ' ||
  'updated_at = EXCLUDED.updated_at;' AS sql_statement
FROM public.machine_alert_config
ORDER BY created_at;

-- ========================================
-- 9. EXPORT NOTIFICATION PREFERENCES
-- ========================================
SELECT '-- Exporting machine_notification_preferences...' AS info;
SELECT 
  'INSERT INTO public.machine_notification_preferences (id, machine_id, user_id, enabled, created_at, updated_at) VALUES (' ||
  quote_literal(id::text) || ', ' ||
  quote_literal(machine_id::text) || ', ' ||
  quote_literal(user_id::text) || ', ' ||
  enabled || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || 
  ') ON CONFLICT (machine_id, user_id) DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = EXCLUDED.updated_at;' AS sql_statement
FROM public.machine_notification_preferences
ORDER BY created_at;

-- ========================================
-- 10. EXPORT CONNECTION STATUS
-- ========================================
SELECT '-- Exporting machine_connection_status...' AS info;
SELECT 
  'INSERT INTO public.machine_connection_status (id, machine_id, last_seen_at, is_connected, connection_quality, last_reading_timestamp, consecutive_failures, created_at, updated_at) VALUES (' ||
  quote_literal(id::text) || ', ' ||
  quote_literal(machine_id::text) || ', ' ||
  quote_literal(last_seen_at::text) || ', ' ||
  is_connected || ', ' ||
  COALESCE(quote_literal(connection_quality), 'NULL') || ', ' ||
  COALESCE(quote_literal(last_reading_timestamp::text), 'NULL') || ', ' ||
  consecutive_failures || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || 
  ') ON CONFLICT (machine_id) DO UPDATE SET ' ||
  'last_seen_at = EXCLUDED.last_seen_at, ' ||
  'is_connected = EXCLUDED.is_connected, ' ||
  'connection_quality = EXCLUDED.connection_quality, ' ||
  'last_reading_timestamp = EXCLUDED.last_reading_timestamp, ' ||
  'consecutive_failures = EXCLUDED.consecutive_failures, ' ||
  'updated_at = EXCLUDED.updated_at;' AS sql_statement
FROM public.machine_connection_status
ORDER BY created_at;

-- ========================================
-- 11. EXPORT READINGS_RAW (may be large!)
-- ========================================
SELECT '-- Exporting readings_raw (this may take a while)...' AS info;
SELECT 
  'INSERT INTO public.readings_raw (id, machine_id, timestamp, motor_temp, inside_temp, outside_temp, current, voltage, power, voltage_input_1, voltage_input_2, voltage_input_3, voltage_input_4, voltage_input_5, voltage_input_6, has_water, sensor_read_count, api_key_used, created_at) VALUES (' ||
  quote_literal(id::text) || ', ' ||
  quote_literal(machine_id::text) || ', ' ||
  quote_literal(timestamp::text) || ', ' ||
  COALESCE(motor_temp::text, 'NULL') || ', ' ||
  COALESCE(inside_temp::text, 'NULL') || ', ' ||
  COALESCE(outside_temp::text, 'NULL') || ', ' ||
  COALESCE(current::text, 'NULL') || ', ' ||
  COALESCE(voltage::text, 'NULL') || ', ' ||
  COALESCE(power::text, 'NULL') || ', ' ||
  COALESCE(voltage_input_1::text, 'NULL') || ', ' ||
  COALESCE(voltage_input_2::text, 'NULL') || ', ' ||
  COALESCE(voltage_input_3::text, 'NULL') || ', ' ||
  COALESCE(voltage_input_4::text, 'NULL') || ', ' ||
  COALESCE(voltage_input_5::text, 'NULL') || ', ' ||
  COALESCE(voltage_input_6::text, 'NULL') || ', ' ||
  COALESCE(has_water::text, 'NULL') || ', ' ||
  COALESCE(sensor_read_count::text, '1') || ', ' ||
  COALESCE(quote_literal(api_key_used), 'NULL') || ', ' ||
  quote_literal(created_at::text) || 
  ') ON CONFLICT (machine_id, timestamp) DO NOTHING;' AS sql_statement
FROM public.readings_raw
ORDER BY created_at;

-- ========================================
-- 12. EXPORT CIRRUS DATA
-- ========================================
SELECT '-- Exporting cirrus data...' AS info;
SELECT 
  'INSERT INTO public.cirrus (id, machine_id, timestamp, ambient_temp, duct_temp, motor_temp, delta_t, voltage, current, power, fan_voltage, pump_voltage, drain_voltage, exhaust_voltage, fan_active, pump_active, drain_active, exhaust_active, is_cooling, is_on, is_connected, has_water, fan_status, pump_status, drain_status, exhaust_status, fan_speed, overall_status, motor_status, water_status, cooling_status, motor_temp_within_parameters, current_within_parameters, voltage_within_parameters, power_within_parameters, water_within_parameters, status_details, created_at, updated_at) VALUES (' ||
  quote_literal(id::text) || ', ' ||
  quote_literal(machine_id::text) || ', ' ||
  quote_literal(timestamp::text) || ', ' ||
  COALESCE(ambient_temp::text, 'NULL') || ', ' ||
  COALESCE(duct_temp::text, 'NULL') || ', ' ||
  COALESCE(motor_temp::text, 'NULL') || ', ' ||
  COALESCE(delta_t::text, 'NULL') || ', ' ||
  COALESCE(voltage::text, 'NULL') || ', ' ||
  COALESCE(current::text, 'NULL') || ', ' ||
  COALESCE(power::text, 'NULL') || ', ' ||
  COALESCE(fan_voltage::text, 'NULL') || ', ' ||
  COALESCE(pump_voltage::text, 'NULL') || ', ' ||
  COALESCE(drain_voltage::text, 'NULL') || ', ' ||
  COALESCE(exhaust_voltage::text, 'NULL') || ', ' ||
  COALESCE(fan_active::text, 'false') || ', ' ||
  COALESCE(pump_active::text, 'false') || ', ' ||
  COALESCE(drain_active::text, 'false') || ', ' ||
  COALESCE(exhaust_active::text, 'false') || ', ' ||
  COALESCE(is_cooling::text, 'false') || ', ' ||
  COALESCE(is_on::text, 'false') || ', ' ||
  COALESCE(is_connected::text, 'true') || ', ' ||
  COALESCE(has_water::text, 'true') || ', ' ||
  COALESCE(quote_literal(fan_status), 'NULL') || ', ' ||
  COALESCE(quote_literal(pump_status), 'NULL') || ', ' ||
  COALESCE(quote_literal(drain_status), 'NULL') || ', ' ||
  COALESCE(quote_literal(exhaust_status), 'NULL') || ', ' ||
  COALESCE(fan_speed::text, '0') || ', ' ||
  COALESCE(quote_literal(overall_status), 'NULL') || ', ' ||
  COALESCE(quote_literal(motor_status), 'NULL') || ', ' ||
  COALESCE(quote_literal(water_status), 'NULL') || ', ' ||
  COALESCE(quote_literal(cooling_status), 'NULL') || ', ' ||
  COALESCE(motor_temp_within_parameters::text, 'NULL') || ', ' ||
  COALESCE(current_within_parameters::text, 'NULL') || ', ' ||
  COALESCE(voltage_within_parameters::text, 'NULL') || ', ' ||
  COALESCE(power_within_parameters::text, 'NULL') || ', ' ||
  COALESCE(water_within_parameters::text, 'NULL') || ', ' ||
  COALESCE(quote_literal(status_details::text), 'NULL') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || 
  ') ON CONFLICT (machine_id, timestamp) DO NOTHING;' AS sql_statement
FROM public.cirrus
ORDER BY timestamp;

-- ========================================
-- 13. EXPORT COOLBREEZE DATA
-- ========================================
SELECT '-- Exporting coolbreeze data...' AS info;
SELECT 
  'INSERT INTO public.coolbreeze (id, machine_id, timestamp, ambient_temp, duct_temp, motor_temp, delta_t, voltage, current, power, fan_voltage, pump_voltage, drain_voltage, exhaust_voltage, fan_active, pump_active, drain_active, exhaust_active, is_cooling, is_on, is_connected, has_water, water_level, fan_status, pump_status, drain_status, exhaust_status, fan_speed, overall_status, motor_status, water_status, cooling_status, motor_temp_within_parameters, current_within_parameters, voltage_within_parameters, power_within_parameters, water_within_parameters, status_details, created_at, updated_at) VALUES (' ||
  quote_literal(id::text) || ', ' ||
  quote_literal(machine_id::text) || ', ' ||
  quote_literal(timestamp::text) || ', ' ||
  COALESCE(ambient_temp::text, 'NULL') || ', ' ||
  COALESCE(duct_temp::text, 'NULL') || ', ' ||
  COALESCE(motor_temp::text, 'NULL') || ', ' ||
  COALESCE(delta_t::text, 'NULL') || ', ' ||
  COALESCE(voltage::text, 'NULL') || ', ' ||
  COALESCE(current::text, 'NULL') || ', ' ||
  COALESCE(power::text, 'NULL') || ', ' ||
  COALESCE(fan_voltage::text, 'NULL') || ', ' ||
  COALESCE(pump_voltage::text, 'NULL') || ', ' ||
  COALESCE(drain_voltage::text, 'NULL') || ', ' ||
  COALESCE(exhaust_voltage::text, 'NULL') || ', ' ||
  COALESCE(fan_active::text, 'false') || ', ' ||
  COALESCE(pump_active::text, 'false') || ', ' ||
  COALESCE(drain_active::text, 'false') || ', ' ||
  COALESCE(exhaust_active::text, 'false') || ', ' ||
  COALESCE(is_cooling::text, 'false') || ', ' ||
  COALESCE(is_on::text, 'false') || ', ' ||
  COALESCE(is_connected::text, 'true') || ', ' ||
  COALESCE(has_water::text, 'true') || ', ' ||
  COALESCE(water_level::text, '100.0') || ', ' ||
  COALESCE(quote_literal(fan_status), 'NULL') || ', ' ||
  COALESCE(quote_literal(pump_status), 'NULL') || ', ' ||
  COALESCE(quote_literal(drain_status), 'NULL') || ', ' ||
  COALESCE(quote_literal(exhaust_status), 'NULL') || ', ' ||
  COALESCE(fan_speed::text, '0') || ', ' ||
  COALESCE(quote_literal(overall_status), 'NULL') || ', ' ||
  COALESCE(quote_literal(motor_status), 'NULL') || ', ' ||
  COALESCE(quote_literal(water_status), 'NULL') || ', ' ||
  COALESCE(quote_literal(cooling_status), 'NULL') || ', ' ||
  COALESCE(motor_temp_within_parameters::text, 'NULL') || ', ' ||
  COALESCE(current_within_parameters::text, 'NULL') || ', ' ||
  COALESCE(voltage_within_parameters::text, 'NULL') || ', ' ||
  COALESCE(power_within_parameters::text, 'NULL') || ', ' ||
  COALESCE(water_within_parameters::text, 'NULL') || ', ' ||
  COALESCE(quote_literal(status_details::text), 'NULL') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || 
  ') ON CONFLICT (machine_id, timestamp) DO NOTHING;' AS sql_statement
FROM public.coolbreeze
ORDER BY timestamp;

-- ========================================
-- 14. EXPORT ALLIANCE DATA
-- ========================================
SELECT '-- Exporting alliance data...' AS info;
SELECT 
  'INSERT INTO public.alliance (id, machine_id, timestamp, ambient_temp, duct_temp, motor_temp, delta_t, voltage, current, power, voltage_1, voltage_2, voltage_3, voltage_4, voltage_5, voltage_6, fan_active, pump_active, drain_active, exhaust_active, is_cooling, is_heating, is_on, is_connected, has_water, overall_status, motor_status, water_status, cooling_status, heating_status, compressor_status, compressor_issue_first_detected_at, motor_temp_within_parameters, current_within_parameters, voltage_within_parameters, power_within_parameters, water_within_parameters, setpoint_within_parameters, status_details, created_at, updated_at) VALUES (' ||
  quote_literal(id::text) || ', ' ||
  quote_literal(machine_id::text) || ', ' ||
  quote_literal(timestamp::text) || ', ' ||
  COALESCE(ambient_temp::text, 'NULL') || ', ' ||
  COALESCE(duct_temp::text, 'NULL') || ', ' ||
  COALESCE(motor_temp::text, 'NULL') || ', ' ||
  COALESCE(delta_t::text, 'NULL') || ', ' ||
  COALESCE(voltage::text, 'NULL') || ', ' ||
  COALESCE(current::text, 'NULL') || ', ' ||
  COALESCE(power::text, 'NULL') || ', ' ||
  COALESCE(voltage_1::text, 'NULL') || ', ' ||
  COALESCE(voltage_2::text, 'NULL') || ', ' ||
  COALESCE(voltage_3::text, 'NULL') || ', ' ||
  COALESCE(voltage_4::text, 'NULL') || ', ' ||
  COALESCE(voltage_5::text, 'NULL') || ', ' ||
  COALESCE(voltage_6::text, 'NULL') || ', ' ||
  COALESCE(fan_active::text, 'false') || ', ' ||
  COALESCE(pump_active::text, 'false') || ', ' ||
  COALESCE(drain_active::text, 'false') || ', ' ||
  COALESCE(exhaust_active::text, 'false') || ', ' ||
  COALESCE(is_cooling::text, 'false') || ', ' ||
  COALESCE(is_heating::text, 'false') || ', ' ||
  COALESCE(is_on::text, 'false') || ', ' ||
  COALESCE(is_connected::text, 'true') || ', ' ||
  COALESCE(has_water::text, 'true') || ', ' ||
  COALESCE(quote_literal(overall_status), 'NULL') || ', ' ||
  COALESCE(quote_literal(motor_status), 'NULL') || ', ' ||
  COALESCE(quote_literal(water_status), 'NULL') || ', ' ||
  COALESCE(quote_literal(cooling_status), 'NULL') || ', ' ||
  COALESCE(quote_literal(heating_status), 'NULL') || ', ' ||
  COALESCE(quote_literal(compressor_status), 'NULL') || ', ' ||
  COALESCE(quote_literal(compressor_issue_first_detected_at::text), 'NULL') || ', ' ||
  COALESCE(motor_temp_within_parameters::text, 'NULL') || ', ' ||
  COALESCE(current_within_parameters::text, 'NULL') || ', ' ||
  COALESCE(voltage_within_parameters::text, 'NULL') || ', ' ||
  COALESCE(power_within_parameters::text, 'NULL') || ', ' ||
  COALESCE(water_within_parameters::text, 'NULL') || ', ' ||
  COALESCE(setpoint_within_parameters::text, 'NULL') || ', ' ||
  COALESCE(quote_literal(status_details::text), 'NULL') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || 
  ') ON CONFLICT (machine_id, timestamp) DO NOTHING;' AS sql_statement
FROM public.alliance
ORDER BY timestamp;

SELECT '-- Export complete! Copy the SQL statements above and run them on your staging database.' AS info;
*/

