-- Check Table-Level Permissions (Not RLS Policies)
-- If USING (true) doesn't work, the issue is likely table-level permissions

-- Step 1: Check what roles have SELECT permission on cirrus table
SELECT 
  'Table-Level Permissions' as check_type,
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'cirrus'
  AND privilege_type = 'SELECT'
ORDER BY grantee;

-- Step 2: Check if authenticated role has SELECT permission
SELECT 
  'Authenticated Role Permission' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.role_table_grants
      WHERE table_schema = 'public'
        AND table_name = 'cirrus'
        AND grantee = 'authenticated'
        AND privilege_type = 'SELECT'
    ) THEN '✅ authenticated has SELECT permission'
    ELSE '❌ authenticated does NOT have SELECT permission - THIS IS THE PROBLEM!'
  END as permission_status;

-- Step 3: Grant SELECT permission to authenticated role (if missing)
-- This is often the missing piece!
GRANT SELECT ON public.cirrus TO authenticated;
GRANT SELECT ON public.cirrus TO anon;

-- Step 4: Verify grants were applied
SELECT 
  'After Grant' as check_type,
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'cirrus'
  AND privilege_type = 'SELECT'
  AND grantee IN ('authenticated', 'anon')
ORDER BY grantee;

-- Step 5: Also check if public schema has proper permissions
SELECT 
  'Schema Permissions' as check_type,
  grantee,
  privilege_type
FROM information_schema.usage_privileges
WHERE object_schema = 'public'
  AND object_name = 'cirrus'
ORDER BY grantee;

-- IMPORTANT: 
-- RLS policies control WHICH ROWS a user can see
-- But table-level GRANTs control WHETHER a user can access the table at all
-- If authenticated role doesn't have SELECT grant, RLS policies won't matter!

