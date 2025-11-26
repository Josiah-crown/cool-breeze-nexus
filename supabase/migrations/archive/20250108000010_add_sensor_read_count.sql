-- Add sensor_read_count column to readings_raw table
-- This tracks how many sensor readings were averaged before sending

ALTER TABLE public.readings_raw 
ADD COLUMN IF NOT EXISTS sensor_read_count INTEGER DEFAULT 1;

-- Add comment
COMMENT ON COLUMN public.readings_raw.sensor_read_count IS 'Number of sensor readings averaged before this data point was sent (typically 120 for 2-minute intervals)';

-- Update existing rows to have default value
UPDATE public.readings_raw 
SET sensor_read_count = 1 
WHERE sensor_read_count IS NULL;


