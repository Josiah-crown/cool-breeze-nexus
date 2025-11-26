-- ========================================
-- ENSURE COOLBREEZE TABLE EXISTS
-- ========================================
-- Purpose: Create coolbreeze table if it doesn't exist (for backward compatibility)
-- Date: 2025-11-25
-- Note: The frontend queries 'coolbreeze' (not 'coolbreeze_calculated')
-- This ensures the table exists to prevent 404 errors
-- ========================================

-- Create coolbreeze table if it doesn't exist (for backward compatibility with frontend)
-- This is the table the frontend actually queries
CREATE TABLE IF NOT EXISTS public.coolbreeze (
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
  
  -- Pickup voltages (mapped from voltage_inputs via voltage_config)
  voltage_1 NUMERIC(5,2),
  voltage_2 NUMERIC(5,2),
  voltage_3 NUMERIC(5,2),
  voltage_4 NUMERIC(5,2),
  voltage_5 NUMERIC(5,2),
  voltage_6 NUMERIC(5,2),
  
  -- Operational states (calculated from pickup voltages)
  fan_active BOOLEAN NOT NULL DEFAULT false,
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
  
  CONSTRAINT unique_coolbreeze_machine_timestamp UNIQUE (machine_id, timestamp)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_coolbreeze_machine_id ON public.coolbreeze(machine_id);
CREATE INDEX IF NOT EXISTS idx_coolbreeze_timestamp ON public.coolbreeze(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_coolbreeze_machine_timestamp ON public.coolbreeze(machine_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_coolbreeze_status ON public.coolbreeze(overall_status);

-- Enable RLS
ALTER TABLE public.coolbreeze ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policy: Users can view data for machines they own or have access to
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'coolbreeze' 
    AND policyname = 'Users can view coolbreeze for their machines'
  ) THEN
    CREATE POLICY "Users can view coolbreeze for their machines"
      ON public.coolbreeze FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.machines
          WHERE machines.id = coolbreeze.machine_id
          AND machines.owner_id = auth.uid()
        )
        OR public.has_role(auth.uid(), 'super_admin')
      );
  END IF;
END $$;

-- Allow service role to insert/update (for ESP32 API)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'coolbreeze' 
    AND policyname = 'Service role can insert coolbreeze'
  ) THEN
    CREATE POLICY "Service role can insert coolbreeze"
      ON public.coolbreeze FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'coolbreeze' 
    AND policyname = 'Service role can update coolbreeze'
  ) THEN
    CREATE POLICY "Service role can update coolbreeze"
      ON public.coolbreeze FOR UPDATE
      USING (true);
  END IF;
END $$;

-- Create trigger for updated_at if it doesn't exist
DROP TRIGGER IF EXISTS update_coolbreeze_updated_at ON public.coolbreeze;
CREATE TRIGGER update_coolbreeze_updated_at
  BEFORE UPDATE ON public.coolbreeze
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.coolbreeze IS 'Processed/calculated data for CoolBreeze machines (1 year retention). This is the table the frontend queries.';

