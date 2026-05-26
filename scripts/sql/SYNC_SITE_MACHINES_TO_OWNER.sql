-- Transfer machine ownership to match a site's client owner (sites.owner_id).
-- Includes machines on: ERF pins, building floorplans, dashboard site card group.
--
-- One site (replace UUID):
--   SELECT public.sync_site_machines_to_owner('YOUR-SITE-UUID'::uuid);
--
-- Preview mismatches for one site:
--   SELECT m.id, m.name, m.owner_id AS machine_owner, s.owner_id AS site_owner
--   FROM public.machines m
--   WHERE m.id IN (SELECT public.machines_on_site('YOUR-SITE-UUID'::uuid))
--     AND m.owner_id IS DISTINCT FROM (SELECT owner_id FROM public.sites WHERE id = 'YOUR-SITE-UUID'::uuid);

SELECT public.sync_site_machines_to_owner('YOUR-SITE-UUID'::uuid);
