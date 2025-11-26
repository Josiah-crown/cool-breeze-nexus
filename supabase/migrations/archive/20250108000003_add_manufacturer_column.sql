-- Optional: Add manufacturer column to machines table
-- This allows filtering by manufacturer (e.g., 'Cirrus') in addition to type
-- If you don't need manufacturer filtering, you can skip this migration

ALTER TABLE public.machines 
ADD COLUMN IF NOT EXISTS manufacturer TEXT;

-- Add comment
COMMENT ON COLUMN public.machines.manufacturer IS 'Manufacturer name (e.g., "Cirrus", "CoolBreeze", etc.). Used for device-specific processing.';

-- Optional: Update existing evaporative coolers to have manufacturer
-- Uncomment the line below if you want to set manufacturer for existing machines
-- UPDATE public.machines SET manufacturer = 'Cirrus' WHERE type = 'evaporative' AND manufacturer IS NULL;


