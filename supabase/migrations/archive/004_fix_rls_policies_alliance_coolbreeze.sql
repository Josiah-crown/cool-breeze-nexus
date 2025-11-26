-- ========================================
-- FIX RLS POLICIES FOR ALLIANCE AND COOLBREEZE
-- ========================================
-- Purpose: Copy the exact same RLS policies from cirrus (which works) to alliance and coolbreeze
-- Date: 2025-11-25
-- ========================================

-- ========================================
-- STEP 0: LIST ALL EXISTING POLICIES (for reference)
-- ========================================
-- This shows what policies currently exist before we drop them

SELECT 
  'Existing Alliance Policies' as check_type,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'alliance'
ORDER BY policyname;

SELECT 
  'Existing CoolBreeze Policies' as check_type,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'coolbreeze'
ORDER BY policyname;

SELECT 
  'Existing Alliance Raw Policies' as check_type,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'alliance_raw'
ORDER BY policyname;

-- ========================================
-- STEP 1: DROP ALL EXISTING POLICIES
-- ========================================
-- Drop ALL policies for these tables (using dynamic SQL to catch any we missed)
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  -- Drop all policies for alliance table
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'alliance'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.alliance', policy_record.policyname);
  END LOOP;
  
  -- Drop all policies for coolbreeze table
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'coolbreeze'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.coolbreeze', policy_record.policyname);
  END LOOP;
  
  -- Drop all policies for alliance_raw table
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'alliance_raw'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.alliance_raw', policy_record.policyname);
  END LOOP;
END $$;

-- Also drop specific known policy names (in case dynamic drop missed any)
-- Drop ALL possible policy names for alliance table
DROP POLICY IF EXISTS "Users can view alliance for their machines" ON public.alliance;
DROP POLICY IF EXISTS "Users can view Alliance data for accessible machines" ON public.alliance;
DROP POLICY IF EXISTS "Super admins can view all alliance" ON public.alliance;
DROP POLICY IF EXISTS "Users can view their own alliance data" ON public.alliance;
DROP POLICY IF EXISTS "Service role can insert alliance" ON public.alliance;
DROP POLICY IF EXISTS "Service role can update alliance" ON public.alliance;
DROP POLICY IF EXISTS "Service role can insert Alliance data" ON public.alliance;
DROP POLICY IF EXISTS "Service role can update Alliance data" ON public.alliance;
DROP POLICY IF EXISTS "Service role can insert Alliance" ON public.alliance;
DROP POLICY IF EXISTS "Service role can update Alliance" ON public.alliance;
DROP POLICY IF EXISTS "All authenticated users can view alliance" ON public.alliance;
DROP POLICY IF EXISTS "TEST: All authenticated users can view alliance" ON public.alliance;

-- Drop ALL possible policy names for coolbreeze table
DROP POLICY IF EXISTS "Users can view coolbreeze for their machines" ON public.coolbreeze;
DROP POLICY IF EXISTS "Users can view CoolBreeze data for accessible machines" ON public.coolbreeze;
DROP POLICY IF EXISTS "Super admins can view all coolbreeze" ON public.coolbreeze;
DROP POLICY IF EXISTS "Users can view their own coolbreeze data" ON public.coolbreeze;
DROP POLICY IF EXISTS "Service role can insert coolbreeze" ON public.coolbreeze;
DROP POLICY IF EXISTS "Service role can update coolbreeze" ON public.coolbreeze;
DROP POLICY IF EXISTS "Service role can insert CoolBreeze data" ON public.coolbreeze;
DROP POLICY IF EXISTS "Service role can update CoolBreeze data" ON public.coolbreeze;
DROP POLICY IF EXISTS "Service role can insert CoolBreeze" ON public.coolbreeze;
DROP POLICY IF EXISTS "Service role can update CoolBreeze" ON public.coolbreeze;
DROP POLICY IF EXISTS "Users can view CoolBreeze data for accessible machines" ON public.coolbreeze;
DROP POLICY IF EXISTS "All authenticated users can view coolbreeze" ON public.coolbreeze;
DROP POLICY IF EXISTS "TEST: All authenticated users can view coolbreeze" ON public.coolbreeze;
DROP POLICY IF EXISTS "Service role can insert CoolBreeze data" ON public.coolbreeze;
DROP POLICY IF EXISTS "Service role can update CoolBreeze data" ON public.coolbreeze;

-- Drop ALL possible policy names for alliance_raw table
DROP POLICY IF EXISTS "Users can view alliance_raw for their machines" ON public.alliance_raw;
DROP POLICY IF EXISTS "Users can view Alliance Raw data for accessible machines" ON public.alliance_raw;
DROP POLICY IF EXISTS "Super admins can view all alliance_raw" ON public.alliance_raw;
DROP POLICY IF EXISTS "Users can view their own alliance_raw data" ON public.alliance_raw;
DROP POLICY IF EXISTS "Service role can insert alliance_raw" ON public.alliance_raw;
DROP POLICY IF EXISTS "Service role can insert Alliance Raw data" ON public.alliance_raw;
DROP POLICY IF EXISTS "Service role can insert Alliance Raw" ON public.alliance_raw;
DROP POLICY IF EXISTS "All authenticated users can view alliance_raw" ON public.alliance_raw;
DROP POLICY IF EXISTS "TEST: All authenticated users can view alliance_raw" ON public.alliance_raw;

-- ========================================
-- STEP 2: CREATE ALLIANCE TABLE POLICIES
-- ========================================
-- EXACT COPY OF WORKING CIRRUS POLICY

-- Policy: Users can view Alliance data for machines they own or have access to
CREATE POLICY "Users can view Alliance data for accessible machines"
  ON public.alliance
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = alliance.machine_id
      AND (
        -- Super admin sees all
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'super_admin'
        )
        OR
        -- Machine owner
        m.owner_id = auth.uid()
        OR
        -- Company sees their machines and installer/client machines
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.installer_company_assignments ica ON ica.installer_id = m.owner_id
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'company'
          AND ica.company_id = ur.user_id
        )
        OR
        -- Installer sees their machines and client machines
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          LEFT JOIN public.client_admin_assignments caa ON caa.client_id = m.owner_id
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'installer'
          AND (m.owner_id = ur.user_id OR caa.admin_id = ur.user_id)
        )
      )
    )
  );

-- Policy: Only service role can insert (via trigger)
CREATE POLICY "Service role can insert Alliance data"
  ON public.alliance
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Policy: Only service role can update
CREATE POLICY "Service role can update Alliance data"
  ON public.alliance
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- ========================================
-- STEP 3: CREATE COOLBREEZE TABLE POLICIES
-- ========================================
-- EXACT COPY OF WORKING CIRRUS POLICY

-- Policy: Users can view CoolBreeze data for machines they own or have access to
CREATE POLICY "Users can view CoolBreeze data for accessible machines"
  ON public.coolbreeze
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = coolbreeze.machine_id
      AND (
        -- Super admin sees all
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'super_admin'
        )
        OR
        -- Machine owner
        m.owner_id = auth.uid()
        OR
        -- Company sees their machines and installer/client machines
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.installer_company_assignments ica ON ica.installer_id = m.owner_id
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'company'
          AND ica.company_id = ur.user_id
        )
        OR
        -- Installer sees their machines and client machines
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          LEFT JOIN public.client_admin_assignments caa ON caa.client_id = m.owner_id
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'installer'
          AND (m.owner_id = ur.user_id OR caa.admin_id = ur.user_id)
        )
      )
    )
  );

-- Policy: Only service role can insert (via trigger)
CREATE POLICY "Service role can insert CoolBreeze data"
  ON public.coolbreeze
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Policy: Only service role can update
CREATE POLICY "Service role can update CoolBreeze data"
  ON public.coolbreeze
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- ========================================
-- STEP 4: CREATE ALLIANCE_RAW TABLE POLICIES
-- ========================================
-- EXACT COPY OF WORKING CIRRUS POLICY STRUCTURE

-- Policy: Users can view Alliance Raw data for machines they own or have access to
CREATE POLICY "Users can view Alliance Raw data for accessible machines"
  ON public.alliance_raw
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = alliance_raw.machine_id
      AND (
        -- Super admin sees all
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'super_admin'
        )
        OR
        -- Machine owner
        m.owner_id = auth.uid()
        OR
        -- Company sees their machines and installer/client machines
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.installer_company_assignments ica ON ica.installer_id = m.owner_id
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'company'
          AND ica.company_id = ur.user_id
        )
        OR
        -- Installer sees their machines and client machines
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          LEFT JOIN public.client_admin_assignments caa ON caa.client_id = m.owner_id
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'installer'
          AND (m.owner_id = ur.user_id OR caa.admin_id = ur.user_id)
        )
      )
    )
  );

-- Policy: Only service role can insert (via trigger)
CREATE POLICY "Service role can insert Alliance Raw data"
  ON public.alliance_raw
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ========================================
-- STEP 5: VERIFICATION
-- ========================================

-- Verify Alliance policies
SELECT 
  'Alliance Table' as table_name,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'alliance'
ORDER BY cmd, policyname;

-- Verify CoolBreeze policies
SELECT 
  'CoolBreeze Table' as table_name,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'coolbreeze'
ORDER BY cmd, policyname;

-- Verify Alliance Raw policies
SELECT 
  'Alliance Raw Table' as table_name,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'alliance_raw'
ORDER BY cmd, policyname;
