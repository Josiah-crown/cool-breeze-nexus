-- Fix Table-Level Permissions
-- This is likely the missing piece!
-- RLS policies control WHICH rows, but GRANTs control IF you can access the table

-- Step 1: Check current permissions
SELECT 
  'Current Permissions' as check_type,
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'cirrus'
  AND privilege_type = 'SELECT'
ORDER BY grantee;

-- Step 2: Grant SELECT permission to authenticated and anon roles
-- This is REQUIRED even if RLS policies exist!
GRANT SELECT ON public.cirrus TO authenticated;
GRANT SELECT ON public.cirrus TO anon;

-- Step 3: Also grant on sequences (if any)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Step 4: Verify grants were applied
SELECT 
  'After Grant' as check_type,
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'cirrus'
  AND privilege_type = 'SELECT'
  AND grantee IN ('authenticated', 'anon', 'public')
ORDER BY grantee;

-- Step 5: Check if we need to grant on the schema itself
SELECT 
  'Schema Usage' as check_type,
  grantee,
  privilege_type
FROM information_schema.usage_privileges
WHERE object_schema = 'public'
  AND grantee IN ('authenticated', 'anon')
ORDER BY grantee, privilege_type;

-- IMPORTANT: 
-- In PostgreSQL/Supabase:
-- 1. GRANT controls table-level access (can you access the table at all?)
-- 2. RLS policies control row-level access (which rows can you see?)
-- 
-- If authenticated role doesn't have SELECT grant, RLS policies won't matter!
-- This is likely why even USING (true) doesn't work.

