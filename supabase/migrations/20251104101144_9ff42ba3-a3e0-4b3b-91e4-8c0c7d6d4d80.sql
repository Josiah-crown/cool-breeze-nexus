-- Drop the old check constraint on type if it exists
ALTER TABLE public.machines 
DROP CONSTRAINT IF EXISTS machines_type_check;

-- Update existing 'fan' type machines to 'evaporative'
UPDATE public.machines 
SET type = 'evaporative' 
WHERE type = 'fan';

-- Add location field to machines table
ALTER TABLE public.machines 
ADD COLUMN IF NOT EXISTS location text;

-- Add temperature_setpoint field for heat pumps (0-75°C range)
ALTER TABLE public.machines 
ADD COLUMN IF NOT EXISTS temperature_setpoint numeric DEFAULT 55;

-- Add pump and heat state fields for heat pump functionality
ALTER TABLE public.machines 
ADD COLUMN IF NOT EXISTS has_pump boolean NOT NULL DEFAULT false;

ALTER TABLE public.machines 
ADD COLUMN IF NOT EXISTS has_heat boolean NOT NULL DEFAULT false;

-- Add a new check constraint allowing the new types
ALTER TABLE public.machines 
ADD CONSTRAINT machines_type_check CHECK (type IN ('evaporative', 'airconditioner', 'heatpump'));

-- Add check constraint for temperature_setpoint
ALTER TABLE public.machines 
ADD CONSTRAINT machines_temp_setpoint_check CHECK (temperature_setpoint IS NULL OR (temperature_setpoint >= 0 AND temperature_setpoint <= 75));

-- Add comment to document the machine types
COMMENT ON COLUMN public.machines.type IS 'Machine type: evaporative, airconditioner, or heatpump';