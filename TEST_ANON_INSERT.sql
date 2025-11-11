-- ============================================================
-- TEST: Can anon role insert into readings_raw?
-- ============================================================

-- Check current permissions for anon role
SELECT 
  grantee, 
  privilege_type,
  is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'readings_raw' 
AND grantee = 'anon';

-- Check RLS policies for anon
SELECT 
  policyname, 
  permissive,
  roles, 
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'readings_raw'
AND roles @> ARRAY['anon'];

-- Try manual insert as anon (this will fail if permissions are wrong)
-- We'll set the role to anon to simulate ESP32
SET LOCAL ROLE anon;

INSERT INTO readings_raw (
  machine_id,
  motor_temp,
  current,
  is_on,
  overall_status
) VALUES (
  '22066669-eb4a-4675-8916-bf4f235dfd85',
  21.5,
  0.8,
  false,
  'good'
);

-- Reset role
RESET ROLE;

-- Check if it worked
SELECT COUNT(*) as "Rows in readings_raw" FROM readings_raw;


