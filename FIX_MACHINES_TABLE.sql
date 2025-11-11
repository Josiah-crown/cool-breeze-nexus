-- Add missing columns to machines table for ESP32 data
-- Run this in Supabase SQL Editor

-- Check if columns exist and add them if missing
DO $$ 
BEGIN
    -- Add motor_temp if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='machines' AND column_name='motor_temp') THEN
        ALTER TABLE machines ADD COLUMN motor_temp DECIMAL(5,2);
    END IF;
    
    -- Add outside_temp if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='machines' AND column_name='outside_temp') THEN
        ALTER TABLE machines ADD COLUMN outside_temp DECIMAL(5,2);
    END IF;
    
    -- Add inside_temp if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='machines' AND column_name='inside_temp') THEN
        ALTER TABLE machines ADD COLUMN inside_temp DECIMAL(5,2);
    END IF;
    
    -- Add current if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='machines' AND column_name='current') THEN
        ALTER TABLE machines ADD COLUMN current DECIMAL(6,2);
    END IF;
    
    -- Add voltage if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='machines' AND column_name='voltage') THEN
        ALTER TABLE machines ADD COLUMN voltage DECIMAL(6,2);
    END IF;
    
    -- Add power if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='machines' AND column_name='power') THEN
        ALTER TABLE machines ADD COLUMN power DECIMAL(8,2);
    END IF;
    
    -- Add is_on if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='machines' AND column_name='is_on') THEN
        ALTER TABLE machines ADD COLUMN is_on BOOLEAN DEFAULT false;
    END IF;
    
    -- Add fan_active if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='machines' AND column_name='fan_active') THEN
        ALTER TABLE machines ADD COLUMN fan_active BOOLEAN DEFAULT false;
    END IF;
    
    -- Add is_cooling if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='machines' AND column_name='is_cooling') THEN
        ALTER TABLE machines ADD COLUMN is_cooling BOOLEAN DEFAULT false;
    END IF;
    
    -- Add overall_status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='machines' AND column_name='overall_status') THEN
        ALTER TABLE machines ADD COLUMN overall_status TEXT DEFAULT 'unknown';
    END IF;
    
    -- Add is_connected if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='machines' AND column_name='is_connected') THEN
        ALTER TABLE machines ADD COLUMN is_connected BOOLEAN DEFAULT false;
    END IF;
    
    -- Add last_seen if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='machines' AND column_name='last_seen') THEN
        ALTER TABLE machines ADD COLUMN last_seen TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add has_water if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='machines' AND column_name='has_water') THEN
        ALTER TABLE machines ADD COLUMN has_water BOOLEAN DEFAULT true;
    END IF;
    
    -- Add fan_speed if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='machines' AND column_name='fan_speed') THEN
        ALTER TABLE machines ADD COLUMN fan_speed INTEGER DEFAULT 0;
    END IF;
END $$;

-- Now create the trigger to update machines from readings_raw
CREATE OR REPLACE FUNCTION update_machine_from_reading()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the machines table with latest reading
  UPDATE machines
  SET 
    motor_temp = NEW.motor_temp,
    outside_temp = NEW.outside_temp,
    inside_temp = NEW.inside_temp,
    current = NEW.current,
    voltage = NEW.voltage,
    power = NEW.power,
    is_on = NEW.is_on,
    fan_active = NEW.fan_active,
    is_cooling = NEW.is_cooling,
    overall_status = NEW.overall_status,
    is_connected = true,
    last_seen = NOW(),
    has_water = COALESCE(NEW.has_water, true),
    fan_speed = COALESCE(NEW.fan_speed, 0),
    updated_at = NOW()
  WHERE id = NEW.machine_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_machine_from_reading ON readings_raw;

CREATE TRIGGER trigger_update_machine_from_reading
AFTER INSERT ON readings_raw
FOR EACH ROW
EXECUTE FUNCTION update_machine_from_reading();

-- Verify setup
SELECT 'Setup complete!' as status;


