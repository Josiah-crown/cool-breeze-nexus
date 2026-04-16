-- ============================================================================
-- Fix INSERT Policies for SECURITY DEFINER Trigger Functions
-- ============================================================================
-- Date: January 12, 2026
-- Purpose: Fix RLS INSERT policies to allow SECURITY DEFINER trigger functions to insert data
-- Problem: SECURITY DEFINER functions run as function owner (postgres), not service_role
--          Policies checking auth.role() = 'service_role' block these functions
-- ============================================================================

-- ========================================
-- FIX ALLIANCE INSERT POLICY
-- ========================================
-- The current policy uses auth.role() = 'service_role', which doesn't work
-- for SECURITY DEFINER functions (they run as postgres, not service_role).
-- We need to use the same pattern as cirrus: FOR ALL TO service_role with WITH CHECK true
-- OR use a pattern that allows postgres role.

DROP POLICY IF EXISTS "Service role can insert Alliance data" ON public.alliance;

-- Use the same pattern as cirrus: FOR ALL TO service_role (but this won't work for SECURITY DEFINER)
-- Actually, SECURITY DEFINER functions should bypass RLS, but Supabase might handle this differently.
-- Let's use a policy that allows both service_role AND postgres (function owner).
-- Since we can't easily check current_user in WITH CHECK, we'll use FOR ALL and grant to both roles.
-- Actually, let's try a simpler approach: allow service_role OR check if it's the function owner.

-- Policy that allows service_role OR postgres role to insert
-- Note: SECURITY DEFINER functions run as function owner (postgres), so we need to allow postgres
-- Since TO clause only accepts one role, we use TO PUBLIC and check in WITH CHECK
-- SECURITY DEFINER functions run as postgres, which should bypass RLS, but Supabase may handle differently
-- So we allow both service_role (from auth.role()) and postgres (from current_user)
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
-- Cirrus policy uses TO service_role, but SECURITY DEFINER functions run as postgres.
-- Let's update it to also allow postgres role for consistency and reliability.

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
-- Check that policies are updated correctly
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

