-- Cmonitor production: verify schema + align site machines after migrations.
-- Run in Supabase SQL Editor. Apply migrations from repo in timestamp order; skip any already recorded.

-- ---------------------------------------------------------------------------
-- 1) What is already applied? (Supabase CLI / hosted projects)
-- ---------------------------------------------------------------------------
SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE version >= '20260526200000'
ORDER BY version;

-- ---------------------------------------------------------------------------
-- 2) Required objects — ONE row (Supabase only shows the last SELECT if you split them)
-- ---------------------------------------------------------------------------
SELECT
  to_regclass('public.site_dashboard_card_order') IS NOT NULL AS has_dashboard_card_order,
  to_regprocedure('public.sync_site_machines_to_owner(uuid)') IS NOT NULL AS has_sync_rpc,
  to_regprocedure('public.machines_on_site(uuid)') IS NOT NULL AS has_machines_on_site,
  to_regprocedure('public.get_managed_account_directory()') IS NOT NULL AS has_managed_directory;

-- ---------------------------------------------------------------------------
-- 3) Migrations to apply (repo order) — run each file NOT in schema_migrations
-- ---------------------------------------------------------------------------
-- 20260526250000_site_dashboard_card_order_v1.sql
-- 20260527000000_public_client_demo_v1.sql          (optional: public demo)
-- 20260527120000_site_owner_cascade_machines_v1.sql
-- 20260527130000_managed_account_directory_rpc_v1.sql
-- 20260527140000_sites_installer_layout_readonly_v1.sql
-- 20260527155000_managed_account_directory_company_scope_v1.sql  (skip if you already ran the old 27150000 file)
-- 20260527160000_sync_site_machines_safe_no_card_order_v1.sql      (canonical machine sync + backfill)
--
-- DO NOT run: 20260527150000_site_machine_sync_and_company_directory_v2.sql (removed from repo)

-- ---------------------------------------------------------------------------
-- 4) After 27160000: sync one site (replace UUID)
-- ---------------------------------------------------------------------------
-- SELECT public.sync_site_machines_to_owner('bda0cb27-9ec3-4dbf-b7a3-744487cb5565'::uuid);

-- ---------------------------------------------------------------------------
-- 5) Diagnose: why sync might return 0
-- ---------------------------------------------------------------------------
-- ERF pins for site:
-- SELECT count(*) FROM public.site_machine_positions WHERE site_id = 'YOUR-SITE-UUID'::uuid;
-- Building pins for site:
-- SELECT count(*)
-- FROM public.building_machine_positions bmp
-- JOIN public.buildings b ON b.id = bmp.building_id
-- WHERE b.site_id = 'YOUR-SITE-UUID'::uuid;
-- Owner mismatches (machines that should move):
-- SELECT m.id, m.name, m.owner_id AS machine_owner, s.owner_id AS site_owner
-- FROM public.machines m
-- CROSS JOIN public.sites s
-- WHERE s.id = 'YOUR-SITE-UUID'::uuid
--   AND m.id IN (SELECT public.machines_on_site(s.id))
--   AND m.owner_id IS DISTINCT FROM s.owner_id;
