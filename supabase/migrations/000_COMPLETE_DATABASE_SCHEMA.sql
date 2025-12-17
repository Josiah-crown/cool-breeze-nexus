-- ========================================
-- COMPLETE DATABASE SCHEMA (SIMPLIFIED ARCHITECTURE)
-- ========================================
-- Purpose: Complete database schema with generic config tables
-- Date: 2025-02-03
-- 
-- ARCHITECTURE:
-- - Generic tables for ALL manufacturers (machine_voltage_config, machine_alert_config)
-- - Per manufacturer: ONLY the data table (cirrus, coolbreeze, alliance)
-- - Adding a new manufacturer = 1 data table + 1 processing function
--
-- DATA FLOW:
-- ESP32 → readings_raw → trigger (checks manufacturer) → cirrus/coolbreeze/alliance → frontend
-- ========================================

-- ========================================
-- 1. ENUMS
-- ========================================
CREATE TYPE public.app_role AS ENUM ('super_admin', 'company', 'installer', 'client');

-- ========================================
-- 2. USER MANAGEMENT TABLES
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
  manufacturer TEXT, -- e.g., 'Cirrus', 'CoolBreeze', 'Alliance'
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location TEXT,
  api_key TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  api_endpoint TEXT,
  temperature_setpoint NUMERIC CHECK (temperature_setpoint IS NULL OR (temperature_setpoint >= 0 AND temperature_setpoint <= 75)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================
-- 4. API KEYS (Shared)
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
-- 5. READINGS_RAW (Universal - ALL ESP32 data enters here)
-- ========================================

CREATE TABLE public.readings_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Temperature sensors
  motor_temp NUMERIC(5,2),
  inside_temp NUMERIC(5,2),   -- Duct temp (outlet)
  outside_temp NUMERIC(5,2),  -- Ambient temp (inlet)
  
  -- Electrical (CT sensor)
  current NUMERIC(6,2),
  voltage NUMERIC(6,2),
  power NUMERIC(7,2),
  
  -- Voltage pickups (up to 6 configurable inputs)
  voltage_input_1 NUMERIC(5,2),  -- Default: Fan
  voltage_input_2 NUMERIC(5,2),  -- Default: Pump
  voltage_input_3 NUMERIC(5,2),  -- Default: Drain
  voltage_input_4 NUMERIC(5,2),  -- Default: Exhaust
  voltage_input_5 NUMERIC(5,2),  -- GPIO5: Water/Float switch OR Pump relay (heatpump)
  voltage_input_6 NUMERIC(5,2),  -- Reserved
  
  -- Water status (from has_water field or voltage_input_5)
  has_water BOOLEAN,
  
  -- Metadata
  sensor_read_count INTEGER DEFAULT 1,
  api_key_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_readings_raw_machine_timestamp UNIQUE (machine_id, timestamp)
);

-- ========================================
-- 6. GENERIC CONFIGURATION TABLES
-- ========================================

-- Generic Voltage Configuration (ONE table for ALL manufacturers)
CREATE TABLE public.machine_voltage_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  
  -- Voltage input function mappings (configurable per machine)
  voltage_input_1_function TEXT DEFAULT 'fan',
  voltage_input_2_function TEXT DEFAULT 'pump',
  voltage_input_3_function TEXT DEFAULT 'drain',
  voltage_input_4_function TEXT DEFAULT 'exhaust',
  voltage_input_5_function TEXT DEFAULT 'water',  -- GPIO5
  voltage_input_6_function TEXT DEFAULT 'unused',
  
  -- Voltage threshold for "active" state (default 6V for 12V logic)
  voltage_active_threshold NUMERIC(4,2) DEFAULT 6.0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_machine_voltage_config UNIQUE (machine_id)
);

-- Generic Alert Configuration (ONE table for ALL manufacturers)
CREATE TABLE public.machine_alert_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  
  -- Temperature thresholds (motor OR compressor)
  motor_temp_warning DECIMAL(5,2) DEFAULT 70.0,
  motor_temp_critical DECIMAL(5,2) DEFAULT 85.0,
  
  -- Current thresholds
  motor_amps_warning DECIMAL(6,2) DEFAULT 8.0,
  current_min_alert DECIMAL(6,2) DEFAULT 0.5,   -- For heatpump compressor check
  current_max_alert DECIMAL(6,2) DEFAULT 30.0,  -- For heatpump compressor check
  
  -- Voltage thresholds
  voltage_min DECIMAL(5,2) DEFAULT 200.0,
  voltage_max DECIMAL(5,2) DEFAULT 250.0,
  
  -- Delta T thresholds
  delta_t_min_cooling DECIMAL(5,2) DEFAULT 3.0,  -- For evaporative
  delta_t_min_heating DECIMAL(5,2) DEFAULT 2.0,  -- For heatpump
  delta_t_max_heating DECIMAL(5,2) DEFAULT 15.0, -- For heatpump
  
  -- Setpoint tolerance (for heatpumps)
  setpoint_tolerance DECIMAL(5,2) DEFAULT 5.0,
  
  -- Duration thresholds (minutes)
  duration_motor_temp_critical INTEGER DEFAULT 5,
  duration_fan_failure INTEGER DEFAULT 5,
  duration_water_empty INTEGER DEFAULT 30,
  duration_compressor_failure INTEGER DEFAULT 5,
  
  -- Alert settings
  reminder_interval_hours INTEGER DEFAULT 24,
  send_recovery_emails BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_machine_alert_config UNIQUE (machine_id)
);

-- Notification Preferences (per user per machine)
CREATE TABLE public.machine_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(machine_id, user_id)
);

-- Connection Status (optional - for tracking)
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
-- 7. MANUFACTURER DATA TABLES
-- ========================================
-- These are the ONLY manufacturer-specific tables needed!
-- All config comes from the generic tables above.

-- ----------------------------------------
-- CIRRUS (Evaporative Cooler)
-- ----------------------------------------
CREATE TABLE public.cirrus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Temperatures
  ambient_temp NUMERIC(5,2),    -- Outside/inlet
  duct_temp NUMERIC(5,2),       -- Inside/outlet
  motor_temp NUMERIC(5,2),      -- Fan motor temp
  delta_t NUMERIC(5,2),         -- Temperature difference
  
  -- Electrical
  voltage NUMERIC(6,2),
  current NUMERIC(6,2),
  power NUMERIC(7,2),
  
  -- Voltage pickups (stored for reference)
  fan_voltage NUMERIC(5,2),
  pump_voltage NUMERIC(5,2),
  drain_voltage NUMERIC(5,2),
  exhaust_voltage NUMERIC(5,2),
  
  -- Operational states
  fan_active BOOLEAN DEFAULT false,
  pump_active BOOLEAN DEFAULT false,
  drain_active BOOLEAN DEFAULT false,
  exhaust_active BOOLEAN DEFAULT false,
  is_cooling BOOLEAN DEFAULT false,
  is_on BOOLEAN DEFAULT false,
  is_connected BOOLEAN DEFAULT true,
  has_water BOOLEAN DEFAULT true,
  
  -- Status strings (for frontend display)
  fan_status TEXT DEFAULT 'OFF',
  pump_status TEXT DEFAULT 'OFF',
  drain_status TEXT DEFAULT 'OFF',
  exhaust_status TEXT DEFAULT 'OFF',
  fan_speed INTEGER DEFAULT 0,
  
  -- Calculated status
  overall_status TEXT DEFAULT 'unknown',
  motor_status TEXT DEFAULT 'normal',
  water_status TEXT DEFAULT 'ok',
  cooling_status TEXT DEFAULT 'idle',
  
  -- Compliance flags
  motor_temp_within_parameters BOOLEAN,
  current_within_parameters BOOLEAN,
  voltage_within_parameters BOOLEAN,
  power_within_parameters BOOLEAN,
  water_within_parameters BOOLEAN,
  
  -- Details
  status_details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_cirrus_machine_timestamp UNIQUE (machine_id, timestamp)
);

-- ----------------------------------------
-- COOLBREEZE (Evaporative Cooler)
-- ----------------------------------------
CREATE TABLE public.coolbreeze (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Temperatures
  ambient_temp NUMERIC(5,2),
  duct_temp NUMERIC(5,2),
  motor_temp NUMERIC(5,2),
  delta_t NUMERIC(5,2),
  
  -- Electrical
  voltage NUMERIC(6,2),
  current NUMERIC(6,2),
  power NUMERIC(7,2),
  
  -- Voltage pickups
  fan_voltage NUMERIC(5,2),
  pump_voltage NUMERIC(5,2),
  drain_voltage NUMERIC(5,2),
  exhaust_voltage NUMERIC(5,2),
  
  -- Operational states
  fan_active BOOLEAN DEFAULT false,
  pump_active BOOLEAN DEFAULT false,
  drain_active BOOLEAN DEFAULT false,
  exhaust_active BOOLEAN DEFAULT false,
  is_cooling BOOLEAN DEFAULT false,
  is_on BOOLEAN DEFAULT false,
  is_connected BOOLEAN DEFAULT true,
  has_water BOOLEAN DEFAULT true,
  water_level NUMERIC(5,2) DEFAULT 100.0,
  
  -- Status strings
  fan_status TEXT DEFAULT 'OFF',
  pump_status TEXT DEFAULT 'OFF',
  drain_status TEXT DEFAULT 'OFF',
  exhaust_status TEXT DEFAULT 'OFF',
  fan_speed INTEGER DEFAULT 0,
  
  -- Calculated status
  overall_status TEXT DEFAULT 'unknown',
  motor_status TEXT DEFAULT 'normal',
  water_status TEXT DEFAULT 'ok',
  cooling_status TEXT DEFAULT 'idle',
  
  -- Compliance flags
  motor_temp_within_parameters BOOLEAN,
  current_within_parameters BOOLEAN,
  voltage_within_parameters BOOLEAN,
  power_within_parameters BOOLEAN,
  water_within_parameters BOOLEAN,
  
  -- Details
  status_details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_coolbreeze_machine_timestamp UNIQUE (machine_id, timestamp)
);

-- ----------------------------------------
-- ALLIANCE (Heat Pump)
-- ----------------------------------------
CREATE TABLE public.alliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Temperatures
  ambient_temp NUMERIC(5,2),    -- Inlet/outside
  duct_temp NUMERIC(5,2),       -- Outlet/duct
  motor_temp NUMERIC(5,2),      -- Compressor temp (not fan motor!)
  delta_t NUMERIC(5,2),
  
  -- Electrical
  voltage NUMERIC(6,2),
  current NUMERIC(6,2),
  power NUMERIC(7,2),
  
  -- Voltage pickups (GPIO5 = pump relay for heatpumps)
  voltage_1 NUMERIC(5,2),
  voltage_2 NUMERIC(5,2),
  voltage_3 NUMERIC(5,2),
  voltage_4 NUMERIC(5,2),
  voltage_5 NUMERIC(5,2),  -- GPIO5: Pump relay
  voltage_6 NUMERIC(5,2),
  
  -- Operational states
  fan_active BOOLEAN DEFAULT false,
  pump_active BOOLEAN DEFAULT false,  -- GPIO5 relay status
  drain_active BOOLEAN DEFAULT false,
  exhaust_active BOOLEAN DEFAULT false,
  is_cooling BOOLEAN DEFAULT false,
  is_heating BOOLEAN DEFAULT false,   -- Current > 1A
  is_on BOOLEAN DEFAULT false,
  is_connected BOOLEAN DEFAULT true,
  has_water BOOLEAN DEFAULT true,     -- Repurposed: pump status for heatpumps
  
  -- Calculated status
  overall_status TEXT DEFAULT 'unknown',
  motor_status TEXT DEFAULT 'normal',
  water_status TEXT DEFAULT 'ok',
  cooling_status TEXT DEFAULT 'idle',
  heating_status TEXT DEFAULT 'idle',
  compressor_status TEXT DEFAULT 'good',  -- Heatpump: good/warning/failed
  compressor_issue_first_detected_at TIMESTAMPTZ,
  
  -- Compliance flags
  motor_temp_within_parameters BOOLEAN,
  current_within_parameters BOOLEAN,
  voltage_within_parameters BOOLEAN,
  power_within_parameters BOOLEAN,
  water_within_parameters BOOLEAN,
  setpoint_within_parameters BOOLEAN,
  
  -- Details
  status_details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_alliance_machine_timestamp UNIQUE (machine_id, timestamp)
);

-- ========================================
-- 8. INDEXES
-- ========================================

-- User tables
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);

-- Machines
CREATE INDEX idx_machines_owner_id ON public.machines(owner_id);
CREATE INDEX idx_machines_manufacturer ON public.machines(manufacturer);
CREATE INDEX idx_machines_type ON public.machines(type);

-- API Keys
CREATE INDEX idx_api_keys_machine_id ON public.api_keys(machine_id);
CREATE INDEX idx_api_keys_key ON public.api_keys(key);

-- Readings Raw
CREATE INDEX idx_readings_raw_machine_id ON public.readings_raw(machine_id);
CREATE INDEX idx_readings_raw_timestamp ON public.readings_raw(timestamp DESC);
CREATE INDEX idx_readings_raw_machine_timestamp ON public.readings_raw(machine_id, timestamp DESC);

-- Generic Config
CREATE INDEX idx_machine_voltage_config_machine_id ON public.machine_voltage_config(machine_id);
CREATE INDEX idx_machine_alert_config_machine_id ON public.machine_alert_config(machine_id);
CREATE INDEX idx_notif_prefs_machine_id ON public.machine_notification_preferences(machine_id);
CREATE INDEX idx_notif_prefs_user_id ON public.machine_notification_preferences(user_id);
CREATE INDEX idx_connection_status_machine_id ON public.machine_connection_status(machine_id);

-- Cirrus
CREATE INDEX idx_cirrus_machine_id ON public.cirrus(machine_id);
CREATE INDEX idx_cirrus_timestamp ON public.cirrus(timestamp DESC);
CREATE INDEX idx_cirrus_machine_timestamp ON public.cirrus(machine_id, timestamp DESC);

-- CoolBreeze
CREATE INDEX idx_coolbreeze_machine_id ON public.coolbreeze(machine_id);
CREATE INDEX idx_coolbreeze_timestamp ON public.coolbreeze(timestamp DESC);
CREATE INDEX idx_coolbreeze_machine_timestamp ON public.coolbreeze(machine_id, timestamp DESC);

-- Alliance
CREATE INDEX idx_alliance_machine_id ON public.alliance(machine_id);
CREATE INDEX idx_alliance_timestamp ON public.alliance(timestamp DESC);
CREATE INDEX idx_alliance_machine_timestamp ON public.alliance(machine_id, timestamp DESC);

-- ========================================
-- 9. ROW LEVEL SECURITY
-- ========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installer_company_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_admin_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.readings_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_voltage_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_alert_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_connection_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cirrus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coolbreeze ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alliance ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 10. HELPER FUNCTIONS
-- ========================================

-- Check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Get user's admin (for clients)
CREATE OR REPLACE FUNCTION public.get_user_admin(_user_id UUID)
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT admin_id FROM public.client_admin_assignments WHERE client_id = _user_id LIMIT 1
$$;

-- Auto-update updated_at
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
-- 11. UPDATED_AT TRIGGERS
-- ========================================

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_machines_updated_at BEFORE UPDATE ON public.machines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_machine_voltage_config_updated_at BEFORE UPDATE ON public.machine_voltage_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_machine_alert_config_updated_at BEFORE UPDATE ON public.machine_alert_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notif_prefs_updated_at BEFORE UPDATE ON public.machine_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_connection_status_updated_at BEFORE UPDATE ON public.machine_connection_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cirrus_updated_at BEFORE UPDATE ON public.cirrus
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coolbreeze_updated_at BEFORE UPDATE ON public.coolbreeze
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_alliance_updated_at BEFORE UPDATE ON public.alliance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- 12. RLS POLICIES
-- ========================================

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Service role full access profiles" ON public.profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- User Roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Super admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Service role full access user_roles" ON public.user_roles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Machines
CREATE POLICY "Users can view own machines" ON public.machines FOR SELECT
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users can insert own machines" ON public.machines FOR INSERT
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users can update own machines" ON public.machines FOR UPDATE
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users can delete own machines" ON public.machines FOR DELETE
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Service role full access machines" ON public.machines FOR ALL TO service_role USING (true) WITH CHECK (true);

-- API Keys
CREATE POLICY "Users can view own api keys" ON public.api_keys FOR SELECT
  USING (machine_id IN (SELECT id FROM public.machines WHERE owner_id = auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users can manage own api keys" ON public.api_keys FOR ALL
  USING (machine_id IN (SELECT id FROM public.machines WHERE owner_id = auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Service role full access api_keys" ON public.api_keys FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Readings Raw
CREATE POLICY "Users can view own readings" ON public.readings_raw FOR SELECT
  USING (machine_id IN (SELECT id FROM public.machines WHERE owner_id = auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Service role full access readings_raw" ON public.readings_raw FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Machine Voltage Config
CREATE POLICY "Users can view own voltage config" ON public.machine_voltage_config FOR SELECT
  USING (machine_id IN (SELECT id FROM public.machines WHERE owner_id = auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users can manage own voltage config" ON public.machine_voltage_config FOR ALL
  USING (machine_id IN (SELECT id FROM public.machines WHERE owner_id = auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Service role full access machine_voltage_config" ON public.machine_voltage_config FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Machine Alert Config
CREATE POLICY "Users can view own alert config" ON public.machine_alert_config FOR SELECT
  USING (machine_id IN (SELECT id FROM public.machines WHERE owner_id = auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users can manage own alert config" ON public.machine_alert_config FOR ALL
  USING (machine_id IN (SELECT id FROM public.machines WHERE owner_id = auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Service role full access machine_alert_config" ON public.machine_alert_config FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Notification Preferences
CREATE POLICY "Users can view own notif prefs" ON public.machine_notification_preferences FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users can manage own notif prefs" ON public.machine_notification_preferences FOR ALL
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Service role full access notif_prefs" ON public.machine_notification_preferences FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Connection Status
CREATE POLICY "Users can view own connection status" ON public.machine_connection_status FOR SELECT
  USING (machine_id IN (SELECT id FROM public.machines WHERE owner_id = auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Service role full access connection_status" ON public.machine_connection_status FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Cirrus Data
CREATE POLICY "Users can view own cirrus data" ON public.cirrus FOR SELECT
  USING (machine_id IN (SELECT id FROM public.machines WHERE owner_id = auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Service role full access cirrus" ON public.cirrus FOR ALL TO service_role USING (true) WITH CHECK (true);

-- CoolBreeze Data
CREATE POLICY "Users can view own coolbreeze data" ON public.coolbreeze FOR SELECT
  USING (machine_id IN (SELECT id FROM public.machines WHERE owner_id = auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Service role full access coolbreeze" ON public.coolbreeze FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Alliance Data
CREATE POLICY "Users can view own alliance data" ON public.alliance FOR SELECT
  USING (machine_id IN (SELECT id FROM public.machines WHERE owner_id = auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Service role full access alliance" ON public.alliance FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ========================================
-- 13. GRANTS
-- ========================================

GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;

-- User tables
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO service_role;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- Machine tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.machines TO authenticated;
GRANT ALL ON public.machines TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;

-- Config tables
GRANT SELECT ON public.readings_raw TO authenticated;
GRANT ALL ON public.readings_raw TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.machine_voltage_config TO authenticated;
GRANT ALL ON public.machine_voltage_config TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.machine_alert_config TO authenticated;
GRANT ALL ON public.machine_alert_config TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.machine_notification_preferences TO authenticated;
GRANT ALL ON public.machine_notification_preferences TO service_role;
GRANT SELECT ON public.machine_connection_status TO authenticated;
GRANT ALL ON public.machine_connection_status TO service_role;

-- Manufacturer data tables (read-only for users, full for service)
GRANT SELECT ON public.cirrus TO authenticated;
GRANT ALL ON public.cirrus TO service_role;
GRANT SELECT ON public.coolbreeze TO authenticated;
GRANT ALL ON public.coolbreeze TO service_role;
GRANT SELECT ON public.alliance TO authenticated;
GRANT ALL ON public.alliance TO service_role;

-- Function permissions
GRANT EXECUTE ON FUNCTION public.has_role TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_admin TO authenticated, service_role;

-- ========================================
-- 14. COMMENTS
-- ========================================

COMMENT ON TABLE public.machines IS 'Machine registry - shared by all manufacturers';
COMMENT ON TABLE public.readings_raw IS 'Universal raw data table - ALL ESP32 data enters here';
COMMENT ON TABLE public.machine_voltage_config IS 'Generic voltage config - ONE table for ALL manufacturers';
COMMENT ON TABLE public.machine_alert_config IS 'Generic alert config - ONE table for ALL manufacturers';
COMMENT ON TABLE public.cirrus IS 'Processed data for Cirrus evaporative coolers';
COMMENT ON TABLE public.coolbreeze IS 'Processed data for CoolBreeze evaporative coolers';
COMMENT ON TABLE public.alliance IS 'Processed data for Alliance heat pumps';

-- ========================================
-- SCHEMA COMPLETE
-- ========================================
-- 
-- ARCHITECTURE SUMMARY:
-- 
-- Generic Tables (ALL manufacturers use these):
-- ✅ readings_raw - All ESP32 data enters here
-- ✅ machines - Machine registry
-- ✅ api_keys - ESP32 authentication
-- ✅ machine_voltage_config - Voltage mappings (ONE table for all)
-- ✅ machine_alert_config - Alert thresholds (ONE table for all)
-- 
-- Per Manufacturer (ONLY the data table):
-- ✅ cirrus
-- ✅ coolbreeze
-- ✅ alliance
-- 
-- To add NEW manufacturer:
-- 1. CREATE TABLE newbrand (...)
-- 2. CREATE FUNCTION process_newbrand_reading()
-- 3. CREATE TRIGGER
-- That's it!
-- ========================================
