-- ========================================
-- SIMPLIFIED DATABASE SCHEMA
-- ========================================
-- Purpose: Complete database schema with simplified architecture
-- Date: 2025-02-03
-- 
-- ARCHITECTURE:
-- - Generic config tables for ALL manufacturers
-- - One data table per manufacturer (cirrus, coolbreeze, alliance)
-- - Universal readings_raw for all ESP32 data
-- 
-- ADDING A NEW MANUFACTURER:
-- 1. Create data table: CREATE TABLE newbrand (...)
-- 2. Create processing function: process_newbrand_reading()
-- 3. Create trigger: trigger_process_newbrand_reading
-- That's it! No extra config tables needed.
-- ========================================

-- ========================================
-- 1. ENUMS
-- ========================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('super_admin', 'company', 'installer', 'client');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ========================================
-- 2. USER MANAGEMENT TABLES
-- ========================================

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  cell_number TEXT,
  country TEXT,
  state TEXT,
  city TEXT,
  street TEXT,
  suburb TEXT,
  po_box TEXT,
  full_name_business TEXT,
  email_subscribed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Installer-company assignments
CREATE TABLE IF NOT EXISTS public.installer_company_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Client-admin assignments
CREATE TABLE IF NOT EXISTS public.client_admin_assignments (
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

CREATE TABLE IF NOT EXISTS public.machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('evaporative', 'heatpump', 'airconditioner')),
  manufacturer TEXT, -- e.g., 'Cirrus', 'CoolBreeze', 'Alliance'
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location TEXT,
  api_key TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  api_endpoint TEXT,
  temperature_setpoint NUMERIC CHECK (temperature_setpoint IS NULL OR (temperature_setpoint >= 0 AND temperature_setpoint <= 75)),
  
  -- Legacy status fields (kept for backwards compatibility)
  is_on BOOLEAN DEFAULT false,
  is_connected BOOLEAN DEFAULT false,
  has_water BOOLEAN DEFAULT true,
  is_cooling BOOLEAN DEFAULT false,
  fan_active BOOLEAN DEFAULT false,
  has_heat BOOLEAN DEFAULT false,
  has_pump BOOLEAN DEFAULT false,
  motor_temp NUMERIC(5,2) DEFAULT 0,
  outside_temp NUMERIC(5,2) DEFAULT 0,
  inside_temp NUMERIC(5,2) DEFAULT 0,
  delta_t NUMERIC(5,2) DEFAULT 0,
  current NUMERIC(6,2) DEFAULT 0,
  voltage NUMERIC(6,2) DEFAULT 0,
  power NUMERIC(7,2) DEFAULT 0,
  overall_status TEXT DEFAULT 'unknown',
  motor_status TEXT DEFAULT 'normal',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================
-- 4. API KEYS (Shared)
-- ========================================

CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  machine_id UUID REFERENCES public.machines(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true NOT NULL,
  description TEXT
);

-- ========================================
-- 5. UNIVERSAL READINGS_RAW TABLE
-- ========================================
-- ALL ESP32 devices send data here
-- Triggers route data to manufacturer-specific tables

CREATE TABLE IF NOT EXISTS public.readings_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  -- Temperature readings
  motor_temp NUMERIC(5,2),
  inside_temp NUMERIC(5,2),
  outside_temp NUMERIC(5,2),
  
  -- Electrical readings
  current NUMERIC(6,2),
  voltage NUMERIC(6,2),
  power NUMERIC(7,2),
  
  -- Voltage pickups (6 configurable inputs)
  voltage_input_1 NUMERIC(5,2),
  voltage_input_2 NUMERIC(5,2),
  voltage_input_3 NUMERIC(5,2),
  voltage_input_4 NUMERIC(5,2),
  voltage_input_5 NUMERIC(5,2),  -- GPIO5 - Float switch / Pump relay
  voltage_input_6 NUMERIC(5,2),
  
  -- Water status
  has_water BOOLEAN,
  
  -- Metadata
  sensor_read_count INTEGER DEFAULT 1,
  api_key_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_readings_raw_machine_id ON public.readings_raw(machine_id);
CREATE INDEX IF NOT EXISTS idx_readings_raw_timestamp ON public.readings_raw(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_readings_raw_machine_timestamp ON public.readings_raw(machine_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_readings_raw_created_at ON public.readings_raw(created_at DESC);

COMMENT ON TABLE public.readings_raw IS 
  'Universal raw data table for ALL ESP32 devices. Triggers route to manufacturer tables.';

-- ========================================
-- 6. GENERIC VOLTAGE CONFIG (ALL Manufacturers)
-- ========================================

CREATE TABLE IF NOT EXISTS public.machine_voltage_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  
  -- Voltage input function mappings
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

CREATE INDEX IF NOT EXISTS idx_machine_voltage_config_machine_id 
ON public.machine_voltage_config(machine_id);

COMMENT ON TABLE public.machine_voltage_config IS 
  'Generic voltage configuration for ALL manufacturers. One row per machine.';

-- ========================================
-- 7. GENERIC ALERT CONFIG (ALL Manufacturers)
-- ========================================

CREATE TABLE IF NOT EXISTS public.machine_alert_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  
  -- Temperature thresholds
  motor_temp_warning DECIMAL(5,2) DEFAULT 70.0,
  motor_temp_critical DECIMAL(5,2) DEFAULT 85.0,
  
  -- Current thresholds
  motor_amps_warning DECIMAL(6,2) DEFAULT 8.0,
  current_min_alert DECIMAL(6,2) DEFAULT 0.5,
  current_max_alert DECIMAL(6,2) DEFAULT 30.0,
  
  -- Voltage thresholds
  voltage_min DECIMAL(5,2) DEFAULT 200.0,
  voltage_max DECIMAL(5,2) DEFAULT 250.0,
  
  -- Delta T thresholds
  delta_t_min_cooling DECIMAL(5,2) DEFAULT 3.0,
  delta_t_min_heating DECIMAL(5,2) DEFAULT 2.0,
  delta_t_max_heating DECIMAL(5,2) DEFAULT 15.0,
  
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

CREATE INDEX IF NOT EXISTS idx_machine_alert_config_machine_id 
ON public.machine_alert_config(machine_id);

COMMENT ON TABLE public.machine_alert_config IS 
  'Generic alert configuration for ALL manufacturers. One row per machine.';

-- ========================================
-- 8. NOTIFICATION PREFERENCES (Per User-Machine)
-- ========================================

CREATE TABLE IF NOT EXISTS public.machine_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(machine_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_notif_prefs_machine_id ON public.machine_notification_preferences(machine_id);
CREATE INDEX IF NOT EXISTS idx_notif_prefs_user_id ON public.machine_notification_preferences(user_id);

-- ========================================
-- 9. CIRRUS DATA TABLE (Manufacturer-Specific)
-- ========================================

CREATE TABLE IF NOT EXISTS public.cirrus (
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
  
  -- Voltage pickups (mapped)
  fan_voltage NUMERIC(5,2),
  pump_voltage NUMERIC(5,2),
  drain_voltage NUMERIC(5,2),
  exhaust_voltage NUMERIC(5,2),
  
  -- States
  fan_active BOOLEAN DEFAULT false,
  pump_active BOOLEAN DEFAULT false,
  drain_active BOOLEAN DEFAULT false,
  exhaust_active BOOLEAN DEFAULT false,
  is_cooling BOOLEAN DEFAULT false,
  is_on BOOLEAN DEFAULT false,
  is_connected BOOLEAN DEFAULT true,
  has_water BOOLEAN DEFAULT true,
  
  -- Status
  fan_status TEXT DEFAULT 'OFF',
  pump_status TEXT DEFAULT 'OFF',
  drain_status TEXT DEFAULT 'OFF',
  exhaust_status TEXT DEFAULT 'OFF',
  fan_speed INTEGER DEFAULT 0,
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
  
  status_details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_cirrus_machine_timestamp UNIQUE (machine_id, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_cirrus_machine_id ON public.cirrus(machine_id);
CREATE INDEX IF NOT EXISTS idx_cirrus_timestamp ON public.cirrus(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_cirrus_machine_timestamp ON public.cirrus(machine_id, timestamp DESC);

COMMENT ON TABLE public.cirrus IS 'Processed data for Cirrus evaporative coolers';

-- ========================================
-- 10. COOLBREEZE DATA TABLE (Manufacturer-Specific)
-- ========================================

CREATE TABLE IF NOT EXISTS public.coolbreeze (
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
  
  -- Voltage pickups (mapped)
  fan_voltage NUMERIC(5,2),
  pump_voltage NUMERIC(5,2),
  drain_voltage NUMERIC(5,2),
  exhaust_voltage NUMERIC(5,2),
  
  -- States
  fan_active BOOLEAN DEFAULT false,
  pump_active BOOLEAN DEFAULT false,
  drain_active BOOLEAN DEFAULT false,
  exhaust_active BOOLEAN DEFAULT false,
  is_cooling BOOLEAN DEFAULT false,
  is_on BOOLEAN DEFAULT false,
  is_connected BOOLEAN DEFAULT true,
  has_water BOOLEAN DEFAULT true,
  water_level NUMERIC(5,2) DEFAULT 100.0,
  
  -- Status
  fan_status TEXT DEFAULT 'OFF',
  pump_status TEXT DEFAULT 'OFF',
  drain_status TEXT DEFAULT 'OFF',
  exhaust_status TEXT DEFAULT 'OFF',
  fan_speed INTEGER DEFAULT 0,
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
  
  status_details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_coolbreeze_machine_timestamp UNIQUE (machine_id, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_coolbreeze_machine_id ON public.coolbreeze(machine_id);
CREATE INDEX IF NOT EXISTS idx_coolbreeze_timestamp ON public.coolbreeze(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_coolbreeze_machine_timestamp ON public.coolbreeze(machine_id, timestamp DESC);

COMMENT ON TABLE public.coolbreeze IS 'Processed data for CoolBreeze evaporative coolers';

-- ========================================
-- 11. ALLIANCE DATA TABLE (Manufacturer-Specific)
-- ========================================

CREATE TABLE IF NOT EXISTS public.alliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Temperatures
  ambient_temp NUMERIC(5,2),
  duct_temp NUMERIC(5,2),
  motor_temp NUMERIC(5,2),  -- Compressor temp for heatpumps
  delta_t NUMERIC(5,2),
  
  -- Electrical
  voltage NUMERIC(6,2),
  current NUMERIC(6,2),
  power NUMERIC(7,2),
  
  -- Voltage pickups
  voltage_1 NUMERIC(5,2),
  voltage_2 NUMERIC(5,2),
  voltage_3 NUMERIC(5,2),
  voltage_4 NUMERIC(5,2),
  voltage_5 NUMERIC(5,2),  -- GPIO5 - Pump relay
  voltage_6 NUMERIC(5,2),
  
  -- States
  fan_active BOOLEAN DEFAULT false,
  pump_active BOOLEAN DEFAULT false,  -- GPIO5 relay for heatpumps
  drain_active BOOLEAN DEFAULT false,
  exhaust_active BOOLEAN DEFAULT false,
  is_cooling BOOLEAN DEFAULT false,
  is_heating BOOLEAN DEFAULT false,   -- Current > 1A for heatpumps
  is_on BOOLEAN DEFAULT false,
  is_connected BOOLEAN DEFAULT true,
  has_water BOOLEAN DEFAULT true,     -- Repurposed as pump status
  
  -- Status
  overall_status TEXT DEFAULT 'unknown',
  motor_status TEXT DEFAULT 'normal',
  water_status TEXT DEFAULT 'ok',
  cooling_status TEXT DEFAULT 'idle',
  heating_status TEXT DEFAULT 'idle',
  compressor_status TEXT DEFAULT 'good',  -- Heatpump specific
  compressor_issue_first_detected_at TIMESTAMPTZ,
  
  -- Compliance flags
  motor_temp_within_parameters BOOLEAN,
  current_within_parameters BOOLEAN,
  voltage_within_parameters BOOLEAN,
  power_within_parameters BOOLEAN,
  water_within_parameters BOOLEAN,
  setpoint_within_parameters BOOLEAN,
  
  status_details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_alliance_machine_timestamp UNIQUE (machine_id, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_alliance_machine_id ON public.alliance(machine_id);
CREATE INDEX IF NOT EXISTS idx_alliance_timestamp ON public.alliance(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alliance_machine_timestamp ON public.alliance(machine_id, timestamp DESC);

COMMENT ON TABLE public.alliance IS 'Processed data for Alliance heatpumps';

-- ========================================
-- 12. INDEXES FOR OTHER TABLES
-- ========================================

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_machines_owner_id ON public.machines(owner_id);
CREATE INDEX IF NOT EXISTS idx_machines_manufacturer ON public.machines(manufacturer);
CREATE INDEX IF NOT EXISTS idx_machines_type ON public.machines(type);
CREATE INDEX IF NOT EXISTS idx_api_keys_machine_id ON public.api_keys(machine_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON public.api_keys(key);

-- ========================================
-- 13. ENABLE ROW LEVEL SECURITY
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
ALTER TABLE public.cirrus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coolbreeze ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alliance ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 14. HELPER FUNCTIONS
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
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
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
-- 15. TRIGGERS FOR updated_at
-- ========================================

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_machines_updated_at ON public.machines;
CREATE TRIGGER update_machines_updated_at
  BEFORE UPDATE ON public.machines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_machine_voltage_config_updated_at ON public.machine_voltage_config;
CREATE TRIGGER update_machine_voltage_config_updated_at
  BEFORE UPDATE ON public.machine_voltage_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_machine_alert_config_updated_at ON public.machine_alert_config;
CREATE TRIGGER update_machine_alert_config_updated_at
  BEFORE UPDATE ON public.machine_alert_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_cirrus_updated_at ON public.cirrus;
CREATE TRIGGER update_cirrus_updated_at
  BEFORE UPDATE ON public.cirrus
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_coolbreeze_updated_at ON public.coolbreeze;
CREATE TRIGGER update_coolbreeze_updated_at
  BEFORE UPDATE ON public.coolbreeze
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_alliance_updated_at ON public.alliance;
CREATE TRIGGER update_alliance_updated_at
  BEFORE UPDATE ON public.alliance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- 16. RLS POLICIES
-- ========================================

-- PROFILES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

DROP POLICY IF EXISTS "Service role full access profiles" ON public.profiles;
CREATE POLICY "Service role full access profiles" ON public.profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- MACHINES
DROP POLICY IF EXISTS "Users can view own machines" ON public.machines;
CREATE POLICY "Users can view own machines" ON public.machines
  FOR SELECT USING (
    owner_id = auth.uid() 
    OR public.has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "Users can insert own machines" ON public.machines;
CREATE POLICY "Users can insert own machines" ON public.machines
  FOR INSERT WITH CHECK (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "Users can update own machines" ON public.machines;
CREATE POLICY "Users can update own machines" ON public.machines
  FOR UPDATE USING (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "Users can delete own machines" ON public.machines;
CREATE POLICY "Users can delete own machines" ON public.machines
  FOR DELETE USING (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "Service role full access machines" ON public.machines;
CREATE POLICY "Service role full access machines" ON public.machines
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- API KEYS
DROP POLICY IF EXISTS "Users can view own api keys" ON public.api_keys;
CREATE POLICY "Users can view own api keys" ON public.api_keys
  FOR SELECT USING (
    machine_id IN (SELECT id FROM public.machines WHERE owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "Users can manage own api keys" ON public.api_keys;
CREATE POLICY "Users can manage own api keys" ON public.api_keys
  FOR ALL USING (
    machine_id IN (SELECT id FROM public.machines WHERE owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "Service role full access api_keys" ON public.api_keys;
CREATE POLICY "Service role full access api_keys" ON public.api_keys
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- READINGS_RAW
DROP POLICY IF EXISTS "Users can view own readings" ON public.readings_raw;
CREATE POLICY "Users can view own readings" ON public.readings_raw
  FOR SELECT USING (
    machine_id IN (SELECT id FROM public.machines WHERE owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "Service role full access readings_raw" ON public.readings_raw;
CREATE POLICY "Service role full access readings_raw" ON public.readings_raw
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- MACHINE_VOLTAGE_CONFIG
DROP POLICY IF EXISTS "Users can view own voltage config" ON public.machine_voltage_config;
CREATE POLICY "Users can view own voltage config" ON public.machine_voltage_config
  FOR SELECT USING (
    machine_id IN (SELECT id FROM public.machines WHERE owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "Users can manage own voltage config" ON public.machine_voltage_config;
CREATE POLICY "Users can manage own voltage config" ON public.machine_voltage_config
  FOR ALL USING (
    machine_id IN (SELECT id FROM public.machines WHERE owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "Service role full access voltage config" ON public.machine_voltage_config;
CREATE POLICY "Service role full access voltage config" ON public.machine_voltage_config
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- MACHINE_ALERT_CONFIG
DROP POLICY IF EXISTS "Users can view own alert config" ON public.machine_alert_config;
CREATE POLICY "Users can view own alert config" ON public.machine_alert_config
  FOR SELECT USING (
    machine_id IN (SELECT id FROM public.machines WHERE owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "Users can manage own alert config" ON public.machine_alert_config;
CREATE POLICY "Users can manage own alert config" ON public.machine_alert_config
  FOR ALL USING (
    machine_id IN (SELECT id FROM public.machines WHERE owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "Service role full access alert config" ON public.machine_alert_config;
CREATE POLICY "Service role full access alert config" ON public.machine_alert_config
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- CIRRUS
DROP POLICY IF EXISTS "Users can view own cirrus data" ON public.cirrus;
CREATE POLICY "Users can view own cirrus data" ON public.cirrus
  FOR SELECT USING (
    machine_id IN (SELECT id FROM public.machines WHERE owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "Service role full access cirrus" ON public.cirrus;
CREATE POLICY "Service role full access cirrus" ON public.cirrus
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- COOLBREEZE
DROP POLICY IF EXISTS "Users can view own coolbreeze data" ON public.coolbreeze;
CREATE POLICY "Users can view own coolbreeze data" ON public.coolbreeze
  FOR SELECT USING (
    machine_id IN (SELECT id FROM public.machines WHERE owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "Service role full access coolbreeze" ON public.coolbreeze;
CREATE POLICY "Service role full access coolbreeze" ON public.coolbreeze
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ALLIANCE
DROP POLICY IF EXISTS "Users can view own alliance data" ON public.alliance;
CREATE POLICY "Users can view own alliance data" ON public.alliance
  FOR SELECT USING (
    machine_id IN (SELECT id FROM public.machines WHERE owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "Service role full access alliance" ON public.alliance;
CREATE POLICY "Service role full access alliance" ON public.alliance
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- USER_ROLES
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Service role full access user_roles" ON public.user_roles;
CREATE POLICY "Service role full access user_roles" ON public.user_roles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- NOTIFICATION PREFERENCES
DROP POLICY IF EXISTS "Users can view own notification prefs" ON public.machine_notification_preferences;
CREATE POLICY "Users can view own notification prefs" ON public.machine_notification_preferences
  FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Users can manage own notification prefs" ON public.machine_notification_preferences;
CREATE POLICY "Users can manage own notification prefs" ON public.machine_notification_preferences
  FOR ALL USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Service role full access notification prefs" ON public.machine_notification_preferences;
CREATE POLICY "Service role full access notification prefs" ON public.machine_notification_preferences
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ========================================
-- 17. GRANTS
-- ========================================

GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;

-- Tables
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.machines TO authenticated;
GRANT ALL ON public.machines TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;

GRANT SELECT ON public.readings_raw TO authenticated;
GRANT ALL ON public.readings_raw TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.machine_voltage_config TO authenticated;
GRANT ALL ON public.machine_voltage_config TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.machine_alert_config TO authenticated;
GRANT ALL ON public.machine_alert_config TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.machine_notification_preferences TO authenticated;
GRANT ALL ON public.machine_notification_preferences TO service_role;

GRANT SELECT ON public.cirrus TO authenticated;
GRANT ALL ON public.cirrus TO service_role;

GRANT SELECT ON public.coolbreeze TO authenticated;
GRANT ALL ON public.coolbreeze TO service_role;

GRANT SELECT ON public.alliance TO authenticated;
GRANT ALL ON public.alliance TO service_role;

-- Functions
GRANT EXECUTE ON FUNCTION public.has_role TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column TO authenticated, service_role;

-- ========================================
-- END OF SCHEMA
-- ========================================
-- 
-- SUMMARY:
-- 
-- Generic Tables (ALL manufacturers):
-- ✅ readings_raw - Universal ESP32 data input
-- ✅ machine_voltage_config - One config for all
-- ✅ machine_alert_config - One config for all
-- 
-- Per Manufacturer (ONLY the data table):
-- ✅ cirrus - Cirrus evaporative data
-- ✅ coolbreeze - CoolBreeze evaporative data
-- ✅ alliance - Alliance heatpump data
-- 
-- To add a new manufacturer:
-- 1. Create table: CREATE TABLE newbrand (...)
-- 2. Create function: process_newbrand_reading()
-- 3. Create trigger: trigger_process_newbrand_reading
-- ========================================

