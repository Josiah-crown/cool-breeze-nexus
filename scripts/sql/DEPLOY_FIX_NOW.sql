-- ============================================================================
-- Fix INSERT Policies for SECURITY DEFINER Trigger Functions
-- Run this in Supabase SQL Editor to fix the data processing issue
-- ============================================================================

-- ========================================
-- FIX ALLIANCE INSERT POLICY
-- ========================================
DROP POLICY IF EXISTS "Service role can insert Alliance data" ON public.alliance;

CREATE POLICY "Service role can insert Alliance data"
  ON public.alliance
  FOR INSERT
  TO PUBLIC
  WITH CHECK (
    auth.role() = 'service_role'::text
    OR current_user = 'postgres'
  );

-- ========================================
-- FIX COOLBREEZE INSERT POLICY
-- ========================================
DROP POLICY IF EXISTS "Service role can insert CoolBreeze data" ON public.coolbreeze;

CREATE POLICY "Service role can insert CoolBreeze data"
  ON public.coolbreeze
  FOR INSERT
  TO PUBLIC
  WITH CHECK (
    auth.role() = 'service_role'::text
    OR current_user = 'postgres'
  );

-- ========================================
-- FIX CIRRUS INSERT POLICY (for consistency)
-- ========================================
DROP POLICY IF EXISTS "Service role can insert CIRRUS data" ON public.cirrus;

CREATE POLICY "Service role can insert CIRRUS data"
  ON public.cirrus
  FOR INSERT
  TO PUBLIC
  WITH CHECK (
    auth.role() = 'service_role'::text
    OR current_user = 'postgres'
  );

-- ========================================
-- VERIFICATION
-- ========================================
SELECT 
  tablename,
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('cirrus', 'alliance', 'coolbreeze')
  AND cmd = 'INSERT'
ORDER BY tablename, policyname;

