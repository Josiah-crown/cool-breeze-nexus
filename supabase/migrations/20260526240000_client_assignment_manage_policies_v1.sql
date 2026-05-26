-- Allow super_admin and company to manage client/installer hierarchy assignments.

DROP POLICY IF EXISTS "Super admins manage client assignments" ON public.client_admin_assignments;
CREATE POLICY "Super admins manage client assignments"
  ON public.client_admin_assignments
  FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Companies manage their client assignments" ON public.client_admin_assignments;
CREATE POLICY "Companies manage their client assignments"
  ON public.client_admin_assignments
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'company')
    AND admin_id IN (
      SELECT ica.installer_id
      FROM public.installer_company_assignments ica
      WHERE ica.company_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'company')
    AND admin_id IN (
      SELECT ica.installer_id
      FROM public.installer_company_assignments ica
      WHERE ica.company_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Super admins manage installer company links" ON public.installer_company_assignments;
CREATE POLICY "Super admins manage installer company links"
  ON public.installer_company_assignments
  FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Companies manage installer company links" ON public.installer_company_assignments;
CREATE POLICY "Companies manage installer company links"
  ON public.installer_company_assignments
  FOR ALL
  USING (public.has_role(auth.uid(), 'company') AND company_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'company') AND company_id = auth.uid());
