-- Clients may view sites they own or are members of, but cannot manage layout (ERF, buildings, pins).

CREATE OR REPLACE FUNCTION public.user_can_manage_site(p_site_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sites s
    WHERE s.id = p_site_id
      AND (
        (s.owner_id = auth.uid() AND NOT public.has_role(auth.uid(), 'client'))
        OR public.has_role(auth.uid(), 'super_admin')
        OR (
          public.user_manages_account(s.owner_id)
          AND NOT public.has_role(auth.uid(), 'client')
        )
        OR (
          s.company_id IS NOT NULL
          AND public.user_manages_account(s.company_id)
          AND NOT public.has_role(auth.uid(), 'client')
        )
        OR EXISTS (
          SELECT 1
          FROM public.site_memberships sm
          WHERE sm.site_id = s.id
            AND sm.user_id = auth.uid()
            AND sm.role IN ('company', 'installer', 'manager')
        )
      )
  );
$$;
