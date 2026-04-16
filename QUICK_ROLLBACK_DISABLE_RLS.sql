-- ============================================================================
-- Quick Rollback: Disable RLS on alliance table
-- ============================================================================
-- This will disable RLS on the alliance table, reverting the security advisor fix
-- This should allow data processing to resume immediately
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Disable RLS on alliance table (revert the security advisor fix)
ALTER TABLE IF EXISTS public.alliance DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
  'alliance' as table_name,
  rowsecurity as rls_enabled,
  CASE WHEN rowsecurity THEN '⚠️ RLS still enabled' ELSE '✅ RLS disabled' END as status
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'alliance';

