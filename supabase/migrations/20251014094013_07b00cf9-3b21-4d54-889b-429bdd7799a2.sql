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