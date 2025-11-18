-- Machine Voltage Input Configuration
-- Maps which voltage_input (1-4) corresponds to which function per machine
-- This allows different machines to have different GPIO mappings

CREATE TABLE IF NOT EXISTS public.machine_voltage_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  
  -- Voltage Input Mappings
  -- Each input (1-4) can be mapped to: fan, pump, drain, exhaust, or unused
  voltage_input_1_function TEXT CHECK (voltage_input_1_function IN ('fan', 'pump', 'drain', 'exhaust', 'unused')),
  voltage_input_2_function TEXT CHECK (voltage_input_2_function IN ('fan', 'pump', 'drain', 'exhaust', 'unused')),
  voltage_input_3_function TEXT CHECK (voltage_input_3_function IN ('fan', 'pump', 'drain', 'exhaust', 'unused')),
  voltage_input_4_function TEXT CHECK (voltage_input_4_function IN ('fan', 'pump', 'drain', 'exhaust', 'unused')),
  
  -- Voltage Threshold (12V logic - voltage above this = active)
  voltage_active_threshold NUMERIC(4,2) DEFAULT 6.0, -- Volts
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(machine_id) -- One config per machine
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_machine_voltage_config_machine_id ON public.machine_voltage_config(machine_id);

-- Enable RLS
ALTER TABLE public.machine_voltage_config ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view/edit config for machines they own
CREATE POLICY "Users can manage voltage config for their machines"
  ON public.machine_voltage_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = machine_voltage_config.machine_id
      AND (
        m.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'super_admin'
        )
      )
    )
  );

-- Function to update updated_at
CREATE OR REPLACE FUNCTION public.update_machine_voltage_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_machine_voltage_config_updated_at
  BEFORE UPDATE ON public.machine_voltage_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_machine_voltage_config_updated_at();

-- Function to create default config for new machines
CREATE OR REPLACE FUNCTION public.create_default_voltage_config()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default voltage config for new machine
  -- Default mapping for Cirrus: input1=fan, input2=pump, input3=drain, input4=exhaust
  INSERT INTO public.machine_voltage_config (
    machine_id,
    voltage_input_1_function,
    voltage_input_2_function,
    voltage_input_3_function,
    voltage_input_4_function
  ) VALUES (
    NEW.id,
    'fan',    -- Default: input 1 = fan
    'pump',   -- Default: input 2 = pump
    'drain',  -- Default: input 3 = drain
    'exhaust' -- Default: input 4 = exhaust
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create voltage config on machine insert
DROP TRIGGER IF EXISTS trigger_create_default_voltage_config ON public.machines;
CREATE TRIGGER trigger_create_default_voltage_config
  AFTER INSERT ON public.machines
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_voltage_config();

-- Backfill: Create voltage config for existing machines
INSERT INTO public.machine_voltage_config (machine_id, voltage_input_1_function, voltage_input_2_function, voltage_input_3_function, voltage_input_4_function)
SELECT id, 'fan', 'pump', 'drain', 'exhaust'
FROM public.machines
WHERE id NOT IN (SELECT machine_id FROM public.machine_voltage_config)
ON CONFLICT (machine_id) DO NOTHING;

-- Comments
COMMENT ON TABLE public.machine_voltage_config IS 'Maps voltage inputs (1-4) to functions (fan, pump, drain, exhaust) per machine';
COMMENT ON COLUMN public.machine_voltage_config.voltage_active_threshold IS 'Voltage threshold (V) - above this = active (default 6.0V for 12V logic)';


