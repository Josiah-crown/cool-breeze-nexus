-- ========================================
-- COMPLETE DATABASE SCHEMA
-- ========================================
-- Purpose: Complete database recreation for new Supabase instance
-- Date: 2025-01-23
-- Usage: Run this entire file to create a fresh database
--
-- AI MIGRATION CONTEXT (LEGACY VS NEW SCHEMA):
-- 1. Table Name Changes:
--    - Legacy 'cirrus' table -> New 'cirrus_calculated' (processed data) AND 'cirrus_raw' (raw inputs)
--    - Legacy 'coolbreeze' table -> New 'coolbreeze_calculated' AND 'coolbreeze_raw'
--    - Legacy 'alliance' table -> New 'alliance_calculated' AND 'alliance_raw'
--
-- 2. New Columns & Features:
--    - 'fan_speed' (INTEGER, 0-100): Added to calculated tables (except Alliance/Heatpumps)
--    - 'pump_active' (BOOLEAN): Added to calculated tables
--    - 'is_heating' (BOOLEAN): Added to Alliance/CoolBreeze calculated tables
--    - 'water_level' (NUMERIC): Added to CoolBreeze tables
--
-- 3. Data Flow:
--    - Devices write to *_raw tables
--    - Database triggers process raw data -> *_calculated tables
--    - Frontend reads from *_calculated tables (formerly read directly from 'cirrus' etc.)
--    - 'machines' table remains the central registry
--
-- 4. Connection Points to Update:
--    - API endpoints writing data must point to *_raw tables
--    - Frontend queries for historical data must use get_historical_data() function or query *_calculated tables
--    - Alerts/Notifications trigger off *_calculated tables
-- ========================================

-- ========================================
-- 1. ENUMS
-- ========================================
CREATE TYPE public.app_role AS ENUM ('super_admin', 'company', 'installer', 'client');

-- ========================================
-- 2. SHARED TABLES (User Management)
-- ========================================

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  cell_number TEXT NOT NULL,
  country TEXT NOT NULL,
  state TEXT NOT NULL,
  city TEXT NOT NULL,
  street TEXT NOT NULL,
  suburb TEXT NOT NULL,
  po_box TEXT,
  full_name_business TEXT NOT NULL,
  email_subscribed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Installer-company assignments
CREATE TABLE public.installer_company_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Client-installer assignments
CREATE TABLE public.client_admin_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE(client_id)
);

-- ========================================
-- 3. MACHINE REGISTRY (Shared)
-- ========================================

CREATE TABLE public.machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('evaporative', 'heatpump', 'airconditioner')),
  manufacturer TEXT, -- e.g., 'Cirrus', 'CoolBreeze', etc.
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location TEXT,
  api_key TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  api_endpoint TEXT,
  temperature_setpoint NUMERIC CHECK (temperature_setpoint IS NULL OR (temperature_setpoint >= 0 AND temperature_setpoint <= 75)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================
-- 4. CONNECTION STATUS (Shared - All Manufacturers)
-- ========================================

CREATE TABLE public.machine_connection_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_connected BOOLEAN NOT NULL DEFAULT false,
  connection_quality TEXT CHECK (connection_quality IN ('excellent', 'good', 'fair', 'poor', 'disconnected')),
  last_reading_timestamp TIMESTAMPTZ,
  consecutive_failures INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(machine_id)
);

-- ========================================
-- 5. API KEYS (Shared)
-- ========================================

CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  machine_id UUID REFERENCES public.machines(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true NOT NULL,
  description TEXT
);

-- ========================================
-- 6. NOTIFICATION PREFERENCES (Shared)
-- ========================================

CREATE TABLE public.machine_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(machine_id, user_id)
);

-- ========================================
-- 7. CIRRUS TABLES
-- ========================================

-- Cirrus Raw Readings (2 weeks retention)
CREATE TABLE public.cirrus_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Raw sensor readings
  motor_temp NUMERIC(5,2),
  inside_temp NUMERIC(5,2),
  outside_temp NUMERIC(5,2),
  current NUMERIC(6,2),
  voltage NUMERIC(6,2),  -- Main line voltage from CT
  
  -- Configurable voltage pickups (up to 6)
  voltage_input_1 NUMERIC(5,2),
  voltage_input_2 NUMERIC(5,2),
  voltage_input_3 NUMERIC(5,2),
  voltage_input_4 NUMERIC(5,2),
  voltage_input_5 NUMERIC(5,2),
  voltage_input_6 NUMERIC(5,2),
  
  -- Raw water status
  has_water BOOLEAN,
  
  -- Metadata
  sensor_read_count INTEGER DEFAULT 1,
  api_key_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_cirrus_raw_machine_timestamp UNIQUE (machine_id, timestamp)
);

-- Cirrus Calculated Data (1 year retention)
CREATE TABLE public.cirrus_calculated (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Processed temperatures
  ambient_temp NUMERIC(5,2),
  duct_temp NUMERIC(5,2),
  motor_temp NUMERIC(5,2),
  delta_t NUMERIC(5,2),
  
  -- Main electrical (from CT)
  voltage NUMERIC(6,2),  -- Line voltage from CT
  current NUMERIC(6,2),
  power NUMERIC(7,2),
  
  -- Pickup voltages (all 6, mapped from voltage_inputs via voltage_config)
  voltage_1 NUMERIC(5,2),  -- Mapped from voltage_input_1 based on config
  voltage_2 NUMERIC(5,2),  -- Mapped from voltage_input_2 based on config
  voltage_3 NUMERIC(5,2),  -- Mapped from voltage_input_3 based on config
  voltage_4 NUMERIC(5,2),  -- Mapped from voltage_input_4 based on config
  voltage_5 NUMERIC(5,2),  -- Mapped from voltage_input_5 based on config
  voltage_6 NUMERIC(5,2),  -- Mapped from voltage_input_6 based on config
  
  -- Operational states (calculated from pickup voltages)
  fan_active BOOLEAN NOT NULL DEFAULT false,
  fan_speed INTEGER DEFAULT 0 CHECK (fan_speed >= 0 AND fan_speed <= 100), -- Fan speed percentage (0-100)
  pump_active BOOLEAN NOT NULL DEFAULT false,
  drain_active BOOLEAN NOT NULL DEFAULT false,
  exhaust_active BOOLEAN NOT NULL DEFAULT false,
  is_cooling BOOLEAN NOT NULL DEFAULT false,
  is_on BOOLEAN NOT NULL DEFAULT false,
  is_connected BOOLEAN NOT NULL DEFAULT true,
  
  -- Water status
  has_water BOOLEAN NOT NULL DEFAULT true,
  
  -- Calculated status
  overall_status TEXT NOT NULL DEFAULT 'unknown' 
    CHECK (overall_status IN ('operational', 'warning', 'error', 'offline', 'unknown')),
  motor_status TEXT NOT NULL DEFAULT 'normal'
    CHECK (motor_status IN ('normal', 'warning', 'critical')),
  water_status TEXT NOT NULL DEFAULT 'ok'
    CHECK (water_status IN ('ok', 'low', 'empty')),
  cooling_status TEXT NOT NULL DEFAULT 'idle'
    CHECK (cooling_status IN ('idle', 'active', 'inefficient')),
  
  -- Parameter compliance flags
  motor_temp_within_parameters BOOLEAN,
  current_within_parameters BOOLEAN,
  voltage_within_parameters BOOLEAN,
  power_within_parameters BOOLEAN,
  water_within_parameters BOOLEAN,
  
  -- Additional details
  status_details JSONB,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_cirrus_calculated_machine_timestamp UNIQUE (machine_id, timestamp)
);

-- Cirrus Notifications Configuration
CREATE TABLE public.cirrus_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  
  -- Temperature thresholds
  motor_temp_warning DECIMAL(5,2) DEFAULT 60.0,
  motor_temp_critical DECIMAL(5,2) DEFAULT 70.0,
  
  -- Current thresholds
  motor_amps_warning DECIMAL(6,2) DEFAULT 15.0,
  
  -- Voltage thresholds
  voltage_min DECIMAL(6,2) DEFAULT 200.0,
  voltage_max DECIMAL(6,2) DEFAULT 250.0,
  pickup_voltage_min DECIMAL(5,2) DEFAULT 6.0,
  
  -- Delta T thresholds
  delta_t_min_cooling DECIMAL(5,2) DEFAULT 2.0,
  
  -- Duration thresholds (minutes)
  duration_motor_temp_critical INTEGER DEFAULT 15,
  duration_fan_failure INTEGER DEFAULT 10,
  duration_pump_failure INTEGER DEFAULT 30,
  duration_cooling_ineffective INTEGER DEFAULT 30,
  duration_low_water INTEGER DEFAULT 15,
  
  -- Alert settings
  reminder_interval_hours INTEGER DEFAULT 24,
  send_recovery_emails BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(machine_id)
);

-- Cirrus Voltage Configuration
CREATE TABLE public.cirrus_voltage_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  
  -- Map voltage inputs to functions (Custom_1 through Custom_6)
  voltage_input_1_function TEXT CHECK (voltage_input_1_function IN ('Custom_1', 'Custom_2', 'Custom_3', 'Custom_4', 'Custom_5', 'Custom_6', 'unused')),
  voltage_input_2_function TEXT CHECK (voltage_input_2_function IN ('Custom_1', 'Custom_2', 'Custom_3', 'Custom_4', 'Custom_5', 'Custom_6', 'unused')),
  voltage_input_3_function TEXT CHECK (voltage_input_3_function IN ('Custom_1', 'Custom_2', 'Custom_3', 'Custom_4', 'Custom_5', 'Custom_6', 'unused')),
  voltage_input_4_function TEXT CHECK (voltage_input_4_function IN ('Custom_1', 'Custom_2', 'Custom_3', 'Custom_4', 'Custom_5', 'Custom_6', 'unused')),
  voltage_input_5_function TEXT CHECK (voltage_input_5_function IN ('Custom_1', 'Custom_2', 'Custom_3', 'Custom_4', 'Custom_5', 'Custom_6', 'unused')),
  voltage_input_6_function TEXT CHECK (voltage_input_6_function IN ('Custom_1', 'Custom_2', 'Custom_3', 'Custom_4', 'Custom_5', 'Custom_6', 'unused')),
  
  -- Voltage threshold for "active" state
  voltage_active_threshold NUMERIC(4,2) DEFAULT 6.0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(machine_id)
);

-- ========================================
-- 8. COOLBREEZE TABLES
-- ========================================

-- CoolBreeze Raw Readings (2 weeks retention)
CREATE TABLE public.coolbreeze_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Raw sensor readings
  motor_temp NUMERIC(5,2),
  inside_temp NUMERIC(5,2),
  outside_temp NUMERIC(5,2),
  current NUMERIC(6,2),
  voltage NUMERIC(6,2),  -- Main line voltage from CT
  
  -- Configurable voltage pickups (up to 6)
  voltage_input_1 NUMERIC(5,2),
  voltage_input_2 NUMERIC(5,2),
  voltage_input_3 NUMERIC(5,2),
  voltage_input_4 NUMERIC(5,2),
  voltage_input_5 NUMERIC(5,2),
  voltage_input_6 NUMERIC(5,2),
  
  -- Raw water status
  has_water BOOLEAN,
  water_level NUMERIC(5,2),  -- If applicable for CoolBreeze
  
  -- Metadata
  sensor_read_count INTEGER DEFAULT 1,
  api_key_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_coolbreeze_raw_machine_timestamp UNIQUE (machine_id, timestamp)
);

-- CoolBreeze Calculated Data (1 year retention)
CREATE TABLE public.coolbreeze_calculated (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Processed temperatures
  ambient_temp NUMERIC(5,2),
  duct_temp NUMERIC(5,2),
  motor_temp NUMERIC(5,2),
  delta_t NUMERIC(5,2),
  
  -- Main electrical (from CT)
  voltage NUMERIC(6,2),  -- Line voltage from CT
  current NUMERIC(6,2),
  power NUMERIC(7,2),
  
  -- Pickup voltages (all 6, mapped from voltage_inputs via voltage_config)
  voltage_1 NUMERIC(5,2),
  voltage_2 NUMERIC(5,2),
  voltage_3 NUMERIC(5,2),
  voltage_4 NUMERIC(5,2),
  voltage_5 NUMERIC(5,2),
  voltage_6 NUMERIC(5,2),
  
  -- Operational states (calculated from pickup voltages)
  fan_active BOOLEAN NOT NULL DEFAULT false,
  fan_speed INTEGER DEFAULT 0 CHECK (fan_speed >= 0 AND fan_speed <= 100), -- Fan speed percentage (0-100)
  pump_active BOOLEAN NOT NULL DEFAULT false,
  drain_active BOOLEAN NOT NULL DEFAULT false,
  exhaust_active BOOLEAN NOT NULL DEFAULT false,
  is_cooling BOOLEAN NOT NULL DEFAULT false,
  is_on BOOLEAN NOT NULL DEFAULT false,
  is_connected BOOLEAN NOT NULL DEFAULT true,
  
  -- Water status
  has_water BOOLEAN NOT NULL DEFAULT true,
  water_level NUMERIC(5,2),
  
  -- Calculated status
  overall_status TEXT NOT NULL DEFAULT 'unknown' 
    CHECK (overall_status IN ('operational', 'warning', 'error', 'offline', 'unknown')),
  motor_status TEXT NOT NULL DEFAULT 'normal'
    CHECK (motor_status IN ('normal', 'warning', 'critical')),
  water_status TEXT NOT NULL DEFAULT 'ok'
    CHECK (water_status IN ('ok', 'low', 'empty')),
  cooling_status TEXT NOT NULL DEFAULT 'idle'
    CHECK (cooling_status IN ('idle', 'active', 'inefficient')),
  
  -- Parameter compliance flags
  motor_temp_within_parameters BOOLEAN,
  current_within_parameters BOOLEAN,
  voltage_within_parameters BOOLEAN,
  power_within_parameters BOOLEAN,
  water_within_parameters BOOLEAN,
  
  -- Additional details
  status_details JSONB,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_coolbreeze_calculated_machine_timestamp UNIQUE (machine_id, timestamp)
);

-- CoolBreeze Notifications Configuration
CREATE TABLE public.coolbreeze_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  
  -- Temperature thresholds
  motor_temp_warning DECIMAL(5,2) DEFAULT 60.0,
  motor_temp_critical DECIMAL(5,2) DEFAULT 70.0,
  compressor_temp_critical DECIMAL(5,2) DEFAULT 90.0,
  
  -- Current thresholds
  motor_amps_warning DECIMAL(6,2) DEFAULT 15.0,
  compressor_amps_warning DECIMAL(6,2) DEFAULT 25.0,
  
  -- Voltage thresholds
  voltage_min DECIMAL(6,2) DEFAULT 200.0,
  voltage_max DECIMAL(6,2) DEFAULT 250.0,
  pickup_voltage_min DECIMAL(5,2) DEFAULT 6.0,
  
  -- Delta T thresholds
  delta_t_min_cooling DECIMAL(5,2) DEFAULT 2.0,
  delta_t_min_heating DECIMAL(5,2) DEFAULT 6.0,
  delta_t_max_heating DECIMAL(5,2) DEFAULT 15.0,
  
  -- Heat pump specific
  setpoint_tolerance DECIMAL(5,2) DEFAULT 2.0,
  
  -- Duration thresholds (minutes)
  duration_motor_temp_critical INTEGER DEFAULT 15,
  duration_fan_failure INTEGER DEFAULT 10,
  duration_pump_failure INTEGER DEFAULT 30,
  duration_cooling_ineffective INTEGER DEFAULT 30,
  duration_heating_failure INTEGER DEFAULT 15,
  duration_heating_excessive INTEGER DEFAULT 30,
  duration_setpoint_deviation INTEGER DEFAULT 10,
  duration_low_water INTEGER DEFAULT 15,
  
  -- Alert settings
  reminder_interval_hours INTEGER DEFAULT 24,
  send_recovery_emails BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(machine_id)
);

-- CoolBreeze Voltage Configuration
CREATE TABLE public.coolbreeze_voltage_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  
  -- Map voltage inputs to functions (Custom_1 through Custom_6)
  voltage_input_1_function TEXT CHECK (voltage_input_1_function IN ('Custom_1', 'Custom_2', 'Custom_3', 'Custom_4', 'Custom_5', 'Custom_6', 'unused')),
  voltage_input_2_function TEXT CHECK (voltage_input_2_function IN ('Custom_1', 'Custom_2', 'Custom_3', 'Custom_4', 'Custom_5', 'Custom_6', 'unused')),
  voltage_input_3_function TEXT CHECK (voltage_input_3_function IN ('Custom_1', 'Custom_2', 'Custom_3', 'Custom_4', 'Custom_5', 'Custom_6', 'unused')),
  voltage_input_4_function TEXT CHECK (voltage_input_4_function IN ('Custom_1', 'Custom_2', 'Custom_3', 'Custom_4', 'Custom_5', 'Custom_6', 'unused')),
  voltage_input_5_function TEXT CHECK (voltage_input_5_function IN ('Custom_1', 'Custom_2', 'Custom_3', 'Custom_4', 'Custom_5', 'Custom_6', 'unused')),
  voltage_input_6_function TEXT CHECK (voltage_input_6_function IN ('Custom_1', 'Custom_2', 'Custom_3', 'Custom_4', 'Custom_5', 'Custom_6', 'unused')),
  
  -- Voltage threshold for "active" state
  voltage_active_threshold NUMERIC(4,2) DEFAULT 6.0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(machine_id)
);

-- ========================================
-- 9. ALLIANCE TABLES
-- ========================================

-- Alliance Raw Readings (2 weeks retention)
CREATE TABLE public.alliance_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Raw sensor readings
  motor_temp NUMERIC(5,2),
  inside_temp NUMERIC(5,2),
  outside_temp NUMERIC(5,2),
  current NUMERIC(6,2),
  voltage NUMERIC(6,2),  -- Main line voltage from CT
  
  -- Configurable voltage pickups (up to 6)
  voltage_input_1 NUMERIC(5,2),
  voltage_input_2 NUMERIC(5,2),
  voltage_input_3 NUMERIC(5,2),
  voltage_input_4 NUMERIC(5,2),
  voltage_input_5 NUMERIC(5,2),
  voltage_input_6 NUMERIC(5,2),
  
  -- Raw water status
  has_water BOOLEAN,
  
  -- Metadata
  sensor_read_count INTEGER DEFAULT 1,
  api_key_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_alliance_raw_machine_timestamp UNIQUE (machine_id, timestamp)
);

-- Alliance Calculated Data (1 year retention)
CREATE TABLE public.alliance_calculated (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Processed temperatures
  ambient_temp NUMERIC(5,2),
  duct_temp NUMERIC(5,2),
  motor_temp NUMERIC(5,2),
  delta_t NUMERIC(5,2),
  
  -- Main electrical (from CT)
  voltage NUMERIC(6,2),  -- Line voltage from CT
  current NUMERIC(6,2),
  power NUMERIC(7,2),
  
  -- Pickup voltages (all 6, mapped from voltage_inputs via voltage_config)
  voltage_1 NUMERIC(5,2),
  voltage_2 NUMERIC(5,2),
  voltage_3 NUMERIC(5,2),
  voltage_4 NUMERIC(5,2),
  voltage_5 NUMERIC(5,2),
  voltage_6 NUMERIC(5,2),
  
  -- Operational states (calculated from pickup voltages)
  fan_active BOOLEAN NOT NULL DEFAULT false,
  -- NOTE: fan_speed is NOT included for alliance (heatpumps don't have fans)
  pump_active BOOLEAN NOT NULL DEFAULT false,
  drain_active BOOLEAN NOT NULL DEFAULT false,
  exhaust_active BOOLEAN NOT NULL DEFAULT false,
  is_cooling BOOLEAN NOT NULL DEFAULT false,
  is_heating BOOLEAN NOT NULL DEFAULT false,
  is_on BOOLEAN NOT NULL DEFAULT false,
  is_connected BOOLEAN NOT NULL DEFAULT true,
  
  -- Water status
  has_water BOOLEAN NOT NULL DEFAULT true,
  
  -- Calculated status
  overall_status TEXT NOT NULL DEFAULT 'unknown' 
    CHECK (overall_status IN ('operational', 'warning', 'error', 'offline', 'unknown')),
  motor_status TEXT NOT NULL DEFAULT 'normal'
    CHECK (motor_status IN ('normal', 'warning', 'critical')),
  water_status TEXT NOT NULL DEFAULT 'ok'
    CHECK (water_status IN ('ok', 'low', 'empty')),
  cooling_status TEXT NOT NULL DEFAULT 'idle'
    CHECK (cooling_status IN ('idle', 'active', 'inefficient')),
  heating_status TEXT NOT NULL DEFAULT 'idle'
    CHECK (heating_status IN ('idle', 'active', 'inefficient', 'excessive')),
  
  -- Parameter compliance flags
  motor_temp_within_parameters BOOLEAN,
  current_within_parameters BOOLEAN,
  voltage_within_parameters BOOLEAN,
  power_within_parameters BOOLEAN,
  water_within_parameters BOOLEAN,
  setpoint_within_parameters BOOLEAN,
  
  -- Additional details
  status_details JSONB,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_alliance_calculated_machine_timestamp UNIQUE (machine_id, timestamp)
);

-- Alliance Notifications Configuration
CREATE TABLE public.alliance_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  
  -- Temperature thresholds
  motor_temp_warning DECIMAL(5,2) DEFAULT 60.0,
  motor_temp_critical DECIMAL(5,2) DEFAULT 70.0,
  compressor_temp_critical DECIMAL(5,2) DEFAULT 90.0,
  
  -- Current thresholds
  motor_amps_warning DECIMAL(6,2) DEFAULT 15.0,
  compressor_amps_warning DECIMAL(6,2) DEFAULT 25.0,
  
  -- Voltage thresholds
  voltage_min DECIMAL(6,2) DEFAULT 200.0,
  voltage_max DECIMAL(6,2) DEFAULT 250.0,
  pickup_voltage_min DECIMAL(5,2) DEFAULT 6.0,
  
  -- Delta T thresholds
  delta_t_min_cooling DECIMAL(5,2) DEFAULT 2.0,
  delta_t_min_heating DECIMAL(5,2) DEFAULT 6.0,
  delta_t_max_heating DECIMAL(5,2) DEFAULT 15.0,
  
  -- Heat pump specific
  setpoint_tolerance DECIMAL(5,2) DEFAULT 2.0,
  
  -- Duration thresholds (minutes)
  duration_motor_temp_critical INTEGER DEFAULT 15,
  duration_fan_failure INTEGER DEFAULT 10,
  duration_pump_failure INTEGER DEFAULT 30,
  duration_cooling_ineffective INTEGER DEFAULT 30,
  duration_heating_failure INTEGER DEFAULT 15,
  duration_heating_excessive INTEGER DEFAULT 30,
  duration_setpoint_deviation INTEGER DEFAULT 10,
  duration_low_water INTEGER DEFAULT 15,
  
  -- Alert settings
  reminder_interval_hours INTEGER DEFAULT 24,
  send_recovery_emails BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(machine_id)
);

-- Alliance Voltage Configuration
CREATE TABLE public.alliance_voltage_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  
  -- Map voltage inputs to functions (Custom_1 through Custom_6)
  voltage_input_1_function TEXT CHECK (voltage_input_1_function IN ('Custom_1', 'Custom_2', 'Custom_3', 'Custom_4', 'Custom_5', 'Custom_6', 'unused')),
  voltage_input_2_function TEXT CHECK (voltage_input_2_function IN ('Custom_1', 'Custom_2', 'Custom_3', 'Custom_4', 'Custom_5', 'Custom_6', 'unused')),
  voltage_input_3_function TEXT CHECK (voltage_input_3_function IN ('Custom_1', 'Custom_2', 'Custom_3', 'Custom_4', 'Custom_5', 'Custom_6', 'unused')),
  voltage_input_4_function TEXT CHECK (voltage_input_4_function IN ('Custom_1', 'Custom_2', 'Custom_3', 'Custom_4', 'Custom_5', 'Custom_6', 'unused')),
  voltage_input_5_function TEXT CHECK (voltage_input_5_function IN ('Custom_1', 'Custom_2', 'Custom_3', 'Custom_4', 'Custom_5', 'Custom_6', 'unused')),
  voltage_input_6_function TEXT CHECK (voltage_input_6_function IN ('Custom_1', 'Custom_2', 'Custom_3', 'Custom_4', 'Custom_5', 'Custom_6', 'unused')),
  
  -- Voltage threshold for "active" state
  voltage_active_threshold NUMERIC(4,2) DEFAULT 6.0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(machine_id)
);

-- ========================================
-- 10. INDEXES
-- ========================================

-- Profiles
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- User roles
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);

-- Machines
CREATE INDEX idx_machines_owner_id ON public.machines(owner_id);
CREATE INDEX idx_machines_manufacturer ON public.machines(manufacturer);
CREATE INDEX idx_machines_type ON public.machines(type);

-- Connection status
CREATE INDEX idx_connection_status_machine_id ON public.machine_connection_status(machine_id);
CREATE INDEX idx_connection_status_last_seen ON public.machine_connection_status(last_seen_at DESC);

-- API keys
CREATE INDEX idx_api_keys_machine_id ON public.api_keys(machine_id);
CREATE INDEX idx_api_keys_key ON public.api_keys(key);

-- Notification preferences
CREATE INDEX idx_notif_prefs_machine_id ON public.machine_notification_preferences(machine_id);
CREATE INDEX idx_notif_prefs_user_id ON public.machine_notification_preferences(user_id);

-- Cirrus Raw
CREATE INDEX idx_cirrus_raw_machine_id ON public.cirrus_raw(machine_id);
CREATE INDEX idx_cirrus_raw_timestamp ON public.cirrus_raw(timestamp DESC);
CREATE INDEX idx_cirrus_raw_machine_timestamp ON public.cirrus_raw(machine_id, timestamp DESC);

-- Cirrus Calculated
CREATE INDEX idx_cirrus_calc_machine_id ON public.cirrus_calculated(machine_id);
CREATE INDEX idx_cirrus_calc_timestamp ON public.cirrus_calculated(timestamp DESC);
CREATE INDEX idx_cirrus_calc_machine_timestamp ON public.cirrus_calculated(machine_id, timestamp DESC);
CREATE INDEX idx_cirrus_calc_status ON public.cirrus_calculated(overall_status);

-- CoolBreeze Raw
CREATE INDEX idx_coolbreeze_raw_machine_id ON public.coolbreeze_raw(machine_id);
CREATE INDEX idx_coolbreeze_raw_timestamp ON public.coolbreeze_raw(timestamp DESC);
CREATE INDEX idx_coolbreeze_raw_machine_timestamp ON public.coolbreeze_raw(machine_id, timestamp DESC);

-- CoolBreeze Calculated
CREATE INDEX idx_coolbreeze_calc_machine_id ON public.coolbreeze_calculated(machine_id);
CREATE INDEX idx_coolbreeze_calc_timestamp ON public.coolbreeze_calculated(timestamp DESC);
CREATE INDEX idx_coolbreeze_calc_machine_timestamp ON public.coolbreeze_calculated(machine_id, timestamp DESC);
CREATE INDEX idx_coolbreeze_calc_status ON public.coolbreeze_calculated(overall_status);

-- Alliance Raw
CREATE INDEX idx_alliance_raw_machine_id ON public.alliance_raw(machine_id);
CREATE INDEX idx_alliance_raw_timestamp ON public.alliance_raw(timestamp DESC);
CREATE INDEX idx_alliance_raw_machine_timestamp ON public.alliance_raw(machine_id, timestamp DESC);

-- Alliance Calculated
CREATE INDEX idx_alliance_calc_machine_id ON public.alliance_calculated(machine_id);
CREATE INDEX idx_alliance_calc_timestamp ON public.alliance_calculated(timestamp DESC);
CREATE INDEX idx_alliance_calc_machine_timestamp ON public.alliance_calculated(machine_id, timestamp DESC);
CREATE INDEX idx_alliance_calc_status ON public.alliance_calculated(overall_status);

-- ========================================
-- 11. ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installer_company_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_admin_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_connection_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cirrus_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cirrus_calculated ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cirrus_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cirrus_voltage_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coolbreeze_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coolbreeze_calculated ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coolbreeze_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coolbreeze_voltage_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alliance_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alliance_calculated ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alliance_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alliance_voltage_config ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 12. HELPER FUNCTIONS
-- ========================================

-- Function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user's admin (for clients)
CREATE OR REPLACE FUNCTION public.get_user_admin(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT admin_id
  FROM public.client_admin_assignments
  WHERE client_id = _user_id
  LIMIT 1
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ========================================
-- 13. TRIGGERS
-- ========================================

-- Auto-update updated_at on profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-update updated_at on machines
CREATE TRIGGER update_machines_updated_at
  BEFORE UPDATE ON public.machines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-update updated_at on connection status
CREATE TRIGGER update_connection_status_updated_at
  BEFORE UPDATE ON public.machine_connection_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-update updated_at on notification preferences
CREATE TRIGGER update_notif_prefs_updated_at
  BEFORE UPDATE ON public.machine_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-update updated_at on cirrus tables
CREATE TRIGGER update_cirrus_calc_updated_at
  BEFORE UPDATE ON public.cirrus_calculated
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cirrus_notif_updated_at
  BEFORE UPDATE ON public.cirrus_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cirrus_voltage_updated_at
  BEFORE UPDATE ON public.cirrus_voltage_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-update updated_at on coolbreeze tables
CREATE TRIGGER update_coolbreeze_calc_updated_at
  BEFORE UPDATE ON public.coolbreeze_calculated
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coolbreeze_notif_updated_at
  BEFORE UPDATE ON public.coolbreeze_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coolbreeze_voltage_updated_at
  BEFORE UPDATE ON public.coolbreeze_voltage_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-update updated_at on alliance tables
CREATE TRIGGER update_alliance_calc_updated_at
  BEFORE UPDATE ON public.alliance_calculated
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_alliance_notif_updated_at
  BEFORE UPDATE ON public.alliance_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_alliance_voltage_updated_at
  BEFORE UPDATE ON public.alliance_voltage_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- 14. RLS POLICIES
-- ========================================
-- Note: Full RLS policies should be added based on your access control requirements
-- This is a template - you'll need to add policies for:
-- - Profiles (users can view/edit their own, admins can view their clients, etc.)
-- - User roles (role-based access)
-- - Machines (hierarchy-based access)
-- - All manufacturer tables (based on machine ownership/hierarchy)
-- - Connection status (based on machine access)
-- - API keys (based on machine ownership)
-- - Notification preferences (based on user/machine access)

-- Example: Super admins can view all machines
CREATE POLICY "Super admins can view all machines"
  ON public.machines FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Example: Users can view their own machines
CREATE POLICY "Users can view their own machines"
  ON public.machines FOR SELECT
  USING (owner_id = auth.uid());

-- Add more policies as needed based on your access control requirements

-- ========================================
-- 15. TABLE GRANTS (CRITICAL FOR RLS)
-- ========================================
-- IMPORTANT: RLS policies require table-level GRANTs to work properly
-- Without these grants, authenticated users will get 403 Forbidden errors
-- even if RLS policies are correctly configured

-- Grant USAGE on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO service_role;

-- Grant SELECT on cirrus_calculated table (for frontend queries)
GRANT SELECT ON public.cirrus_calculated TO authenticated;
GRANT SELECT ON public.cirrus_calculated TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cirrus_calculated TO service_role;

-- Grant SELECT on cirrus_raw table
GRANT SELECT ON public.cirrus_raw TO authenticated;
GRANT SELECT ON public.cirrus_raw TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cirrus_raw TO service_role;

-- Grant SELECT on coolbreeze_calculated table (for frontend queries)
GRANT SELECT ON public.coolbreeze_calculated TO authenticated;
GRANT SELECT ON public.coolbreeze_calculated TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coolbreeze_calculated TO service_role;

-- Grant SELECT on coolbreeze_raw table
GRANT SELECT ON public.coolbreeze_raw TO authenticated;
GRANT SELECT ON public.coolbreeze_raw TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coolbreeze_raw TO service_role;

-- Grant SELECT on alliance_calculated table (for frontend queries)
GRANT SELECT ON public.alliance_calculated TO authenticated;
GRANT SELECT ON public.alliance_calculated TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alliance_calculated TO service_role;

-- Grant SELECT on alliance_raw table
GRANT SELECT ON public.alliance_raw TO authenticated;
GRANT SELECT ON public.alliance_raw TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alliance_raw TO service_role;

-- ========================================
-- 16. COMMENTS
-- ========================================

COMMENT ON TABLE public.profiles IS 'User profile information';
COMMENT ON TABLE public.user_roles IS 'User role assignments (super_admin, company, installer, client)';
COMMENT ON TABLE public.machines IS 'Machine registry - basic info only, status comes from manufacturer_calculated tables';
COMMENT ON TABLE public.machine_connection_status IS 'Connection status tracking for all manufacturers (shared)';
COMMENT ON TABLE public.cirrus_raw IS 'Raw sensor readings for Cirrus machines (2 weeks retention)';
COMMENT ON TABLE public.cirrus_calculated IS 'Processed/calculated data for Cirrus machines (1 year retention)';
COMMENT ON TABLE public.cirrus_notifications IS 'Notification thresholds and settings for Cirrus machines';
COMMENT ON TABLE public.cirrus_voltage_config IS 'Voltage input mappings for Cirrus machines (maps voltage_input_1-6 to Custom_1-6)';
COMMENT ON TABLE public.coolbreeze_raw IS 'Raw sensor readings for CoolBreeze machines (2 weeks retention)';
COMMENT ON TABLE public.coolbreeze_calculated IS 'Processed/calculated data for CoolBreeze machines (1 year retention)';
COMMENT ON TABLE public.coolbreeze_notifications IS 'Notification thresholds and settings for CoolBreeze machines';
COMMENT ON TABLE public.coolbreeze_voltage_config IS 'Voltage input mappings for CoolBreeze machines (maps voltage_input_1-6 to Custom_1-6)';
COMMENT ON TABLE public.alliance_raw IS 'Raw sensor readings for Alliance machines (2 weeks retention)';
COMMENT ON TABLE public.alliance_calculated IS 'Processed/calculated data for Alliance machines (1 year retention)';
COMMENT ON TABLE public.alliance_notifications IS 'Notification thresholds and settings for Alliance machines';
COMMENT ON TABLE public.alliance_voltage_config IS 'Voltage input mappings for Alliance machines (maps voltage_input_1-6 to Custom_1-6)';

-- ========================================
-- END OF SCHEMA
-- ========================================
-- Next Steps:
-- 1. Add full RLS policies based on your access control requirements
-- 2. Create processing triggers: {manufacturer}_raw → {manufacturer}_calculated
-- 3. Create cleanup jobs: Auto-delete data older than retention period
-- 4. Create functions: Update machines table from {manufacturer}_calculated
-- 5. Create functions: Update connection_status from latest readings
-- ========================================

