-- ========================================
-- Add compressor_status column to alliance table
-- ========================================
-- This ensures the alliance table has compressor_status column
-- (Heatpumps have compressors, not water levels)
-- ========================================

-- Add compressor_status if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'alliance' 
    AND column_name = 'compressor_status'
  ) THEN
    ALTER TABLE public.alliance 
    ADD COLUMN compressor_status TEXT DEFAULT 'good';
    
    -- Add compressor_issue_first_detected_at if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'alliance' 
      AND column_name = 'compressor_issue_first_detected_at'
    ) THEN
      ALTER TABLE public.alliance 
      ADD COLUMN compressor_issue_first_detected_at TIMESTAMPTZ;
    END IF;
    
    RAISE NOTICE 'Added compressor_status and compressor_issue_first_detected_at columns to alliance table';
  ELSE
    RAISE NOTICE 'compressor_status column already exists in alliance table';
  END IF;
END $$;

