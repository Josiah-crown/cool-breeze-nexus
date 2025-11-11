-- Add missing delta_t column to readings_raw table
ALTER TABLE readings_raw 
ADD COLUMN IF NOT EXISTS delta_t DECIMAL(5,2);

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'readings_raw' 
AND column_name = 'delta_t';


