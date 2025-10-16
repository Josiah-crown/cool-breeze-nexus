-- Step 2: Create installer_company_assignments table and update all policies

-- Create a new table for installer-company assignments
CREATE TABLE IF NOT EXISTS public.installer_company_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  installer_id uuid NOT NULL,
  company_id uuid NOT NULL,
  assigned_by uuid,
  assigned_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on the new table
ALTER TABLE public.installer_company_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for installer_company_assignments
CREATE POLICY "Companies can view their assignments"
  ON public.installer_company_assignments
  FOR SELECT
  USING (company_id = auth.uid());

CREATE POLICY "Installers can view their assignment"
  ON public.installer_company_assignments
  FOR SELECT
  USING (installer_id = auth.uid());

CREATE POLICY "Companies can create assignments for their installers"
  ON public.installer_company_assignments
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'company'::app_role) AND company_id = auth.uid());

CREATE POLICY "Super admins can manage installer assignments"
  ON public.installer_company_assignments
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can view all installer assignments"
  ON public.installer_company_assignments
  FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Update existing RLS policies to use 'installer' instead of 'admin'
-- Drop and recreate policies on client_admin_assignments
DROP POLICY IF EXISTS "Admins can create assignments for their clients" ON public.client_admin_assignments;
DROP POLICY IF EXISTS "Admins can view their assignments" ON public.client_admin_assignments;

CREATE POLICY "Installers can create assignments for their clients"
  ON public.client_admin_assignments
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'installer'::app_role) AND admin_id = auth.uid());

CREATE POLICY "Installers can view their assignments"
  ON public.client_admin_assignments
  FOR SELECT
  USING (admin_id = auth.uid());

CREATE POLICY "Companies can view their installers' assignments"
  ON public.client_admin_assignments
  FOR SELECT
  USING (has_role(auth.uid(), 'company'::app_role) AND admin_id IN (
    SELECT installer_id FROM public.installer_company_assignments WHERE company_id = auth.uid()
  ));

-- Drop and recreate policies on machines
DROP POLICY IF EXISTS "Admins can view their own machines" ON public.machines;
DROP POLICY IF EXISTS "Admins can view their clients' machines" ON public.machines;
DROP POLICY IF EXISTS "Admins can insert machines" ON public.machines;
DROP POLICY IF EXISTS "Admins can update their own and clients' machines" ON public.machines;
DROP POLICY IF EXISTS "Admins can delete their own and clients' machines" ON public.machines;

CREATE POLICY "Installers can view their own machines"
  ON public.machines
  FOR SELECT
  USING (has_role(auth.uid(), 'installer'::app_role) AND owner_id = auth.uid());

CREATE POLICY "Installers can view their clients' machines"
  ON public.machines
  FOR SELECT
  USING (has_role(auth.uid(), 'installer'::app_role) AND owner_id IN (
    SELECT client_id FROM public.client_admin_assignments WHERE admin_id = auth.uid()
  ));

CREATE POLICY "Installers can insert machines"
  ON public.machines
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'installer'::app_role));

CREATE POLICY "Installers can update their own and clients' machines"
  ON public.machines
  FOR UPDATE
  USING (has_role(auth.uid(), 'installer'::app_role) AND (
    owner_id = auth.uid() OR owner_id IN (
      SELECT client_id FROM public.client_admin_assignments WHERE admin_id = auth.uid()
    )
  ));

CREATE POLICY "Installers can delete their own and clients' machines"
  ON public.machines
  FOR DELETE
  USING (has_role(auth.uid(), 'installer'::app_role) AND (
    owner_id = auth.uid() OR owner_id IN (
      SELECT client_id FROM public.client_admin_assignments WHERE admin_id = auth.uid()
    )
  ));

-- Add policies for companies on machines
CREATE POLICY "Companies can view their own machines"
  ON public.machines
  FOR SELECT
  USING (has_role(auth.uid(), 'company'::app_role) AND owner_id = auth.uid());

CREATE POLICY "Companies can view their installers' and clients' machines"
  ON public.machines
  FOR SELECT
  USING (has_role(auth.uid(), 'company'::app_role) AND (
    owner_id IN (SELECT installer_id FROM public.installer_company_assignments WHERE company_id = auth.uid())
    OR owner_id IN (
      SELECT client_id FROM public.client_admin_assignments 
      WHERE admin_id IN (SELECT installer_id FROM public.installer_company_assignments WHERE company_id = auth.uid())
    )
  ));

CREATE POLICY "Companies can insert machines"
  ON public.machines
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'company'::app_role));

CREATE POLICY "Companies can update their own and hierarchy machines"
  ON public.machines
  FOR UPDATE
  USING (has_role(auth.uid(), 'company'::app_role) AND (
    owner_id = auth.uid() 
    OR owner_id IN (SELECT installer_id FROM public.installer_company_assignments WHERE company_id = auth.uid())
    OR owner_id IN (
      SELECT client_id FROM public.client_admin_assignments 
      WHERE admin_id IN (SELECT installer_id FROM public.installer_company_assignments WHERE company_id = auth.uid())
    )
  ));

CREATE POLICY "Companies can delete their own and hierarchy machines"
  ON public.machines
  FOR DELETE
  USING (has_role(auth.uid(), 'company'::app_role) AND (
    owner_id = auth.uid() 
    OR owner_id IN (SELECT installer_id FROM public.installer_company_assignments WHERE company_id = auth.uid())
    OR owner_id IN (
      SELECT client_id FROM public.client_admin_assignments 
      WHERE admin_id IN (SELECT installer_id FROM public.installer_company_assignments WHERE company_id = auth.uid())
    )
  ));

-- Drop and recreate policies on profiles
DROP POLICY IF EXISTS "Admins can view their clients' profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert client profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete their clients' profiles" ON public.profiles;

CREATE POLICY "Installers can view their clients' profiles"
  ON public.profiles
  FOR SELECT
  USING (has_role(auth.uid(), 'installer'::app_role) AND id IN (
    SELECT client_id FROM public.client_admin_assignments WHERE admin_id = auth.uid()
  ));

CREATE POLICY "Installers can insert client profiles"
  ON public.profiles
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'installer'::app_role));

CREATE POLICY "Installers can delete their clients' profiles"
  ON public.profiles
  FOR DELETE
  USING (has_role(auth.uid(), 'installer'::app_role) AND id IN (
    SELECT client_id FROM public.client_admin_assignments WHERE admin_id = auth.uid()
  ));

-- Add policies for companies on profiles
CREATE POLICY "Companies can view their installers' and clients' profiles"
  ON public.profiles
  FOR SELECT
  USING (has_role(auth.uid(), 'company'::app_role) AND (
    id IN (SELECT installer_id FROM public.installer_company_assignments WHERE company_id = auth.uid())
    OR id IN (
      SELECT client_id FROM public.client_admin_assignments 
      WHERE admin_id IN (SELECT installer_id FROM public.installer_company_assignments WHERE company_id = auth.uid())
    )
  ));

CREATE POLICY "Companies can insert installer and client profiles"
  ON public.profiles
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'company'::app_role));

CREATE POLICY "Companies can delete their installers' and clients' profiles"
  ON public.profiles
  FOR DELETE
  USING (has_role(auth.uid(), 'company'::app_role) AND (
    id IN (SELECT installer_id FROM public.installer_company_assignments WHERE company_id = auth.uid())
    OR id IN (
      SELECT client_id FROM public.client_admin_assignments 
      WHERE admin_id IN (SELECT installer_id FROM public.installer_company_assignments WHERE company_id = auth.uid())
    )
  ));

-- Drop and recreate policies on user_roles
DROP POLICY IF EXISTS "Admins can view their clients' roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert client roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete their clients' roles" ON public.user_roles;

CREATE POLICY "Installers can view their clients' roles"
  ON public.user_roles
  FOR SELECT
  USING (has_role(auth.uid(), 'installer'::app_role) AND user_id IN (
    SELECT client_id FROM public.client_admin_assignments WHERE admin_id = auth.uid()
  ));

CREATE POLICY "Installers can insert client roles"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'installer'::app_role) AND role = 'client'::app_role);

CREATE POLICY "Installers can delete their clients' roles"
  ON public.user_roles
  FOR DELETE
  USING (has_role(auth.uid(), 'installer'::app_role) AND user_id IN (
    SELECT client_id FROM public.client_admin_assignments WHERE admin_id = auth.uid()
  ));

-- Add policies for companies on user_roles
CREATE POLICY "Companies can view their installers' and clients' roles"
  ON public.user_roles
  FOR SELECT
  USING (has_role(auth.uid(), 'company'::app_role) AND (
    user_id IN (SELECT installer_id FROM public.installer_company_assignments WHERE company_id = auth.uid())
    OR user_id IN (
      SELECT client_id FROM public.client_admin_assignments 
      WHERE admin_id IN (SELECT installer_id FROM public.installer_company_assignments WHERE company_id = auth.uid())
    )
  ));

CREATE POLICY "Companies can insert installer and client roles"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'company'::app_role) AND (role = 'installer'::app_role OR role = 'client'::app_role));

CREATE POLICY "Companies can delete their installers' and clients' roles"
  ON public.user_roles
  FOR DELETE
  USING (has_role(auth.uid(), 'company'::app_role) AND (
    user_id IN (SELECT installer_id FROM public.installer_company_assignments WHERE company_id = auth.uid())
    OR user_id IN (
      SELECT client_id FROM public.client_admin_assignments 
      WHERE admin_id IN (SELECT installer_id FROM public.installer_company_assignments WHERE company_id = auth.uid())
    )
  ));

-- Create helper function to get user's company
CREATE OR REPLACE FUNCTION public.get_user_company(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM public.installer_company_assignments
  WHERE installer_id = _user_id
$$;