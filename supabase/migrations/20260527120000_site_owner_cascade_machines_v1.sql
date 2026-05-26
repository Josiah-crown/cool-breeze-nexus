-- When sites.owner_id changes, transfer machines placed on that site (ERF pins + building floorplans)
-- so installers do not have to re-pin or change owner on each machine manually.
-- Buildings have no owner_id; access is via site_id and updates automatically.

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

  UPDATE public.machines m
  SET owner_id = NEW.owner_id
  WHERE m.id IN (SELECT public.machines_on_site(NEW.id))
    AND m.owner_id IS DISTINCT FROM NEW.owner_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Site % owner % -> %: transferred % machine(s)', NEW.id, OLD.owner_id, NEW.owner_id, v_count;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sites_cascade_owner_to_machines ON public.sites;
CREATE TRIGGER sites_cascade_owner_to_machines
  AFTER UPDATE OF owner_id ON public.sites
  FOR EACH ROW
  EXECUTE FUNCTION public.cascade_site_owner_to_machines();

-- One-time alignment for existing sites (e.g. site owned by client but machines still on installer/admin).
UPDATE public.machines m
SET owner_id = s.owner_id
FROM public.sites s
WHERE m.id IN (SELECT public.machines_on_site(s.id))
  AND m.owner_id IS DISTINCT FROM s.owner_id;

GRANT EXECUTE ON FUNCTION public.machines_on_site(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.machines_on_site(UUID) TO service_role;
