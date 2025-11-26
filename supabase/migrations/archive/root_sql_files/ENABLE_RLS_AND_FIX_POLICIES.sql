-- ENABLE RLS AND FIX POLICIES
-- Based on verification: RLS is DISABLED on critical tables
-- This script will enable RLS and ensure all policies exist
-- Run this in Supabase SQL Editor

-- ========================================
-- STEP 1: Enable RLS on All Tables
-- ========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_admin_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installer_company_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 2: Create/Recreate Policies for PROFILES
-- ========================================

-- Drop existing policies if they exist (safe to run multiple times)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Installers can view their clients' profiles" ON public.profiles;
DROP POLICY IF EXISTS "Companies can view their installers' and clients' profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Installers can insert client profiles" ON public.profiles;
DROP POLICY IF EXISTS "Companies can insert installer and client profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Installers can delete their clients' profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;

-- SELECT policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Super admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Installers can view their clients' profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'installer') AND id IN (
    SELECT client_id FROM public.client_admin_assignments WHERE admin_id = auth.uid()
  ));

CREATE POLICY "Companies can view their installers' and clients' profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'company') AND (
    id IN (SELECT installer_id FROM public.installer_company_assignments WHERE company_id = auth.uid())
    OR id IN (
      SELECT client_id FROM public.client_admin_assignments 
      WHERE admin_id IN (SELECT installer_id FROM public.installer_company_assignments WHERE company_id = auth.uid())
    )
  ));

-- INSERT policies
CREATE POLICY "Super admins can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Installers can insert client profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'installer'));

CREATE POLICY "Companies can insert installer and client profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'company'));

-- UPDATE policies
CREATE POLICY "Super admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- DELETE policies
CREATE POLICY "Super admins can delete profiles"
  ON public.profiles FOR DELETE
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Installers can delete their clients' profiles"
  ON public.profiles FOR DELETE
  USING (public.has_role(auth.uid(), 'installer') AND id IN (
    SELECT client_id FROM public.client_admin_assignments WHERE admin_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own profile"
  ON public.profiles FOR DELETE
  USING (id = auth.uid());

-- ========================================
-- STEP 3: Create/Recreate Policies for USER_ROLES
-- ========================================

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Installers can view their clients' roles" ON public.user_roles;
DROP POLICY IF EXISTS "Companies can view their installers' and clients' roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Installers can insert client roles" ON public.user_roles;
DROP POLICY IF EXISTS "Companies can insert installer and client roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Installers can delete their clients' roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can delete their own role" ON public.user_roles;

-- SELECT policies
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Super admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Installers can view their clients' roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'installer') AND user_id IN (
    SELECT client_id FROM public.client_admin_assignments WHERE admin_id = auth.uid()
  ));

CREATE POLICY "Companies can view their installers' and clients' roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'company') AND (
    user_id IN (SELECT installer_id FROM public.installer_company_assignments WHERE company_id = auth.uid())
    OR user_id IN (
      SELECT client_id FROM public.client_admin_assignments 
      WHERE admin_id IN (SELECT installer_id FROM public.installer_company_assignments WHERE company_id = auth.uid())
    )
  ));

-- INSERT policies
CREATE POLICY "Super admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Installers can insert client roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'installer') AND role = 'client'::app_role);

CREATE POLICY "Companies can insert installer and client roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'company') AND (role = 'installer'::app_role OR role = 'client'::app_role));

-- DELETE policies
CREATE POLICY "Super admins can delete roles"
  ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Installers can delete their clients' roles"
  ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), 'installer') AND user_id IN (
    SELECT client_id FROM public.client_admin_assignments WHERE admin_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own role"
  ON public.user_roles FOR DELETE
  USING (user_id = auth.uid());

-- ========================================
-- STEP 4: Create/Recreate Policies for CLIENT_ADMIN_ASSIGNMENTS
-- ========================================

DROP POLICY IF EXISTS "Super admins can view all assignments" ON public.client_admin_assignments;
DROP POLICY IF EXISTS "Installers can view their assignments" ON public.client_admin_assignments;
DROP POLICY IF EXISTS "Clients can view their assignment" ON public.client_admin_assignments;
DROP POLICY IF EXISTS "Companies can view their installers' assignments" ON public.client_admin_assignments;
DROP POLICY IF EXISTS "Super admins can manage assignments" ON public.client_admin_assignments;
DROP POLICY IF EXISTS "Installers can create assignments for their clients" ON public.client_admin_assignments;

-- SELECT policies
CREATE POLICY "Super admins can view all assignments"
  ON public.client_admin_assignments FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Installers can view their assignments"
  ON public.client_admin_assignments FOR SELECT
  USING (admin_id = auth.uid());

CREATE POLICY "Clients can view their assignment"
  ON public.client_admin_assignments FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "Companies can view their installers' assignments"
  ON public.client_admin_assignments FOR SELECT
  USING (public.has_role(auth.uid(), 'company') AND admin_id IN (
    SELECT installer_id FROM public.installer_company_assignments WHERE company_id = auth.uid()
  ));

-- ALL policies (for super admins)
CREATE POLICY "Super admins can manage assignments"
  ON public.client_admin_assignments FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

-- INSERT policies
CREATE POLICY "Installers can create assignments for their clients"
  ON public.client_admin_assignments FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'installer') AND admin_id = auth.uid());

-- ========================================
-- STEP 5: Create/Recreate Policies for INSTALLER_COMPANY_ASSIGNMENTS
-- ========================================

DROP POLICY IF EXISTS "Companies can view their assignments" ON public.installer_company_assignments;
DROP POLICY IF EXISTS "Installers can view their assignment" ON public.installer_company_assignments;
DROP POLICY IF EXISTS "Super admins can view all installer assignments" ON public.installer_company_assignments;
DROP POLICY IF EXISTS "Companies can create assignments for their installers" ON public.installer_company_assignments;
DROP POLICY IF EXISTS "Super admins can manage installer assignments" ON public.installer_company_assignments;

-- SELECT policies
CREATE POLICY "Companies can view their assignments"
  ON public.installer_company_assignments FOR SELECT
  USING (company_id = auth.uid());

CREATE POLICY "Installers can view their assignment"
  ON public.installer_company_assignments FOR SELECT
  USING (installer_id = auth.uid());

CREATE POLICY "Super admins can view all installer assignments"
  ON public.installer_company_assignments FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

-- INSERT policies
CREATE POLICY "Companies can create assignments for their installers"
  ON public.installer_company_assignments FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'company') AND company_id = auth.uid());

-- ALL policies (for super admins)
CREATE POLICY "Super admins can manage installer assignments"
  ON public.installer_company_assignments FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

-- ========================================
-- STEP 6: Create/Recreate Policies for MACHINES
-- ========================================

DROP POLICY IF EXISTS "Users can view their own machines" ON public.machines;
DROP POLICY IF EXISTS "Super admins can view all machines" ON public.machines;
DROP POLICY IF EXISTS "Installers can view their own machines" ON public.machines;
DROP POLICY IF EXISTS "Installers can view their clients' machines" ON public.machines;
DROP POLICY IF EXISTS "Companies can view their own machines" ON public.machines;
DROP POLICY IF EXISTS "Companies can view their installers' and clients' machines" ON public.machines;
DROP POLICY IF EXISTS "Super admins can insert machines" ON public.machines;
DROP POLICY IF EXISTS "Installers can insert machines" ON public.machines;
DROP POLICY IF EXISTS "Companies can insert machines" ON public.machines;
DROP POLICY IF EXISTS "Super admins can update machines" ON public.machines;
DROP POLICY IF EXISTS "Machine owners can update their machines" ON public.machines;
DROP POLICY IF EXISTS "Installers can update their own and clients' machines" ON public.machines;
DROP POLICY IF EXISTS "Companies can update their own and hierarchy machines" ON public.machines;
DROP POLICY IF EXISTS "Machines can update via API" ON public.machines;
DROP POLICY IF EXISTS "Super admins can delete machines" ON public.machines;
DROP POLICY IF EXISTS "Machine owners can delete their machines" ON public.machines;
DROP POLICY IF EXISTS "Installers can delete their own and clients' machines" ON public.machines;
DROP POLICY IF EXISTS "Companies can delete their own and hierarchy machines" ON public.machines;

-- SELECT policies
CREATE POLICY "Users can view their own machines"
  ON public.machines FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Super admins can view all machines"
  ON public.machines FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Installers can view their own machines"
  ON public.machines FOR SELECT
  USING (public.has_role(auth.uid(), 'installer') AND owner_id = auth.uid());

CREATE POLICY "Installers can view their clients' machines"
  ON public.machines FOR SELECT
  USING (public.has_role(auth.uid(), 'installer') AND owner_id IN (
    SELECT client_id FROM public.client_admin_assignments WHERE admin_id = auth.uid()
  ));

CREATE POLICY "Companies can view their own machines"
  ON public.machines FOR SELECT
  USING (public.has_role(auth.uid(), 'company') AND owner_id = auth.uid());

CREATE POLICY "Companies can view their installers' and clients' machines"
  ON public.machines FOR SELECT
  USING (public.has_role(auth.uid(), 'company') AND (
    owner_id IN (SELECT installer_id FROM public.installer_company_assignments WHERE company_id = auth.uid())
    OR owner_id IN (
      SELECT client_id FROM public.client_admin_assignments 
      WHERE admin_id IN (SELECT installer_id FROM public.installer_company_assignments WHERE company_id = auth.uid())
    )
  ));

-- INSERT policies
CREATE POLICY "Super admins can insert machines"
  ON public.machines FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Installers can insert machines"
  ON public.machines FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'installer'));

CREATE POLICY "Companies can insert machines"
  ON public.machines FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'company'));

-- UPDATE policies
CREATE POLICY "Super admins can update machines"
  ON public.machines FOR UPDATE
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Machine owners can update their machines"
  ON public.machines FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Installers can update their own and clients' machines"
  ON public.machines FOR UPDATE
  USING (public.has_role(auth.uid(), 'installer') AND (
    owner_id = auth.uid() OR owner_id IN (
      SELECT client_id FROM public.client_admin_assignments WHERE admin_id = auth.uid()
    )
  ));

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

-- Allow API key updates (needed for ESP32 devices)
CREATE POLICY "Machines can update via API"
  ON public.machines FOR UPDATE
  USING (true);

-- DELETE policies
CREATE POLICY "Super admins can delete machines"
  ON public.machines FOR DELETE
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Machine owners can delete their machines"
  ON public.machines FOR DELETE
  USING (owner_id = auth.uid());

CREATE POLICY "Installers can delete their own and clients' machines"
  ON public.machines FOR DELETE
  USING (public.has_role(auth.uid(), 'installer') AND (
    owner_id = auth.uid() OR owner_id IN (
      SELECT client_id FROM public.client_admin_assignments WHERE admin_id = auth.uid()
    )
  ));

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
-- STEP 7: Verify Everything Was Fixed
-- ========================================

SELECT 
  t.tablename,
  t.rowsecurity as rls_enabled,
  COALESCE(p.policy_count, 0) as policy_count,
  CASE 
    WHEN NOT t.rowsecurity THEN '❌ RLS DISABLED - INSECURE'
    WHEN t.rowsecurity AND COALESCE(p.policy_count, 0) = 0 THEN '⚠️ RLS ENABLED BUT NO POLICIES - INSECURE'
    WHEN t.rowsecurity AND COALESCE(p.policy_count, 0) > 0 THEN '✅ RLS ENABLED WITH POLICIES - Secure'
    ELSE '❓ UNKNOWN'
  END as security_status
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

