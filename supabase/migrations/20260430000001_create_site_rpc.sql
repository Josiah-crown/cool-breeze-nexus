-- Site creation helper RPC (avoids client-side owner_id mismatches)
-- Date: 2026-04-30

CREATE OR REPLACE FUNCTION public.create_site(
  p_name TEXT,
  p_address TEXT DEFAULT NULL
)
RETURNS public.sites
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.sites;
BEGIN
  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'Site name is required';
  END IF;

  INSERT INTO public.sites (owner_id, name, address)
  VALUES (auth.uid(), btrim(p_name), NULLIF(btrim(COALESCE(p_address, '')), ''))
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_site(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_site(TEXT, TEXT) TO service_role;

