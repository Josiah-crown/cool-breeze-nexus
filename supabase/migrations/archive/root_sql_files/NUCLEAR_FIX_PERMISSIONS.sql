-- ============================================================
-- NUCLEAR OPTION: Completely reset readings_raw permissions
-- ============================================================

-- Step 1: Drop ALL existing policies
DROP POLICY IF EXISTS "ESP32 can insert readings" ON readings_raw;
DROP POLICY IF EXISTS "Users can view readings for their machines" ON readings_raw;
DROP POLICY IF EXISTS "Enable insert for anon" ON readings_raw;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON readings_raw;

-- Step 2: Revoke all existing permissions and re-grant
REVOKE ALL ON readings_raw FROM anon;
REVOKE ALL ON readings_raw FROM authenticated;
REVOKE ALL ON readings_raw FROM service_role;

-- Step 3: Grant basic table access
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Step 4: Grant INSERT to anon (ESP32), SELECT to authenticated (Dashboard)
GRANT INSERT ON readings_raw TO anon;
GRANT SELECT ON readings_raw TO authenticated;
GRANT ALL ON readings_raw TO service_role;

-- Step 5: Disable RLS temporarily to test
ALTER TABLE readings_raw DISABLE ROW LEVEL SECURITY;

-- Step 6: Verify grants
SELECT 
  grantee, 
  privilege_type,
  is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'readings_raw' 
ORDER BY grantee, privilege_type;

-- Step 7: Check RLS status
SELECT 
  tablename, 
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE tablename = 'readings_raw';

SELECT '✅ PERMISSIONS RESET - RLS DISABLED FOR TESTING' as status;


