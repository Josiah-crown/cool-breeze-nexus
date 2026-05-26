-- Sites: company scope, hierarchy access, creator membership, multi-site visibility

ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS company_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sites_company_id ON public.sites(company_id);

-- Can the current user manage/view accounts in their hierarchy (company / installer / self)?
CREATE OR REPLACE FUNCTION public.user_manages_account(p_account_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_account_id IS NULL THEN FALSE
    WHEN p_account_id = auth.uid() THEN TRUE
    WHEN public.has_role(auth.uid(), 'super_admin') THEN TRUE
    WHEN public.has_role(auth.uid(), 'company') AND (
      p_account_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.installer_company_assignments ica
        WHERE ica.company_id = auth.uid()
          AND ica.installer_id = p_account_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.client_admin_assignments ca
        INNER JOIN public.installer_company_assignments ica ON ica.installer_id = ca.admin_id
        WHERE ica.company_id = auth.uid()
          AND ca.client_id = p_account_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.client_admin_assignments ca
        WHERE ca.client_id = p_account_id
          AND ca.admin_id = auth.uid()
      )
    ) THEN TRUE
    WHEN public.has_role(auth.uid(), 'installer') AND (
      p_account_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.client_admin_assignments ca
        WHERE ca.admin_id = auth.uid()
          AND ca.client_id = p_account_id
      )
    ) THEN TRUE
    ELSE FALSE
  END;
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_site(p_site_id UUID)
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
        s.owner_id = auth.uid()
        OR public.has_role(auth.uid(), 'super_admin')
        OR public.user_manages_account(s.owner_id)
        OR (s.company_id IS NOT NULL AND public.user_manages_account(s.company_id))
        OR EXISTS (
          SELECT 1
          FROM public.site_memberships sm
          WHERE sm.site_id = s.id
            AND sm.user_id = auth.uid()
        )
      )
  );
$$;

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
        s.owner_id = auth.uid()
        OR public.has_role(auth.uid(), 'super_admin')
        OR public.user_manages_account(s.owner_id)
        OR (s.company_id IS NOT NULL AND public.user_manages_account(s.company_id))
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

CREATE OR REPLACE FUNCTION public.create_site(
  p_name TEXT,
  p_address TEXT DEFAULT NULL,
  p_owner_id UUID DEFAULT NULL,
  p_company_id UUID DEFAULT NULL
)
RETURNS public.sites
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.sites;
  v_owner UUID := COALESCE(p_owner_id, auth.uid());
  v_company UUID := p_company_id;
  v_member_role TEXT := 'manager';
BEGIN
  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'Site name is required';
  END IF;

  IF v_company IS NULL AND public.has_role(auth.uid(), 'company') THEN
    v_company := auth.uid();
  ELSIF v_company IS NULL AND public.has_role(auth.uid(), 'installer') THEN
    SELECT ica.company_id INTO v_company
    FROM public.installer_company_assignments ica
    WHERE ica.installer_id = auth.uid()
    LIMIT 1;
  END IF;

  IF v_company IS NOT NULL AND NOT public.has_role(auth.uid(), 'super_admin') THEN
    IF v_company IS DISTINCT FROM auth.uid() AND NOT public.user_manages_account(v_company) THEN
      RAISE EXCEPTION 'You can only assign sites to your company';
    END IF;
  END IF;

  IF v_owner IS DISTINCT FROM auth.uid() THEN
    IF NOT public.has_role(auth.uid(), 'super_admin') THEN
      IF NOT public.user_manages_account(v_owner) THEN
        RAISE EXCEPTION 'You can only create sites for accounts you manage';
      END IF;
    END IF;
  END IF;

  IF public.has_role(auth.uid(), 'company') THEN
    v_member_role := 'company';
  ELSIF public.has_role(auth.uid(), 'installer') THEN
    v_member_role := 'installer';
  END IF;

  INSERT INTO public.sites (owner_id, company_id, name, address)
  VALUES (
    v_owner,
    v_company,
    btrim(p_name),
    NULLIF(btrim(COALESCE(p_address, '')), '')
  )
  RETURNING * INTO v_row;

  IF auth.uid() IS DISTINCT FROM v_owner THEN
    INSERT INTO public.site_memberships (site_id, user_id, role, created_by)
    VALUES (v_row.id, auth.uid(), v_member_role, auth.uid())
    ON CONFLICT (site_id, user_id) DO NOTHING;
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_site(TEXT, TEXT, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_site(TEXT, TEXT, UUID, UUID) TO service_role;
