-- ============================================================
-- QUICK FIX: Enable ESP32 data insertion
-- This is the MINIMUM needed to get ESP32 working
-- ============================================================

-- Enable RLS on readings_raw
ALTER TABLE public.readings_raw ENABLE ROW LEVEL SECURITY;

-- Allow ESP32 (anon key) to INSERT
DROP POLICY IF EXISTS "ESP32 can insert readings" ON readings_raw;
CREATE POLICY "ESP32 can insert readings" 
ON readings_raw 
FOR INSERT 
TO anon 
WITH CHECK (true);

-- Allow authenticated users to SELECT
DROP POLICY IF EXISTS "Users can view readings for their machines" ON readings_raw;
CREATE POLICY "Users can view readings for their machines" 
ON readings_raw 
FOR SELECT 
TO authenticated 
USING (true);  -- Permissive for now

-- Verify
SELECT tablename, rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE tablename = 'readings_raw';

SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'readings_raw';


