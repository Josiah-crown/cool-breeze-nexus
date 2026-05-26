-- Run ONE highlighted block at a time in Supabase SQL Editor (Run selected query).
-- If deadlock (40P01): wait 30s, close dashboard tabs, retry that block only.
-- Skip a block if it already succeeded on a previous attempt.

-- ========== BLOCK A — profiles ==========
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
CREATE POLICY "Super admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));

-- ========== BLOCK B — user_roles ==========
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Super admins can view all roles" ON public.user_roles;
CREATE POLICY "Super admins can view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));

-- ========== BLOCK C — installer assignments ==========
DROP POLICY IF EXISTS "Super admins can view all installer assignments" ON public.installer_company_assignments;
CREATE POLICY "Super admins can view all installer assignments" ON public.installer_company_assignments
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));

-- ========== BLOCK D — client assignments ==========
DROP POLICY IF EXISTS "Super admins can view all client assignments" ON public.client_admin_assignments;
CREATE POLICY "Super admins can view all client assignments" ON public.client_admin_assignments
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));

-- ========== BLOCK E — machines (run last; heaviest lock) ==========
DROP POLICY IF EXISTS "Super admins can update machines" ON public.machines;
CREATE POLICY "Super admins can update machines" ON public.machines
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Super admins can view all machines" ON public.machines;
CREATE POLICY "Super admins can view all machines" ON public.machines
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));

-- ========== BLOCK F — verify (read-only) ==========
SELECT pol.polname, rel.relname AS table_name
FROM pg_policy pol
JOIN pg_class rel ON rel.oid = pol.polrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname IN ('profiles', 'user_roles', 'machines', 'installer_company_assignments', 'client_admin_assignments')
  AND pol.polname ILIKE '%super admin%'
ORDER BY rel.relname, pol.polname;
