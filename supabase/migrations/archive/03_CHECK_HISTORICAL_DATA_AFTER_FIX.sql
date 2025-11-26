-- Check Historical Data After Fixes
-- Run this after running 01 and 02 to verify everything works

-- 1. Verify manufacturer is set
SELECT 
  id,
  name,
  type,
  manufacturer,
  CASE 
    WHEN manufacturer = 'Cirrus' THEN 'cirrus'
    WHEN manufacturer = 'CoolBreeze' THEN 'coolbreeze'
    ELSE 'unknown - NEEDS FIX'
  END as expected_table
FROM public.machines
ORDER BY created_at DESC;

-- 2. Check if data exists in cirrus table
SELECT 
  m.id as machine_id,
  m.name,
  m.manufacturer,
  COUNT(c.id) as total_cirrus_records,
  COUNT(c.id) FILTER (WHERE c.timestamp >= NOW() - INTERVAL '24 hours') as records_last_24h,
  MAX(c.timestamp) as latest_reading,
  MIN(c.timestamp) as oldest_reading
FROM public.machines m
LEFT JOIN public.cirrus c ON c.machine_id = m.id
WHERE m.type = 'evaporative'
GROUP BY m.id, m.name, m.manufacturer, m.created_at
ORDER BY m.created_at DESC;

-- 3. Sample recent data (replace with your machine ID)
-- SELECT 
--   timestamp,
--   ambient_temp,
--   duct_temp,
--   motor_temp,
--   delta_t,
--   current,
--   voltage,
--   power,
--   fan_active,
--   is_cooling,
--   has_water
-- FROM public.cirrus
-- WHERE machine_id = 'YOUR_MACHINE_ID'
-- ORDER BY timestamp DESC
-- LIMIT 10;

-- 4. Test RLS access (this should work without 403 error)
-- Run this as the logged-in user to verify RLS allows access
SELECT 
  COUNT(*) as accessible_records
FROM public.cirrus c
JOIN public.machines m ON m.id = c.machine_id
WHERE m.owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'super_admin'
  );

