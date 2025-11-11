-- Allow ESP32 (using anon key) to insert directly into readings_raw
-- This is a temporary solution until Edge Function is properly deployed

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "ESP32 can insert readings" ON readings_raw;

-- Create permissive INSERT policy for anon role
CREATE POLICY "ESP32 can insert readings" 
ON readings_raw 
FOR INSERT 
TO anon 
WITH CHECK (true);

-- Keep SELECT restricted to authenticated users only
DROP POLICY IF EXISTS "Users can view readings for their machines" ON readings_raw;

CREATE POLICY "Users can view readings for their machines" 
ON readings_raw 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM machines
    WHERE machines.id = readings_raw.machine_id
  )
);

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'readings_raw';


