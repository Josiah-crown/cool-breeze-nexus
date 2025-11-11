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