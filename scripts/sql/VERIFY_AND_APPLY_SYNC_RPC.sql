-- Run in Supabase SQL Editor (one block). Lists functions, then creates sync RPC if missing.

-- What Postgres actually has (ignore to_regprocedure if this shows rows):
SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('sync_site_machines_to_owner', 'machines_on_site')
ORDER BY 1;

-- Same check the checklist uses:
SELECT
  to_regprocedure('public.sync_site_machines_to_owner(uuid)') IS NOT NULL AS has_sync_rpc,
  to_regprocedure('public.machines_on_site(uuid)') IS NOT NULL AS has_machines_on_site;

-- If has_sync_rpc is false AND the SELECT above returns no sync row, run the block below.
-- If sync_site_machines_to_owner already appears above, the RPC exists — use the correct site UUID only.

CREATE OR REPLACE FUNCTION public.sync_site_machines_to_owner(p_site_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID;
  v_count INTEGER;
BEGIN
  IF p_site_id IS NULL THEN
    RAISE EXCEPTION 'Site id is required';
  END IF;

  IF auth.uid() IS NOT NULL
    AND NOT public.user_can_manage_site(p_site_id)
    AND NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Not authorized to sync machines for this site';
  END IF;

  SELECT s.owner_id INTO v_owner FROM public.sites s WHERE s.id = p_site_id;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Site not found';
  END IF;

  UPDATE public.machines m
  SET owner_id = v_owner
  WHERE m.id IN (SELECT public.machines_on_site(p_site_id))
    AND m.owner_id IS DISTINCT FROM v_owner;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_site_machines_to_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_site_machines_to_owner(UUID) TO service_role;
