-- Allow installers/companies to create sites owned by a client (so ERF shows that client's machines).

CREATE OR REPLACE FUNCTION public.create_site(
  p_name TEXT,
  p_address TEXT DEFAULT NULL,
  p_owner_id UUID DEFAULT NULL
)
RETURNS public.sites
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.sites;
  v_owner UUID := COALESCE(p_owner_id, auth.uid());
BEGIN
  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'Site name is required';
  END IF;

  IF v_owner IS DISTINCT FROM auth.uid() THEN
    IF NOT public.has_role(auth.uid(), 'super_admin') THEN
      IF NOT EXISTS (
        SELECT 1
        FROM public.client_admin_assignments ca
        WHERE ca.client_id = v_owner
          AND (
            ca.admin_id = auth.uid()
            OR ca.admin_id IN (
              SELECT ica.installer_id
              FROM public.installer_company_assignments ica
              WHERE ica.company_id = auth.uid()
            )
          )
      ) THEN
        RAISE EXCEPTION 'You can only create sites for clients you manage';
      END IF;
    END IF;
  END IF;

  INSERT INTO public.sites (owner_id, name, address)
  VALUES (v_owner, btrim(p_name), NULLIF(btrim(COALESCE(p_address, '')), ''))
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_site(TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_site(TEXT, TEXT, UUID) TO service_role;
