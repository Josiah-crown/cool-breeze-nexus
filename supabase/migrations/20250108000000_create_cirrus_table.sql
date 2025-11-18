-- CIRRUS Evaporative Cooler Table
-- Stores processed status and historical data for Cirrus machines
-- Automatically populated from readings_raw via database trigger

CREATE TABLE IF NOT EXISTS public.cirrus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  
  -- Timestamp for this reading
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Temperature Readings (Celsius)
  ambient_temp NUMERIC(5,2),           -- Outside/ambient temperature
  duct_temp NUMERIC(5,2),              -- Inside/duct temperature
  motor_temp NUMERIC(5,2),              -- Motor temperature
  delta_t NUMERIC(5,2),                 -- Temperature difference (ambient - duct)
  
  -- Operational States (boolean)
  fan_active BOOLEAN NOT NULL DEFAULT false,
  pump_active BOOLEAN NOT NULL DEFAULT false,
  drain_active BOOLEAN NOT NULL DEFAULT false,
  exhaust_active BOOLEAN NOT NULL DEFAULT false,
  is_cooling BOOLEAN NOT NULL DEFAULT false,
  is_on BOOLEAN NOT NULL DEFAULT false,
  is_connected BOOLEAN NOT NULL DEFAULT true, -- Connection status (calculated: last reading within 10 min)
  
  -- Water Management
  has_water BOOLEAN NOT NULL DEFAULT true,  -- Water status: true = full, false = empty (we can only read full/empty, not actual level)
  
  -- Electrical Readings
  voltage NUMERIC(6,2),                 -- Voltage (V)
  current NUMERIC(6,2),                 -- Current (A)
  power NUMERIC(7,2),                   -- Power consumption (W)
  
  -- Calculated Status
  overall_status TEXT NOT NULL DEFAULT 'unknown' 
    CHECK (overall_status IN ('operational', 'warning', 'error', 'offline', 'unknown')),
  motor_status TEXT NOT NULL DEFAULT 'normal'
    CHECK (motor_status IN ('normal', 'warning', 'critical')),
  water_status TEXT NOT NULL DEFAULT 'ok'
    CHECK (water_status IN ('ok', 'low', 'empty')),
  cooling_status TEXT NOT NULL DEFAULT 'idle'
    CHECK (cooling_status IN ('idle', 'active', 'inefficient')),
  
  -- Status Details (JSON for flexible storage)
  status_details JSONB,                 -- Additional status information
  
  -- Parameter Compliance Flags (calculated from machine thresholds)
  motor_temp_within_parameters BOOLEAN, -- Motor temp within set parameters
  current_within_parameters BOOLEAN,   -- Current within set parameters
  voltage_within_parameters BOOLEAN,    -- Voltage within set parameters (200-250V standard)
  power_within_parameters BOOLEAN,      -- Power within set parameters
  water_within_parameters BOOLEAN,      -- Water status within parameters (has_water = true)
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one reading per machine per timestamp (prevent duplicates)
  CONSTRAINT unique_machine_timestamp UNIQUE (machine_id, timestamp)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cirrus_machine_id ON public.cirrus(machine_id);
CREATE INDEX IF NOT EXISTS idx_cirrus_timestamp ON public.cirrus(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_cirrus_machine_timestamp ON public.cirrus(machine_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_cirrus_status ON public.cirrus(overall_status);
CREATE INDEX IF NOT EXISTS idx_cirrus_created_at ON public.cirrus(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.cirrus ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see CIRRUS data for machines they have access to
-- (This will use the same logic as machines table RLS)

-- Policy: Users can view CIRRUS data for machines they own or have access to
CREATE POLICY "Users can view CIRRUS data for accessible machines"
  ON public.cirrus
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = cirrus.machine_id
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
CREATE POLICY "Service role can insert CIRRUS data"
  ON public.cirrus
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Policy: Only service role can update
CREATE POLICY "Service role can update CIRRUS data"
  ON public.cirrus
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_cirrus_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_cirrus_updated_at
  BEFORE UPDATE ON public.cirrus
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cirrus_updated_at();

-- Comment on table
COMMENT ON TABLE public.cirrus IS 'Processed status and historical data for Cirrus evaporative coolers. Automatically populated from readings_raw table.';
COMMENT ON COLUMN public.cirrus.machine_id IS 'References the machines table to identify which Cirrus unit this data belongs to';
COMMENT ON COLUMN public.cirrus.overall_status IS 'Calculated overall status: operational, warning, error, offline, or unknown';
COMMENT ON COLUMN public.cirrus.status_details IS 'JSON object containing additional status information and calculated metrics';

