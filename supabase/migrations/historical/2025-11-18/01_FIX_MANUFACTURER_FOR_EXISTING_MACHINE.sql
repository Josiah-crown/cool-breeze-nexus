-- Fix: Set manufacturer for existing Cirrus machines
-- This fixes the issue where manufacturer=null prevents historical data from loading

-- 1. Check current state
SELECT 
  id,
  name,
  type,
  manufacturer,
  owner_id
FROM public.machines
WHERE manufacturer IS NULL OR manufacturer = '';

-- 2. Set manufacturer for evaporative machines (default to Cirrus if not set)
UPDATE public.machines
SET manufacturer = 'Cirrus'
WHERE type = 'evaporative' 
  AND (manufacturer IS NULL OR manufacturer = '');

-- 3. Verify the update
SELECT 
  id,
  name,
  type,
  manufacturer
FROM public.machines
WHERE type = 'evaporative';

-- Note: For airconditioner and heatpump types, you may want to set manufacturer = 'CoolBreeze'
-- UPDATE public.machines
-- SET manufacturer = 'CoolBreeze'
-- WHERE type IN ('airconditioner', 'heatpump')
--   AND (manufacturer IS NULL OR manufacturer = '');

