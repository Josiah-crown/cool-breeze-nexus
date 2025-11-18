-- Clean readings_raw table - RAW DATA ONLY
-- No calculations, no derived fields - just pure sensor readings
-- All calculations will be done in Supabase

-- Create clean readings_raw table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.readings_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- RAW Temperature Readings (Celsius) - Direct from sensors
  motor_temp NUMERIC(5,2),           -- Motor/compressor temperature sensor
  inside_temp NUMERIC(5,2),           -- Inside/duct temperature sensor
  outside_temp NUMERIC(5,2),           -- Outside/ambient temperature sensor
  
  -- RAW Electrical Readings - Direct from sensors
  current NUMERIC(6,2),               -- Current (Amps) from CT sensor
  voltage NUMERIC(6,2),               -- Voltage (Volts) from voltage sensor
  power NUMERIC(7,2),                 -- Power (Watts) - ONLY if sensor provides, otherwise NULL
  
  -- RAW Water Status - Direct from float switch
  has_water BOOLEAN,                  -- Water present (from float switch)
  
  -- RAW Voltage Inputs - Direct from voltage dividers (12V logic)
  -- These are configured per machine (which GPIO maps to which function)
  voltage_input_1 NUMERIC(5,2),       -- Voltage input 1 (e.g., fan, pump, drain, exhaust)
  voltage_input_2 NUMERIC(5,2),       -- Voltage input 2
  voltage_input_3 NUMERIC(5,2),       -- Voltage input 3
  voltage_input_4 NUMERIC(5,2),       -- Voltage input 4
  
  -- Metadata
  sensor_read_count INTEGER DEFAULT 1, -- Number of sensor readings averaged before sending
  api_key_used TEXT,                  -- Which API key was used (for tracking)
  
  -- Indexes for performance
  CONSTRAINT readings_raw_machine_created_idx UNIQUE NULLS NOT DISTINCT (machine_id, created_at)
);

-- Add missing columns if table already exists (safe migration)
-- This handles the case where the table exists but is missing these columns
-- IMPORTANT: Temporarily disable user-defined triggers to avoid errors during column addition

-- Check if table exists and add missing columns
DO $$
BEGIN
  -- Add voltage input columns if they don't exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'readings_raw') THEN
    -- Temporarily disable user-defined triggers (not system triggers like foreign keys)
    -- Only disable the specific trigger if it exists
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_process_cirrus_reading' AND tgrelid = 'public.readings_raw'::regclass) THEN
      ALTER TABLE public.readings_raw DISABLE TRIGGER trigger_process_cirrus_reading;
    END IF;
    
    -- Also check for CoolBreeze trigger
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_process_coolbreeze_reading' AND tgrelid = 'public.readings_raw'::regclass) THEN
      ALTER TABLE public.readings_raw DISABLE TRIGGER trigger_process_coolbreeze_reading;
    END IF;
    
    -- Table exists, add missing columns
    ALTER TABLE public.readings_raw
      ADD COLUMN IF NOT EXISTS voltage_input_1 NUMERIC(5,2),
      ADD COLUMN IF NOT EXISTS voltage_input_2 NUMERIC(5,2),
      ADD COLUMN IF NOT EXISTS voltage_input_3 NUMERIC(5,2),
      ADD COLUMN IF NOT EXISTS voltage_input_4 NUMERIC(5,2),
      ADD COLUMN IF NOT EXISTS sensor_read_count INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS api_key_used TEXT;
    
    -- Re-enable user-defined triggers
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_process_cirrus_reading' AND tgrelid = 'public.readings_raw'::regclass) THEN
      ALTER TABLE public.readings_raw ENABLE TRIGGER trigger_process_cirrus_reading;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_process_coolbreeze_reading' AND tgrelid = 'public.readings_raw'::regclass) THEN
      ALTER TABLE public.readings_raw ENABLE TRIGGER trigger_process_coolbreeze_reading;
    END IF;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_readings_raw_machine_id ON public.readings_raw(machine_id);
CREATE INDEX IF NOT EXISTS idx_readings_raw_created_at ON public.readings_raw(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_readings_raw_machine_created ON public.readings_raw(machine_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.readings_raw ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only service role can insert (via edge function)
CREATE POLICY "Service role can insert readings_raw"
  ON public.readings_raw
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- RLS Policy: Users can view readings_raw for machines they have access to
-- (Same logic as machines table RLS)
CREATE POLICY "Users can view readings_raw for accessible machines"
  ON public.readings_raw
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = readings_raw.machine_id
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

-- Comments
COMMENT ON TABLE public.readings_raw IS 'RAW sensor readings only - no calculations. All processing done in Supabase.';
COMMENT ON COLUMN public.readings_raw.motor_temp IS 'RAW motor/compressor temperature from sensor (°C)';
COMMENT ON COLUMN public.readings_raw.inside_temp IS 'RAW inside/duct temperature from sensor (°C)';
COMMENT ON COLUMN public.readings_raw.outside_temp IS 'RAW outside/ambient temperature from sensor (°C)';
COMMENT ON COLUMN public.readings_raw.current IS 'RAW current reading from CT sensor (Amps)';
COMMENT ON COLUMN public.readings_raw.voltage IS 'RAW voltage reading from sensor (Volts)';
COMMENT ON COLUMN public.readings_raw.power IS 'RAW power reading (Watts) - NULL if not provided by sensor';
COMMENT ON COLUMN public.readings_raw.has_water IS 'RAW water status from float switch (boolean)';
COMMENT ON COLUMN public.readings_raw.voltage_input_1 IS 'RAW voltage input 1 (Volts) - configured per machine';
COMMENT ON COLUMN public.readings_raw.voltage_input_2 IS 'RAW voltage input 2 (Volts) - configured per machine';
COMMENT ON COLUMN public.readings_raw.voltage_input_3 IS 'RAW voltage input 3 (Volts) - configured per machine';
COMMENT ON COLUMN public.readings_raw.voltage_input_4 IS 'RAW voltage input 4 (Volts) - configured per machine';
COMMENT ON COLUMN public.readings_raw.sensor_read_count IS 'Number of sensor readings averaged before this data point was sent (typically 120 for 2-minute intervals)';

