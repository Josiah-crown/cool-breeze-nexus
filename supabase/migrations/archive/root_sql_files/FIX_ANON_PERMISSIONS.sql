-- ============================================================
-- COMPREHENSIVE FIX: Grant anon role permission + RLS policy
-- ============================================================

-- 1. GRANT INSERT permission to anon role (CRITICAL!)
GRANT INSERT ON readings_raw TO anon;
GRANT USAGE ON SCHEMA public TO anon;

-- 2. Enable RLS
ALTER TABLE public.readings_raw ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "ESP32 can insert readings" ON readings_raw;
DROP POLICY IF EXISTS "Users can view readings for their machines" ON readings_raw;

-- 4. Create INSERT policy for anon (ESP32)
CREATE POLICY "ESP32 can insert readings" 
ON readings_raw 
FOR INSERT 
TO anon 
WITH CHECK (true);

-- 5. Create SELECT policy for authenticated users (Dashboard)
CREATE POLICY "Users can view readings for their machines" 
ON readings_raw 
FOR SELECT 
TO authenticated 
USING (true);

-- ============================================================
-- VERIFICATION
-- ============================================================

-- Check table permissions
SELECT 
  grantee, 
  privilege_type 
FROM information_schema.table_privileges 
WHERE table_name = 'readings_raw' 
AND grantee IN ('anon', 'authenticated', 'service_role');

-- Check RLS status
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE tablename = 'readings_raw';

-- Check policies
SELECT 
  schemaname,
  tablename,
  policyname, 
  permissive,
  roles, 
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'readings_raw';


