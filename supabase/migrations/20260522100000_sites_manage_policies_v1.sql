-- Allow site managers (owner, membership roles, super_admin) to update/delete sites they can manage.

DROP POLICY IF EXISTS "Users can update own sites" ON public.sites;
DROP POLICY IF EXISTS "Users can delete own sites" ON public.sites;

CREATE POLICY "Managers can update sites" ON public.sites
  FOR UPDATE
  USING (public.user_can_manage_site(id))
  WITH CHECK (public.user_can_manage_site(id));

CREATE POLICY "Managers can delete sites" ON public.sites
  FOR DELETE
  USING (public.user_can_manage_site(id));
