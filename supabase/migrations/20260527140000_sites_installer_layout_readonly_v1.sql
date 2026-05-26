-- Site layout (ERF, buildings, pins, site settings) is head-office only: super_admin + company.
-- Installers keep machine commissioning (machines table, API keys) but not layout edits.

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
        public.has_role(auth.uid(), 'super_admin')
        OR (
          NOT public.has_role(auth.uid(), 'client')
          AND NOT public.has_role(auth.uid(), 'installer')
          AND (
            (s.owner_id = auth.uid() AND NOT public.has_role(auth.uid(), 'client'))
            OR public.user_manages_account(s.owner_id)
            OR (
              s.company_id IS NOT NULL
              AND public.user_manages_account(s.company_id)
            )
            OR EXISTS (
              SELECT 1
              FROM public.site_memberships sm
              WHERE sm.site_id = s.id
                AND sm.user_id = auth.uid()
                AND sm.role IN ('company', 'manager')
            )
          )
        )
      )
  );
$$;

COMMENT ON FUNCTION public.user_can_manage_site(UUID) IS
  'Layout manage: super_admin and company (head office). Clients and installers are view-only on Sites.';
