-- Align machine owner_id with sites.owner_id for every machine on a site's ERF or building floorplan.
-- Run after migration 20260527120000_site_owner_cascade_machines_v1.sql, or to fix one site without re-saving owner.
--
-- Single site:
--   SELECT public.machines_on_site('YOUR-SITE-UUID'::uuid);
--
-- Preview rows that will change:
--   SELECT m.id, m.name, m.owner_id AS current_owner, s.owner_id AS site_owner
--   FROM public.machines m
--   INNER JOIN public.sites s ON m.id IN (SELECT public.machines_on_site(s.id))
--   WHERE m.owner_id IS DISTINCT FROM s.owner_id
--     AND s.id = 'YOUR-SITE-UUID'::uuid;

UPDATE public.machines m
SET owner_id = s.owner_id
FROM public.sites s
WHERE s.id = 'YOUR-SITE-UUID'::uuid
  AND m.id IN (SELECT public.machines_on_site(s.id))
  AND m.owner_id IS DISTINCT FROM s.owner_id;
