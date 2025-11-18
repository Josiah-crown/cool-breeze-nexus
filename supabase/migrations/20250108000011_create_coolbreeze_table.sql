-- CoolBreeze HVAC Processing Table
-- Stores processed status and historical data for CoolBreeze HVAC machines
-- Automatically populated from readings_raw via database trigger

CREATE TABLE IF NOT EXISTS public.coolbreeze (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Temperature Readings
  ambient_temp NUMERIC(5,2),           -- Outside/ambient temperature
  duct_temp NUMERIC(5,2),              -- Inside/duct temperature
  motor_temp NUMERIC(5,2),             -- Motor/compressor temperature
  
  -- Calculated Values
  delta_t NUMERIC(5,2),                -- Temperature difference (ambient - duct)
  
  -- Operational States
  fan_active BOOLEAN NOT NULL DEFAULT false,
  pump_active BOOLEAN NOT NULL DEFAULT false,
  drain_active BOOLEAN NOT NULL DEFAULT false,
  exhaust_active BOOLEAN NOT NULL DEFAULT false,
  is_cooling BOOLEAN NOT NULL DEFAULT false,
  is_on BOOLEAN NOT NULL DEFAULT false,
  is_connected BOOLEAN NOT NULL DEFAULT true, -- Connection status (calculated: last reading within 10 min)
  
  -- Water Status
  has_water BOOLEAN NOT NULL DEFAULT true,
  water_level NUMERIC(5,2),
  
  -- Electrical Readings
  voltage NUMERIC(6,2),                -- Line voltage (typically 230V)
  current NUMERIC(6,2),                 -- Current (Amps)
  power NUMERIC(7,2),                   -- Power (Watts)
  
  -- Pickup Voltages (from inverted/higher voltage pickups)
  exhaust_voltage NUMERIC(5,2),        -- Yellow wire voltage
  fan_voltage NUMERIC(5,2),            -- Green wire voltage (also used for fan speed)
  pump_voltage NUMERIC(5,2),           -- Brown wire voltage
  drain_voltage NUMERIC(5,2),          -- Black wire voltage
  
  -- Pickup Statuses
  exhaust_status TEXT CHECK (exhaust_status IN ('ON', 'OFF', 'DISCONNECTED', 'UNKNOWN')),
  fan_status TEXT CHECK (fan_status IN ('ON', 'OFF', 'DISCONNECTED', 'UNKNOWN')),
  pump_status TEXT CHECK (pump_status IN ('ON', 'OFF', 'DISCONNECTED', 'UNKNOWN')),
  drain_status TEXT CHECK (drain_status IN ('ON', 'OFF', 'DISCONNECTED', 'UNKNOWN')),
  
  -- Fan Speed (calculated from fan_voltage)
  fan_speed INTEGER,                   -- Fan speed percentage (0-100)
  
  -- Status Indicators
  overall_status TEXT NOT NULL DEFAULT 'unknown' CHECK (overall_status IN ('operational', 'warning', 'error', 'offline', 'unknown')),
  motor_status TEXT NOT NULL DEFAULT 'normal' CHECK (motor_status IN ('normal', 'warning', 'critical')),
  water_status TEXT NOT NULL DEFAULT 'ok' CHECK (water_status IN ('ok', 'low', 'empty')),
  cooling_status TEXT NOT NULL DEFAULT 'idle' CHECK (cooling_status IN ('idle', 'active', 'inefficient')),
  
  -- Parameter Compliance Flags
  motor_temp_within_parameters BOOLEAN,
  current_within_parameters BOOLEAN,
  voltage_within_parameters BOOLEAN,
  power_within_parameters BOOLEAN,
  water_within_parameters BOOLEAN,
  
  -- Additional Details
  status_details JSONB,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_coolbreeze_machine_timestamp UNIQUE (machine_id, timestamp)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_coolbreeze_machine_id ON public.coolbreeze(machine_id);
CREATE INDEX IF NOT EXISTS idx_coolbreeze_timestamp ON public.coolbreeze(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_coolbreeze_machine_timestamp ON public.coolbreeze(machine_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_coolbreeze_status ON public.coolbreeze(overall_status);
CREATE INDEX IF NOT EXISTS idx_coolbreeze_created_at ON public.coolbreeze(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.coolbreeze ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see CoolBreeze data for machines they have access to
-- Policy: Users can view CoolBreeze data for machines they own or have access to
CREATE POLICY "Users can view CoolBreeze data for accessible machines"
  ON public.coolbreeze
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = coolbreeze.machine_id
      AND (
        -- Super admin sees all
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'super_admin'
        )
        OR
        -- Machine owner
        m.owner_id = auth.uid()
        OR
        -- Company sees their machines and installer/client machines
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.installer_company_assignments ica ON ica.installer_id = m.owner_id
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'company'
          AND ica.company_id = ur.user_id
        )
        OR
        -- Installer sees their machines and client machines
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          LEFT JOIN public.client_admin_assignments caa ON caa.client_id = m.owner_id
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'installer'
          AND (m.owner_id = ur.user_id OR caa.admin_id = ur.user_id)
        )
      )
    )
  );

-- Policy: Only service role can insert (via trigger)
CREATE POLICY "Service role can insert CoolBreeze data"
  ON public.coolbreeze
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update CoolBreeze data"
  ON public.coolbreeze
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_coolbreeze_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_coolbreeze_updated_at
  BEFORE UPDATE ON public.coolbreeze
  FOR EACH ROW
  EXECUTE FUNCTION public.update_coolbreeze_updated_at();

-- Comments
COMMENT ON TABLE public.coolbreeze IS 'Processed status and historical data for CoolBreeze HVAC machines. Automatically populated from readings_raw table.';
COMMENT ON COLUMN public.coolbreeze.machine_id IS 'References the machines table to identify which CoolBreeze unit this data belongs to';
COMMENT ON COLUMN public.coolbreeze.overall_status IS 'Calculated overall status: operational, warning, error, offline, or unknown';
COMMENT ON COLUMN public.coolbreeze.status_details IS 'JSON object containing additional status information and calculated metrics';
COMMENT ON COLUMN public.coolbreeze.fan_speed IS 'Fan speed percentage (0-100) calculated from fan_voltage';


