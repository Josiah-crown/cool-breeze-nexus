-- Fix Missing RLS Policies
-- This script verifies and creates missing RLS policies for tables showing "Unrestricted"
-- Run this in Supabase SQL Editor

-- ========================================
-- STEP 1: Verify Current Status
-- ========================================

-- Check which tables have RLS enabled but no policies
SELECT 
  t.tablename,
  t.rowsecurity as rls_enabled,
  COALESCE(p.policy_count, 0) as policy_count,
  CASE 
    WHEN t.rowsecurity AND COALESCE(p.policy_count, 0) = 0 THEN '⚠️ NEEDS POLICIES'
    WHEN t.rowsecurity AND COALESCE(p.policy_count, 0) > 0 THEN '✅ OK'
    ELSE '❌ RLS DISABLED'
  END as status
FROM pg_tables t
LEFT JOIN (
  SELECT tablename, COUNT(*) as policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  GROUP BY tablename
) p ON t.tablename = p.tablename
WHERE t.schemaname = 'public'
AND t.tablename IN (
  'profiles',
  'user_roles',
  'client_admin_assignments',
  'installer_company_assignments',
  'machines'
)
ORDER BY t.tablename;

-- ========================================
-- STEP 2: Ensure RLS is Enabled
-- ========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_admin_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installer_company_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 3: Recreate Policies (Safe - Uses IF NOT EXISTS pattern)
-- ========================================

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
CREATE POLICY "Super admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Installers can view their clients' profiles" ON public.profiles;
CREATE POLICY "Installers can view their clients' profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'installer') AND id IN (
    SELECT client_id FROM public.client_admin_assignments WHERE admin_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Companies can view their installers' and clients' profiles" ON public.profiles;
CREATE POLICY "Companies can view their installers' and clients' profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'company') AND (
    id IN (SELECT installer_id FROM public.installer_company_assignments WHERE company_id = auth.uid())
    OR id IN (
      SELECT client_id FROM public.client_admin_assignments 
      WHERE admin_id IN (SELECT installer_id FROM public.installer_company_assignments WHERE company_id = auth.uid())
    )
  ));

DROP POLICY IF EXISTS "Super admins can insert profiles" ON public.profiles;
CREATE POLICY "Super admins can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Installers can insert client profiles" ON public.profiles;
CREATE POLICY "Installers can insert client profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'installer'));

DROP POLICY IF EXISTS "Companies can insert installer and client profiles" ON public.profiles;
CREATE POLICY "Companies can insert installer and client profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'company'));

DROP POLICY IF EXISTS "Super admins can update all profiles" ON public.profiles;
CREATE POLICY "Super admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- USER_ROLES POLICIES
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Super admins can view all roles" ON public.user_roles;
CREATE POLICY "Super admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Installers can view their clients' roles" ON public.user_roles;
CREATE POLICY "Installers can view their clients' roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'installer') AND user_id IN (
    SELECT client_id FROM public.client_admin_assignments WHERE admin_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Companies can view their installers' and clients' roles" ON public.user_roles;
CREATE POLICY "Companies can view their installers' and clients' roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'company') AND (
    user_id IN (SELECT installer_id FROM public.installer_company_assignments WHERE company_id = auth.uid())
    OR user_id IN (
      SELECT client_id FROM public.client_admin_assignments 
      WHERE admin_id IN (SELECT installer_id FROM public.installer_company_assignments WHERE company_id = auth.uid())
    )
  ));

DROP POLICY IF EXISTS "Super admins can insert roles" ON public.user_roles;
CREATE POLICY "Super admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Installers can insert client roles" ON public.user_roles;
CREATE POLICY "Installers can insert client roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'installer') AND role = 'client'::app_role);

DROP POLICY IF EXISTS "Companies can insert installer and client roles" ON public.user_roles;
CREATE POLICY "Companies can insert installer and client roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'company') AND (role = 'installer'::app_role OR role = 'client'::app_role));

-- CLIENT_ADMIN_ASSIGNMENTS POLICIES
DROP POLICY IF EXISTS "Super admins can view all assignments" ON public.client_admin_assignments;
CREATE POLICY "Super admins can view all assignments"
  ON public.client_admin_assignments FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Installers can view their assignments" ON public.client_admin_assignments;
CREATE POLICY "Installers can view their assignments"
  ON public.client_admin_assignments FOR SELECT
  USING (admin_id = auth.uid());

DROP POLICY IF EXISTS "Clients can view their assignment" ON public.client_admin_assignments;
CREATE POLICY "Clients can view their assignment"
  ON public.client_admin_assignments FOR SELECT
  USING (client_id = auth.uid());

DROP POLICY IF EXISTS "Companies can view their installers' assignments" ON public.client_admin_assignments;
CREATE POLICY "Companies can view their installers' assignments"
  ON public.client_admin_assignments FOR SELECT
  USING (public.has_role(auth.uid(), 'company') AND admin_id IN (
    SELECT installer_id FROM public.installer_company_assignments WHERE company_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Super admins can manage assignments" ON public.client_admin_assignments;
CREATE POLICY "Super admins can manage assignments"
  ON public.client_admin_assignments FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Installers can create assignments for their clients" ON public.client_admin_assignments;
CREATE POLICY "Installers can create assignments for their clients"
  ON public.client_admin_assignments FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'installer') AND admin_id = auth.uid());

-- INSTALLER_COMPANY_ASSIGNMENTS POLICIES
DROP POLICY IF EXISTS "Companies can view their assignments" ON public.installer_company_assignments;
CREATE POLICY "Companies can view their assignments"
  ON public.installer_company_assignments FOR SELECT
  USING (company_id = auth.uid());

DROP POLICY IF EXISTS "Installers can view their assignment" ON public.installer_company_assignments;
CREATE POLICY "Installers can view their assignment"
  ON public.installer_company_assignments FOR SELECT
  USING (installer_id = auth.uid());

DROP POLICY IF EXISTS "Super admins can view all installer assignments" ON public.installer_company_assignments;
CREATE POLICY "Super admins can view all installer assignments"
  ON public.installer_company_assignments FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Companies can create assignments for their installers" ON public.installer_company_assignments;
CREATE POLICY "Companies can create assignments for their installers"
  ON public.installer_company_assignments FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'company') AND company_id = auth.uid());

DROP POLICY IF EXISTS "Super admins can manage installer assignments" ON public.installer_company_assignments;
CREATE POLICY "Super admins can manage installer assignments"
  ON public.installer_company_assignments FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

-- MACHINES POLICIES (Comprehensive - includes all role types)
DROP POLICY IF EXISTS "Users can view their own machines" ON public.machines;
CREATE POLICY "Users can view their own machines"
  ON public.machines FOR SELECT
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Super admins can view all machines" ON public.machines;
CREATE POLICY "Super admins can view all machines"
  ON public.machines FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Installers can view their own machines" ON public.machines;
CREATE POLICY "Installers can view their own machines"
  ON public.machines FOR SELECT
  USING (public.has_role(auth.uid(), 'installer') AND owner_id = auth.uid());

DROP POLICY IF EXISTS "Installers can view their clients' machines" ON public.machines;
CREATE POLICY "Installers can view their clients' machines"
  ON public.machines FOR SELECT
  USING (public.has_role(auth.uid(), 'installer') AND owner_id IN (
    SELECT client_id FROM public.client_admin_assignments WHERE admin_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Companies can view their own machines" ON public.machines;
CREATE POLICY "Companies can view their own machines"
  ON public.machines FOR SELECT
  USING (public.has_role(auth.uid(), 'company') AND owner_id = auth.uid());

DROP POLICY IF EXISTS "Companies can view their installers' and clients' machines" ON public.machines;
CREATE POLICY "Companies can view their installers' and clients' machines"
  ON public.machines FOR SELECT
  USING (public.has_role(auth.uid(), 'company') AND (
    owner_id IN (SELECT installer_id FROM public.installer_company_assignments WHERE company_id = auth.uid())
    OR owner_id IN (
      SELECT client_id FROM public.client_admin_assignments 
      WHERE admin_id IN (SELECT installer_id FROM public.installer_company_assignments WHERE company_id = auth.uid())
    )
  ));

DROP POLICY IF EXISTS "Super admins can insert machines" ON public.machines;
CREATE POLICY "Super admins can insert machines"
  ON public.machines FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Installers can insert machines" ON public.machines;
CREATE POLICY "Installers can insert machines"
  ON public.machines FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'installer'));

DROP POLICY IF EXISTS "Companies can insert machines" ON public.machines;
CREATE POLICY "Companies can insert machines"
  ON public.machines FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'company'));

DROP POLICY IF EXISTS "Super admins can update machines" ON public.machines;
CREATE POLICY "Super admins can update machines"
  ON public.machines FOR UPDATE
  USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Machine owners can update their machines" ON public.machines;
CREATE POLICY "Machine owners can update their machines"
  ON public.machines FOR UPDATE
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Installers can update their own and clients' machines" ON public.machines;
CREATE POLICY "Installers can update their own and clients' machines"
  ON public.machines FOR UPDATE
  USING (public.has_role(auth.uid(), 'installer') AND (
    owner_id = auth.uid() OR owner_id IN (
      SELECT client_id FROM public.client_admin_assignments WHERE admin_id = auth.uid()
    )
  ));

DROP POLICY IF EXISTS "Companies can update their own and hierarchy machines" ON public.machines;
CREATE POLICY "Companies can update their own and hierarchy machines"
  ON public.machines FOR UPDATE
  USING (public.has_role(auth.uid(), 'company') AND (
    owner_id = auth.uid() 
    OR owner_id IN (SELECT installer_id FROM public.installer_company_assignments WHERE company_id = auth.uid())
    OR owner_id IN (
      SELECT client_id FROM public.client_admin_assignments 
      WHERE admin_id IN (SELECT installer_id FROM public.installer_company_assignments WHERE company_id = auth.uid())
    )
  ));

DROP POLICY IF EXISTS "Machines can update via API" ON public.machines;
CREATE POLICY "Machines can update via API"
  ON public.machines FOR UPDATE
  USING (true); -- This allows API key updates (needed for ESP32)

DROP POLICY IF EXISTS "Super admins can delete machines" ON public.machines;
CREATE POLICY "Super admins can delete machines"
  ON public.machines FOR DELETE
  USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Machine owners can delete their machines" ON public.machines;
CREATE POLICY "Machine owners can delete their machines"
  ON public.machines FOR DELETE
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Installers can delete their own and clients' machines" ON public.machines;
CREATE POLICY "Installers can delete their own and clients' machines"
  ON public.machines FOR DELETE
  USING (public.has_role(auth.uid(), 'installer') AND (
    owner_id = auth.uid() OR owner_id IN (
      SELECT client_id FROM public.client_admin_assignments WHERE admin_id = auth.uid()
    )
  ));

DROP POLICY IF EXISTS "Companies can delete their own and hierarchy machines" ON public.machines;
CREATE POLICY "Companies can delete their own and hierarchy machines"
  ON public.machines FOR DELETE
  USING (public.has_role(auth.uid(), 'company') AND (
    owner_id = auth.uid() 
    OR owner_id IN (SELECT installer_id FROM public.installer_company_assignments WHERE company_id = auth.uid())
    OR owner_id IN (
      SELECT client_id FROM public.client_admin_assignments 
      WHERE admin_id IN (SELECT installer_id FROM public.installer_company_assignments WHERE company_id = auth.uid())
    )
  ));

-- ========================================
-- STEP 4: Verify Policies Were Created
-- ========================================

SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
  'profiles',
  'user_roles',
  'client_admin_assignments',
  'installer_company_assignments',
  'machines'
)
GROUP BY tablename
ORDER BY tablename;

