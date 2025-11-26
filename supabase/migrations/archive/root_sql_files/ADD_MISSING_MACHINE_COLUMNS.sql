-- ============================================================
-- Add ALL missing columns to machines table for ESP32 data
-- ============================================================

DO $$ 
BEGIN
    -- Temperature readings
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='machines' AND column_name='motor_temp') THEN
        ALTER TABLE machines ADD COLUMN motor_temp DECIMAL(5,2);
        RAISE NOTICE 'Added motor_temp';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='machines' AND column_name='outside_temp') THEN
        ALTER TABLE machines ADD COLUMN outside_temp DECIMAL(5,2);
        RAISE NOTICE 'Added outside_temp';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='machines' AND column_name='inside_temp') THEN
        ALTER TABLE machines ADD COLUMN inside_temp DECIMAL(5,2);
        RAISE NOTICE 'Added inside_temp';
    END IF;
    
    -- Electrical readings
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='machines' AND column_name='current') THEN
        ALTER TABLE machines ADD COLUMN current DECIMAL(6,2);
        RAISE NOTICE 'Added current';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='machines' AND column_name='voltage') THEN
        ALTER TABLE machines ADD COLUMN voltage DECIMAL(6,2);
        RAISE NOTICE 'Added voltage';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='machines' AND column_name='power') THEN
        ALTER TABLE machines ADD COLUMN power DECIMAL(8,2);
        RAISE NOTICE 'Added power';
    END IF;
    
    -- Status flags
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='machines' AND column_name='is_on') THEN
        ALTER TABLE machines ADD COLUMN is_on BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_on';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='machines' AND column_name='fan_active') THEN
        ALTER TABLE machines ADD COLUMN fan_active BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added fan_active';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='machines' AND column_name='overall_status') THEN
        ALTER TABLE machines ADD COLUMN overall_status TEXT;
        RAISE NOTICE 'Added overall_status';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='machines' AND column_name='is_cooling') THEN
        ALTER TABLE machines ADD COLUMN is_cooling BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_cooling';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='machines' AND column_name='has_water') THEN
        ALTER TABLE machines ADD COLUMN has_water BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added has_water';
    END IF;
    
    -- Component states (Evaporative Cooler specific) - THE MISSING ONES!
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='machines' AND column_name='exhaust_active') THEN
        ALTER TABLE machines ADD COLUMN exhaust_active BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added exhaust_active';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='machines' AND column_name='pump_active') THEN
        ALTER TABLE machines ADD COLUMN pump_active BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added pump_active';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='machines' AND column_name='drain_active') THEN
        ALTER TABLE machines ADD COLUMN drain_active BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added drain_active';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='machines' AND column_name='fan_speed') THEN
        ALTER TABLE machines ADD COLUMN fan_speed INTEGER DEFAULT 0;
        RAISE NOTICE 'Added fan_speed';
    END IF;
    
    -- Timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='machines' AND column_name='last_seen') THEN
        ALTER TABLE machines ADD COLUMN last_seen TIMESTAMPTZ;
        RAISE NOTICE 'Added last_seen';
    END IF;
END $$;

-- Verify all columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'machines' 
AND column_name IN (
  'motor_temp', 'outside_temp', 'inside_temp', 'current', 'voltage', 'power',
  'is_on', 'fan_active', 'overall_status', 'is_cooling', 'has_water',
  'exhaust_active', 'pump_active', 'drain_active', 'fan_speed', 'last_seen'
)
ORDER BY column_name;

SELECT '✅ ALL MISSING COLUMNS ADDED TO MACHINES TABLE' as status;


