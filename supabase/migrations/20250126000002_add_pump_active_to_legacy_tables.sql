-- Ensure pump_active column exists in all legacy tables
-- This is critical for get_historical_data() function to work

-- Add to cirrus (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cirrus') THEN
    ALTER TABLE public.cirrus 
    ADD COLUMN IF NOT EXISTS pump_active BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add to coolbreeze (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'coolbreeze') THEN
    ALTER TABLE public.coolbreeze 
    ADD COLUMN IF NOT EXISTS pump_active BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add to alliance (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'alliance') THEN
    ALTER TABLE public.alliance 
    ADD COLUMN IF NOT EXISTS pump_active BOOLEAN DEFAULT false;
  END IF;
END $$;

