-- Safe sync_site_machines_to_owner when site_dashboard_card_order may not exist yet.
-- Run after company_scope_v1; does not duplicate get_managed_account_directory.

CREATE OR REPLACE FUNCTION public.machines_on_site(p_site_id UUID)
RETURNS SETOF UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT smp.machine_id
  FROM public.site_machine_positions smp
  WHERE smp.site_id = p_site_id;

  RETURN QUERY
  SELECT bmp.machine_id
  FROM public.building_machine_positions bmp
  INNER JOIN public.buildings b ON b.id = bmp.building_id
  WHERE b.site_id = p_site_id;

  IF to_regclass('public.site_dashboard_card_order') IS NOT NULL THEN
    RETURN QUERY
    SELECT o.machine_id
    FROM public.site_dashboard_card_order o
    WHERE o.group_key = p_site_id::text;
  END IF;
END;
$$;

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

CREATE OR REPLACE FUNCTION public.cascade_site_owner_to_machines()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'UPDATE' OR NEW.owner_id IS NOT DISTINCT FROM OLD.owner_id THEN
    RETURN NEW;
  END IF;
  IF NEW.owner_id IS NULL THEN
    RAISE EXCEPTION 'Site owner is required';
  END IF;
  PERFORM public.sync_site_machines_to_owner(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sites_cascade_owner_to_machines ON public.sites;
CREATE TRIGGER sites_cascade_owner_to_machines
  AFTER UPDATE OF owner_id ON public.sites
  FOR EACH ROW
  EXECUTE FUNCTION public.cascade_site_owner_to_machines();

GRANT EXECUTE ON FUNCTION public.machines_on_site(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.machines_on_site(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_site_machines_to_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_site_machines_to_owner(UUID) TO service_role;

COMMENT ON FUNCTION public.machines_on_site(UUID) IS
  'Machine IDs on a site: ERF pins, building floorplans, and dashboard card order when that table exists.';
COMMENT ON FUNCTION public.sync_site_machines_to_owner(UUID) IS
  'Sets machines.owner_id to sites.owner_id for all machines_on_site. Called from Sites UI and owner-change trigger.';

-- One-time alignment for sites already owned by a client but machines still on installer/admin.
UPDATE public.machines m
SET owner_id = s.owner_id
FROM public.sites s
WHERE m.id IN (SELECT public.machines_on_site(s.id))
  AND m.owner_id IS DISTINCT FROM s.owner_id;
