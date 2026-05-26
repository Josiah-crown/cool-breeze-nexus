-- Run in Supabase SQL Editor when site_dashboard_card_order does NOT exist yet.
-- (Use full migration 20260527150000_site_machine_sync... after 20260526250000 is applied.)

CREATE OR REPLACE FUNCTION public.machines_on_site(p_site_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT machine_id
  FROM (
    SELECT smp.machine_id
    FROM public.site_machine_positions smp
    WHERE smp.site_id = p_site_id
    UNION
    SELECT bmp.machine_id
    FROM public.building_machine_positions bmp
    INNER JOIN public.buildings b ON b.id = bmp.building_id
    WHERE b.site_id = p_site_id
  ) scoped;
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

  SELECT s.owner_id INTO v_owner
  FROM public.sites s
  WHERE s.id = p_site_id;

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
DECLARE
  v_count INTEGER;
BEGIN
  IF TG_OP <> 'UPDATE' OR NEW.owner_id IS NOT DISTINCT FROM OLD.owner_id THEN
    RETURN NEW;
  END IF;

  IF NEW.owner_id IS NULL THEN
    RAISE EXCEPTION 'Site owner is required';
  END IF;

  v_count := public.sync_site_machines_to_owner(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sites_cascade_owner_to_machines ON public.sites;
CREATE TRIGGER sites_cascade_owner_to_machines
  AFTER UPDATE OF owner_id ON public.sites
  FOR EACH ROW
  EXECUTE FUNCTION public.cascade_site_owner_to_machines();

GRANT EXECUTE ON FUNCTION public.sync_site_machines_to_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_site_machines_to_owner(UUID) TO service_role;

-- Your site (from List Sites by Name):
SELECT public.sync_site_machines_to_owner('bda0cb27-9ec3-4dbf-b7a3-744487cb5565'::uuid);
