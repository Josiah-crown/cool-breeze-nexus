-- Remove water_level column from cirrus table
-- We can only read FULL/EMPTY (boolean has_water), not actual water level percentage
-- This column is misleading and should be removed

ALTER TABLE public.cirrus 
DROP COLUMN IF EXISTS water_level;

COMMENT ON COLUMN public.cirrus.has_water IS 'Water status: true = full, false = empty. We can only read full/empty, not actual level percentage.';

