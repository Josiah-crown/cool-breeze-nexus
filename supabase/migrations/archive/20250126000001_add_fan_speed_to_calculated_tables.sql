-- Add fan_speed column to calculated tables (EXCLUDING heatpumps/alliance)
-- Fan speed is a percentage (0-100) calculated from fan voltage
-- NOTE: Heatpumps (alliance table) do NOT have fans, so fan_speed is not added to alliance tables

-- Add to cirrus_calculated (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cirrus_calculated') THEN
    ALTER TABLE public.cirrus_calculated 
    ADD COLUMN IF NOT EXISTS fan_speed INTEGER DEFAULT 0 
    CHECK (fan_speed >= 0 AND fan_speed <= 100);
    
    COMMENT ON COLUMN public.cirrus_calculated.fan_speed IS 'Fan speed percentage (0-100) calculated from fan voltage';
  END IF;
END $$;

-- Add to cirrus (current legacy table name)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cirrus') THEN
    ALTER TABLE public.cirrus 
    ADD COLUMN IF NOT EXISTS fan_speed INTEGER DEFAULT 0 
    CHECK (fan_speed >= 0 AND fan_speed <= 100);
    
    COMMENT ON COLUMN public.cirrus.fan_speed IS 'Fan speed percentage (0-100) calculated from fan voltage';
  END IF;
END $$;

-- Add to coolbreeze_calculated (if it exists, otherwise will be created in schema)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'coolbreeze_calculated') THEN
    ALTER TABLE public.coolbreeze_calculated 
    ADD COLUMN IF NOT EXISTS fan_speed INTEGER DEFAULT 0 
    CHECK (fan_speed >= 0 AND fan_speed <= 100);
    
    COMMENT ON COLUMN public.coolbreeze_calculated.fan_speed IS 'Fan speed percentage (0-100) calculated from fan voltage';
  END IF;
END $$;

-- Add to coolbreeze (current table name, before migration)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'coolbreeze') THEN
    ALTER TABLE public.coolbreeze 
    ADD COLUMN IF NOT EXISTS fan_speed INTEGER DEFAULT 0 
    CHECK (fan_speed >= 0 AND fan_speed <= 100);
    
    COMMENT ON COLUMN public.coolbreeze.fan_speed IS 'Fan speed percentage (0-100) calculated from fan voltage';
  END IF;
END $$;

-- NOTE: alliance_calculated and alliance tables are NOT updated with fan_speed
-- Heatpumps (Alliance) do NOT have fans, so fan_speed is not applicable

