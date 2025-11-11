-- ========================================
-- COMBINED MIGRATIONS FOR NEW SUPABASE
-- ========================================
-- Apply this entire file in your new Supabase SQL Editor
-- Project: wjyanxstvbiqefmgpccb
-- URL: https://supabase.com/dashboard/project/wjyanxstvbiqefmgpccb/sql
-- ========================================

-- This file combines all 12 migration files in order
-- Simply copy and paste this entire file into the SQL Editor and run it!

-- IMPORTANT: Only run this ONCE on a fresh database!


-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'client');

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  cell_number TEXT NOT NULL,
  country TEXT NOT NULL,
  state TEXT NOT NULL,
  city TEXT NOT NULL,
  street TEXT NOT NULL,
  suburb TEXT NOT NULL,
  po_box TEXT,
  full_name_business TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create client_admin_assignments table for tracking which admin manages which client
CREATE TABLE public.client_admin_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE(client_id)
);

-- Create machines table
CREATE TABLE public.machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('fan', 'heatpump', 'airconditioner')),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  api_endpoint TEXT,
  is_on BOOLEAN NOT NULL DEFAULT false,
  is_connected BOOLEAN NOT NULL DEFAULT false,
  has_water BOOLEAN NOT NULL DEFAULT true,
  is_cooling BOOLEAN NOT NULL DEFAULT false,
  fan_active BOOLEAN NOT NULL DEFAULT false,
  motor_temp NUMERIC NOT NULL DEFAULT 0,
  outside_temp NUMERIC NOT NULL DEFAULT 20,
  inside_temp NUMERIC NOT NULL DEFAULT 20,
  delta_t NUMERIC NOT NULL DEFAULT 0,
  current NUMERIC NOT NULL DEFAULT 0,
  voltage NUMERIC NOT NULL DEFAULT 0,
  power NUMERIC NOT NULL DEFAULT 0,
  overall_status TEXT NOT NULL DEFAULT 'good' CHECK (overall_status IN ('good', 'warning', 'error')),
  motor_status TEXT NOT NULL DEFAULT 'normal' CHECK (motor_status IN ('normal', 'warning', 'critical')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_admin_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Security definer function to get user's admin (for clients)
CREATE OR REPLACE FUNCTION public.get_user_admin(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT admin_id
  FROM public.client_admin_assignments
  WHERE client_id = _user_id
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Super admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can view their clients' profiles"
  ON public.profiles FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') AND
    id IN (SELECT client_id FROM public.client_admin_assignments WHERE admin_id = auth.uid())
  );

CREATE POLICY "Super admins can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can insert client profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Super admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Super admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can view their clients' roles"
  ON public.user_roles FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') AND
    user_id IN (SELECT client_id FROM public.client_admin_assignments WHERE admin_id = auth.uid())
  );

CREATE POLICY "Super admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can insert client roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') AND
    role = 'client'
  );

-- RLS Policies for client_admin_assignments
CREATE POLICY "Super admins can view all assignments"
  ON public.client_admin_assignments FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can view their assignments"
  ON public.client_admin_assignments FOR SELECT
  USING (admin_id = auth.uid());

CREATE POLICY "Clients can view their assignment"
  ON public.client_admin_assignments FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "Super admins can manage assignments"
  ON public.client_admin_assignments FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can create assignments for their clients"
  ON public.client_admin_assignments FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') AND
    admin_id = auth.uid()
  );

-- RLS Policies for machines
CREATE POLICY "Users can view their own machines"
  ON public.machines FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Super admins can view all machines"
  ON public.machines FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can view their clients' machines"
  ON public.machines FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') AND
    owner_id IN (SELECT client_id FROM public.client_admin_assignments WHERE admin_id = auth.uid())
  );

CREATE POLICY "Admins can view their own machines"
  ON public.machines FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') AND
    owner_id = auth.uid()
  );

CREATE POLICY "Super admins can insert machines"
  ON public.machines FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can insert machines"
  ON public.machines FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Super admins can update machines"
  ON public.machines FOR UPDATE
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update their own and clients' machines"
  ON public.machines FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin') AND
    (owner_id = auth.uid() OR owner_id IN (SELECT client_id FROM public.client_admin_assignments WHERE admin_id = auth.uid()))
  );

CREATE POLICY "Machine owners can update their machines"
  ON public.machines FOR UPDATE
  USING (owner_id = auth.uid());

-- Machines can update themselves via API key
CREATE POLICY "Machines can update via API"
  ON public.machines FOR UPDATE
  USING (true);

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_machines_updated_at
  BEFORE UPDATE ON public.machines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
-- Allow users to insert their own profile during signup
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (id = auth.uid());
-- Allow users to insert their own client role at signup (safe: only 'client')
CREATE POLICY "Users can insert their own client role"
ON public.user_roles
FOR INSERT
WITH CHECK (user_id = auth.uid() AND role = 'client'::app_role);
-- Create a super admin account
-- First, get the user ID for josiah145@gmail.com and update their role to super_admin
UPDATE public.user_roles
SET role = 'super_admin'
WHERE user_id IN (
  SELECT id FROM public.profiles WHERE email = 'josiah145@gmail.com'
);
-- Add DELETE policies for machines table

-- Super admins can delete any machine
CREATE POLICY "Super admins can delete machines"
ON public.machines
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Admins can delete their own machines and their clients' machines
CREATE POLICY "Admins can delete their own and clients' machines"
ON public.machines
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND (
    owner_id = auth.uid() 
    OR owner_id IN (
      SELECT client_id 
      FROM client_admin_assignments 
      WHERE admin_id = auth.uid()
    )
  )
);

-- Machine owners can delete their own machines
CREATE POLICY "Owners can delete their own machines"
ON public.machines
FOR DELETE
USING (owner_id = auth.uid());
-- Add DELETE policies for profiles table
CREATE POLICY "Super admins can delete profiles"
ON public.profiles
FOR DELETE
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can delete their clients' profiles"
ON public.profiles
FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin') 
  AND id IN (
    SELECT client_id 
    FROM public.client_admin_assignments 
    WHERE admin_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own profile"
ON public.profiles
FOR DELETE
USING (id = auth.uid());

-- Add DELETE policies for user_roles table
CREATE POLICY "Super admins can delete roles"
ON public.user_roles
FOR DELETE
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can delete their clients' roles"
ON public.user_roles
FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin') 
  AND user_id IN (
    SELECT client_id 
    FROM public.client_admin_assignments 
    WHERE admin_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own role"
ON public.user_roles
FOR DELETE
USING (user_id = auth.uid());

-- Function to count super admins
CREATE OR REPLACE FUNCTION public.count_super_admins()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)
  FROM public.user_roles
  WHERE role = 'super_admin'
$$;
-- Step 1: Add new enum values
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'company';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'installer';
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
-- Create API keys table for ESP32 authentication
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  machine_id UUID REFERENCES public.machines(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true NOT NULL,
  description TEXT
);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Policies for API keys
CREATE POLICY "Users can view API keys for their machines"
  ON public.api_keys FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.machines
      WHERE machines.id = api_keys.machine_id
      AND machines.owner_id = auth.uid()
    )
    OR
    public.has_role(auth.uid(), 'super_admin')
    OR
    EXISTS (
      SELECT 1 FROM public.machines m
      JOIN public.user_roles ur ON m.owner_id = ur.user_id
      WHERE m.id = api_keys.machine_id
      AND (
        (public.has_role(auth.uid(), 'company') AND EXISTS (
          SELECT 1 FROM public.installer_company_assignments ica
          WHERE ica.company_id = auth.uid()
          AND (ica.installer_id = m.owner_id OR ica.installer_id IN (
            SELECT user_id FROM public.client_admin_assignments WHERE admin_id = m.owner_id
          ))
        ))
        OR
        (public.has_role(auth.uid(), 'installer') AND EXISTS (
          SELECT 1 FROM public.client_admin_assignments caa
          WHERE caa.admin_id = auth.uid() AND caa.client_id = m.owner_id
        ))
      )
    )
  );

CREATE POLICY "Super admins and machine owners can create API keys"
  ON public.api_keys FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR
    EXISTS (
      SELECT 1 FROM public.machines
      WHERE machines.id = api_keys.machine_id
      AND machines.owner_id = auth.uid()
    )
  );

CREATE POLICY "Super admins and creators can delete API keys"
  ON public.api_keys FOR DELETE
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR created_by = auth.uid()
  );

CREATE POLICY "Super admins and creators can update API keys"
  ON public.api_keys FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR created_by = auth.uid()
  );

-- Add index for faster lookups
CREATE INDEX idx_api_keys_machine_id ON public.api_keys(machine_id);
CREATE INDEX idx_api_keys_key ON public.api_keys(key);
-- Make machine_id nullable so keys can be generated before assignment
ALTER TABLE public.api_keys 
ALTER COLUMN machine_id DROP NOT NULL;

-- Add index for unassigned keys
CREATE INDEX idx_api_keys_unassigned ON public.api_keys(is_active) WHERE machine_id IS NULL;
-- Drop the old check constraint on type if it exists
ALTER TABLE public.machines 
DROP CONSTRAINT IF EXISTS machines_type_check;

-- Update existing 'fan' type machines to 'evaporative'
UPDATE public.machines 
SET type = 'evaporative' 
WHERE type = 'fan';

-- Add location field to machines table
ALTER TABLE public.machines 
ADD COLUMN IF NOT EXISTS location text;

-- Add temperature_setpoint field for heat pumps (0-75Â°C range)
ALTER TABLE public.machines 
ADD COLUMN IF NOT EXISTS temperature_setpoint numeric DEFAULT 55;

-- Add pump and heat state fields for heat pump functionality
ALTER TABLE public.machines 
ADD COLUMN IF NOT EXISTS has_pump boolean NOT NULL DEFAULT false;

ALTER TABLE public.machines 
ADD COLUMN IF NOT EXISTS has_heat boolean NOT NULL DEFAULT false;

-- Add a new check constraint allowing the new types
ALTER TABLE public.machines 
ADD CONSTRAINT machines_type_check CHECK (type IN ('evaporative', 'airconditioner', 'heatpump'));

-- Add check constraint for temperature_setpoint
ALTER TABLE public.machines 
ADD CONSTRAINT machines_temp_setpoint_check CHECK (temperature_setpoint IS NULL OR (temperature_setpoint >= 0 AND temperature_setpoint <= 75));

-- Add comment to document the machine types
COMMENT ON COLUMN public.machines.type IS 'Machine type: evaporative, airconditioner, or heatpump';
-- Add notifications_enabled column to machines table
ALTER TABLE public.machines 
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN NOT NULL DEFAULT false;

-- Add comment
COMMENT ON COLUMN public.machines.notifications_enabled IS 'Whether push notifications are enabled for this machine';


