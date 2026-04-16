-- ========================================
-- MIGRATE DATA USING COPY COMMANDS
-- ========================================
-- Purpose: Efficiently migrate data from production to staging using COPY
-- Usage: 
--   1. Run COPY TO commands on PRODUCTION to export CSV files
--   2. Upload CSV files to staging project storage or local machine
--   3. Run COPY FROM commands on STAGING to import CSV files
-- Date: 2025-12-08
-- ========================================
--
-- NOTE: COPY commands require superuser access or file system access.
-- For Supabase, you may need to use the Supabase CLI or dashboard.
-- Alternative: Use the export script (20251208_export_production_data.sql) 
-- which generates INSERT statements that can be run directly.
-- ========================================

-- ========================================
-- EXPORT FROM PRODUCTION (Run on PRODUCTION)
-- ========================================

-- Export profiles
\copy (SELECT * FROM public.profiles ORDER BY created_at) TO 'profiles.csv' WITH CSV HEADER;

-- Export user_roles
\copy (SELECT * FROM public.user_roles ORDER BY created_at) TO 'user_roles.csv' WITH CSV HEADER;

-- Export installer_company_assignments
\copy (SELECT * FROM public.installer_company_assignments ORDER BY assigned_at) TO 'installer_company_assignments.csv' WITH CSV HEADER;

-- Export client_admin_assignments
\copy (SELECT * FROM public.client_admin_assignments ORDER BY assigned_at) TO 'client_admin_assignments.csv' WITH CSV HEADER;

-- Export machines
\copy (SELECT * FROM public.machines ORDER BY created_at) TO 'machines.csv' WITH CSV HEADER;

-- Export api_keys
\copy (SELECT * FROM public.api_keys ORDER BY created_at) TO 'api_keys.csv' WITH CSV HEADER;

-- Export machine_voltage_config
\copy (SELECT * FROM public.machine_voltage_config ORDER BY created_at) TO 'machine_voltage_config.csv' WITH CSV HEADER;

-- Export machine_alert_config
\copy (SELECT * FROM public.machine_alert_config ORDER BY created_at) TO 'machine_alert_config.csv' WITH CSV HEADER;

-- Export machine_notification_preferences
\copy (SELECT * FROM public.machine_notification_preferences ORDER BY created_at) TO 'machine_notification_preferences.csv' WITH CSV HEADER;

-- Export machine_connection_status
\copy (SELECT * FROM public.machine_connection_status ORDER BY created_at) TO 'machine_connection_status.csv' WITH CSV HEADER;

-- Export readings_raw (may be large!)
\copy (SELECT * FROM public.readings_raw ORDER BY created_at) TO 'readings_raw.csv' WITH CSV HEADER;

-- Export cirrus
\copy (SELECT * FROM public.cirrus ORDER BY timestamp) TO 'cirrus.csv' WITH CSV HEADER;

-- Export coolbreeze
\copy (SELECT * FROM public.coolbreeze ORDER BY timestamp) TO 'coolbreeze.csv' WITH CSV HEADER;

-- Export alliance
\copy (SELECT * FROM public.alliance ORDER BY timestamp) TO 'alliance.csv' WITH CSV HEADER;

-- ========================================
-- IMPORT TO STAGING (Run on STAGING)
-- ========================================

-- Import profiles
\copy public.profiles FROM 'profiles.csv' WITH CSV HEADER ON CONFLICT (id) DO NOTHING;

-- Import user_roles
\copy public.user_roles FROM 'user_roles.csv' WITH CSV HEADER ON CONFLICT (user_id, role) DO NOTHING;

-- Import installer_company_assignments
\copy public.installer_company_assignments FROM 'installer_company_assignments.csv' WITH CSV HEADER ON CONFLICT DO NOTHING;

-- Import client_admin_assignments
\copy public.client_admin_assignments FROM 'client_admin_assignments.csv' WITH CSV HEADER ON CONFLICT (client_id) DO NOTHING;

-- Import machines
\copy public.machines FROM 'machines.csv' WITH CSV HEADER ON CONFLICT (id) DO NOTHING;

-- Import api_keys
\copy public.api_keys FROM 'api_keys.csv' WITH CSV HEADER ON CONFLICT (key) DO NOTHING;

-- Import machine_voltage_config
\copy public.machine_voltage_config FROM 'machine_voltage_config.csv' WITH CSV HEADER ON CONFLICT (machine_id) DO UPDATE SET
  voltage_input_1_function = EXCLUDED.voltage_input_1_function,
  voltage_input_2_function = EXCLUDED.voltage_input_2_function,
  voltage_input_3_function = EXCLUDED.voltage_input_3_function,
  voltage_input_4_function = EXCLUDED.voltage_input_4_function,
  voltage_input_5_function = EXCLUDED.voltage_input_5_function,
  voltage_input_6_function = EXCLUDED.voltage_input_6_function,
  voltage_active_threshold = EXCLUDED.voltage_active_threshold,
  updated_at = EXCLUDED.updated_at;

-- Import machine_alert_config
\copy public.machine_alert_config FROM 'machine_alert_config.csv' WITH CSV HEADER ON CONFLICT (machine_id) DO UPDATE SET
  motor_temp_warning = EXCLUDED.motor_temp_warning,
  motor_temp_critical = EXCLUDED.motor_temp_critical,
  motor_amps_warning = EXCLUDED.motor_amps_warning,
  current_min_alert = EXCLUDED.current_min_alert,
  current_max_alert = EXCLUDED.current_max_alert,
  voltage_min = EXCLUDED.voltage_min,
  voltage_max = EXCLUDED.voltage_max,
  delta_t_min_cooling = EXCLUDED.delta_t_min_cooling,
  delta_t_min_heating = EXCLUDED.delta_t_min_heating,
  delta_t_max_heating = EXCLUDED.delta_t_max_heating,
  setpoint_tolerance = EXCLUDED.setpoint_tolerance,
  duration_motor_temp_critical = EXCLUDED.duration_motor_temp_critical,
  duration_fan_failure = EXCLUDED.duration_fan_failure,
  duration_water_empty = EXCLUDED.duration_water_empty,
  duration_compressor_failure = EXCLUDED.duration_compressor_failure,
  reminder_interval_hours = EXCLUDED.reminder_interval_hours,
  send_recovery_emails = EXCLUDED.send_recovery_emails,
  updated_at = EXCLUDED.updated_at;

-- Import machine_notification_preferences
\copy public.machine_notification_preferences FROM 'machine_notification_preferences.csv' WITH CSV HEADER ON CONFLICT (machine_id, user_id) DO UPDATE SET
  enabled = EXCLUDED.enabled,
  updated_at = EXCLUDED.updated_at;

-- Import machine_connection_status
\copy public.machine_connection_status FROM 'machine_connection_status.csv' WITH CSV HEADER ON CONFLICT (machine_id) DO UPDATE SET
  last_seen_at = EXCLUDED.last_seen_at,
  is_connected = EXCLUDED.is_connected,
  connection_quality = EXCLUDED.connection_quality,
  last_reading_timestamp = EXCLUDED.last_reading_timestamp,
  consecutive_failures = EXCLUDED.consecutive_failures,
  updated_at = EXCLUDED.updated_at;

-- Import readings_raw
\copy public.readings_raw FROM 'readings_raw.csv' WITH CSV HEADER ON CONFLICT (machine_id, timestamp) DO NOTHING;

-- Import cirrus
\copy public.cirrus FROM 'cirrus.csv' WITH CSV HEADER ON CONFLICT (machine_id, timestamp) DO NOTHING;

-- Import coolbreeze
\copy public.coolbreeze FROM 'coolbreeze.csv' WITH CSV HEADER ON CONFLICT (machine_id, timestamp) DO NOTHING;

-- Import alliance
\copy public.alliance FROM 'alliance.csv' WITH CSV HEADER ON CONFLICT (machine_id, timestamp) DO NOTHING;
*/
