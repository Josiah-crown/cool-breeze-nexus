-- Restore super_admin visibility for dashboard hierarchy + Change Owner dialog.
-- accounts bootstrap (20260520100000) recreated profiles policies without super_admin read-all.
--
-- If you get ERROR 40P01 deadlock: close the live app / wait 30s, then run ONE section at a time
-- from scripts/sql/APPLY_27210000_SUPER_ADMIN_RLS_SECTIONS.sql (do not run the whole file at once).

-- profiles
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
CREATE POLICY "Super admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));

-- user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Super admins can view all roles" ON public.user_roles;
CREATE POLICY "Super admins can view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));

-- assignments (Change Owner + useMachineData hierarchy)
DROP POLICY IF EXISTS "Super admins can view all installer assignments" ON public.installer_company_assignments;
CREATE POLICY "Super admins can view all installer assignments" ON public.installer_company_assignments
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Super admins can view all client assignments" ON public.client_admin_assignments;
CREATE POLICY "Super admins can view all client assignments" ON public.client_admin_assignments
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));

-- machines: explicit super_admin update (works alongside owner/installer/company policies)
DROP POLICY IF EXISTS "Super admins can update machines" ON public.machines;
CREATE POLICY "Super admins can update machines" ON public.machines
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Super admins can view all machines" ON public.machines;
CREATE POLICY "Super admins can view all machines" ON public.machines
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));
