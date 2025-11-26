-- ============================================================
-- COMPLETE FIX: readings_raw table with ALL ESP32 fields
-- ============================================================

-- Create readings_raw table if it doesn't exist
CREATE TABLE IF NOT EXISTS readings_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  
  -- Temperature readings
  motor_temp DECIMAL(5,2),
  outside_temp DECIMAL(5,2),
  inside_temp DECIMAL(5,2),
  delta_t DECIMAL(5,2),  -- MISSING COLUMN!
  
  -- Electrical readings
  current DECIMAL(6,2),
  voltage DECIMAL(6,2),
  power DECIMAL(8,2),
  
  -- Status flags
  is_on BOOLEAN DEFAULT false,
  fan_active BOOLEAN DEFAULT false,
  is_connected BOOLEAN DEFAULT true,
  overall_status TEXT,
  is_cooling BOOLEAN DEFAULT false,
  has_water BOOLEAN DEFAULT false,
  
  -- Component states (Evaporative Cooler specific)
  exhaust_active BOOLEAN DEFAULT false,
  pump_active BOOLEAN DEFAULT false,
  drain_active BOOLEAN DEFAULT false,
  fan_speed INTEGER DEFAULT 0,
  
  -- Voltage pickups (for diagnostics)
  exhaust_voltage DECIMAL(6,2),
  fan_voltage DECIMAL(6,2),
  pump_voltage DECIMAL(6,2),
  drain_voltage DECIMAL(6,2)
);

-- Add missing columns if table already exists
DO $$ 
BEGIN
    -- Add delta_t if it doesn't exist (THE MISSING COLUMN!)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='readings_raw' AND column_name='delta_t') THEN
        ALTER TABLE readings_raw ADD COLUMN delta_t DECIMAL(5,2);
        RAISE NOTICE 'Added delta_t column';
    END IF;
    
    -- Add is_connected if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='readings_raw' AND column_name='is_connected') THEN
        ALTER TABLE readings_raw ADD COLUMN is_connected BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added is_connected column';
    END IF;
    
    -- Add exhaust_active if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='readings_raw' AND column_name='exhaust_active') THEN
        ALTER TABLE readings_raw ADD COLUMN exhaust_active BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added exhaust_active column';
    END IF;
    
    -- Add pump_active if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='readings_raw' AND column_name='pump_active') THEN
        ALTER TABLE readings_raw ADD COLUMN pump_active BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added pump_active column';
    END IF;
    
    -- Add drain_active if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='readings_raw' AND column_name='drain_active') THEN
        ALTER TABLE readings_raw ADD COLUMN drain_active BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added drain_active column';
    END IF;
    
    -- Add voltage pickup columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='readings_raw' AND column_name='exhaust_voltage') THEN
        ALTER TABLE readings_raw ADD COLUMN exhaust_voltage DECIMAL(6,2);
        RAISE NOTICE 'Added exhaust_voltage column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='readings_raw' AND column_name='fan_voltage') THEN
        ALTER TABLE readings_raw ADD COLUMN fan_voltage DECIMAL(6,2);
        RAISE NOTICE 'Added fan_voltage column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='readings_raw' AND column_name='pump_voltage') THEN
        ALTER TABLE readings_raw ADD COLUMN pump_voltage DECIMAL(6,2);
        RAISE NOTICE 'Added pump_voltage column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='readings_raw' AND column_name='drain_voltage') THEN
        ALTER TABLE readings_raw ADD COLUMN drain_voltage DECIMAL(6,2);
        RAISE NOTICE 'Added drain_voltage column';
    END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_readings_raw_machine_id ON readings_raw(machine_id);
CREATE INDEX IF NOT EXISTS idx_readings_raw_created_at ON readings_raw(created_at DESC);

-- Verify all columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'readings_raw' 
ORDER BY ordinal_position;


