-- ========================================
-- CREATE ALLIANCE TABLES
-- ========================================
-- Purpose: Create Alliance manufacturer tables for heat pump machines
-- Date: 2025-11-25
-- Usage: Run this in Supabase SQL Editor to create Alliance tables
-- ========================================

-- Alliance Raw Readings (2 weeks retention)
CREATE TABLE IF NOT EXISTS public.alliance_raw (
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
  
  -- Raw water status (if applicable)
  has_water BOOLEAN,
  
  -- Metadata
  sensor_read_count INTEGER DEFAULT 1,
  api_key_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_alliance_raw_machine_timestamp UNIQUE (machine_id, timestamp)
);

-- Alliance Calculated Data (1 year retention)
-- Note: Using 'alliance' as table name to match frontend expectations (similar to 'cirrus' and 'coolbreeze')
CREATE TABLE IF NOT EXISTS public.alliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Processed temperatures
  ambient_temp NUMERIC(5,2),
  duct_temp NUMERIC(5,2),
  motor_temp NUMERIC(5,2),
  delta_t NUMERIC(5,2),
  
  -- Main electrical (from CT)
  voltage NUMERIC(6,2),  -- Line voltage
  current NUMERIC(6,2),
  power NUMERIC(7,2),
  
  -- Pickup voltages (mapped from voltage_inputs via voltage_config)
  voltage_1 NUMERIC(5,2), -- Custom_1
  voltage_2 NUMERIC(5,2), -- Custom_2
  voltage_3 NUMERIC(5,2), -- Custom_3
  voltage_4 NUMERIC(5,2), -- Custom_4
  voltage_5 NUMERIC(5,2), -- Custom_5
  voltage_6 NUMERIC(5,2), -- Custom_6
  
  -- Operational states (calculated from pickup voltages)
  fan_active BOOLEAN NOT NULL DEFAULT false,
  pump_active BOOLEAN NOT NULL DEFAULT false,
  drain_active BOOLEAN NOT NULL DEFAULT false,
  exhaust_active BOOLEAN NOT NULL DEFAULT false,
  is_cooling BOOLEAN NOT NULL DEFAULT false,
  is_heating BOOLEAN NOT NULL DEFAULT false, -- New for heat pumps
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
  heating_status TEXT NOT NULL DEFAULT 'idle' -- New for heat pumps
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
  
  CONSTRAINT unique_alliance_machine_timestamp UNIQUE (machine_id, timestamp)
);

-- Alliance Notifications Configuration
CREATE TABLE IF NOT EXISTS public.alliance_notifications (
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
CREATE TABLE IF NOT EXISTS public.alliance_voltage_config (
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
-- INDEXES
-- ========================================

-- Alliance Raw
CREATE INDEX IF NOT EXISTS idx_alliance_raw_machine_id ON public.alliance_raw(machine_id);
CREATE INDEX IF NOT EXISTS idx_alliance_raw_timestamp ON public.alliance_raw(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alliance_raw_machine_timestamp ON public.alliance_raw(machine_id, timestamp DESC);

-- Alliance Calculated
CREATE INDEX IF NOT EXISTS idx_alliance_machine_id ON public.alliance(machine_id);
CREATE INDEX IF NOT EXISTS idx_alliance_timestamp ON public.alliance(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alliance_machine_timestamp ON public.alliance(machine_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alliance_status ON public.alliance(overall_status);

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

ALTER TABLE public.alliance_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alliance_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alliance_voltage_config ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (similar to cirrus/coolbreeze)
-- Users can view data for machines they own or have access to
CREATE POLICY "Users can view alliance_raw for their machines"
  ON public.alliance_raw FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.machines
      WHERE machines.id = alliance_raw.machine_id
      AND machines.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Users can view alliance for their machines"
  ON public.alliance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.machines
      WHERE machines.id = alliance.machine_id
      AND machines.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Users can view alliance_notifications for their machines"
  ON public.alliance_notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.machines
      WHERE machines.id = alliance_notifications.machine_id
      AND machines.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Users can view alliance_voltage_config for their machines"
  ON public.alliance_voltage_config FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.machines
      WHERE machines.id = alliance_voltage_config.machine_id
      AND machines.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- Allow service role to insert/update (for ESP32 API)
CREATE POLICY "Service role can insert alliance_raw"
  ON public.alliance_raw FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can insert alliance"
  ON public.alliance FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update alliance"
  ON public.alliance FOR UPDATE
  USING (true);

-- ========================================
-- TRIGGERS
-- ========================================

-- Auto-update updated_at on alliance tables
CREATE TRIGGER update_alliance_updated_at
  BEFORE UPDATE ON public.alliance
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
-- COMMENTS
-- ========================================

COMMENT ON TABLE public.alliance_raw IS 'Raw sensor readings for Alliance machines (2 weeks retention)';
COMMENT ON TABLE public.alliance IS 'Processed/calculated data for Alliance machines (1 year retention)';
COMMENT ON TABLE public.alliance_notifications IS 'Notification thresholds and settings for Alliance machines';
COMMENT ON TABLE public.alliance_voltage_config IS 'Voltage input mappings for Alliance machines (maps voltage_input_1-6 to Custom_1-6)';

-- ========================================
-- END
-- ========================================
-- Note: Processing trigger (alliance_raw → alliance) can be added later
-- when you're ready to process raw readings automatically.
-- ========================================

