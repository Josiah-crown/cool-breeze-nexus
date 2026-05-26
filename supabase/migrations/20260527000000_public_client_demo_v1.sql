-- Public read-only client demo: anon can load one showcase site (demo machines) via RPC.

ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS is_public_client_demo BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_sites_public_client_demo
  ON public.sites (is_public_client_demo)
  WHERE is_public_client_demo = true;

COMMENT ON COLUMN public.sites.is_public_client_demo IS
  'When true, site data is exposed via get_public_client_demo() for the marketing /dashboard/demo page.';

CREATE OR REPLACE FUNCTION public.get_public_client_demo()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_site public.sites%ROWTYPE;
  v_site_id UUID;
  v_owner_name TEXT;
BEGIN
  SELECT s.id
  INTO v_site_id
  FROM public.sites s
  WHERE s.is_public_client_demo = true
  ORDER BY s.updated_at DESC
  LIMIT 1;

  IF v_site_id IS NULL THEN
    SELECT s.id
    INTO v_site_id
    FROM public.sites s
    WHERE s.name ILIKE '%demo%'
    ORDER BY s.updated_at DESC
    LIMIT 1;
  END IF;

  IF v_site_id IS NULL THEN
    SELECT s.id
    INTO v_site_id
    FROM public.sites s
    INNER JOIN public.site_machine_positions smp ON smp.site_id = s.id
    INNER JOIN public.machines m ON m.id = smp.machine_id AND m.name ILIKE '%demo%'
    GROUP BY s.id
    ORDER BY COUNT(*) DESC
    LIMIT 1;
  END IF;

  IF v_site_id IS NOT NULL THEN
    SELECT s.* INTO v_site FROM public.sites s WHERE s.id = v_site_id;
  END IF;

  IF v_site.id IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'no_demo_site',
      'message', 'No public demo site found. Create a site, set is_public_client_demo = true, and add machines with "demo" in the name.'
    );
  END IF;

  SELECT COALESCE(p.name, p.email, 'Demo client')
  INTO v_owner_name
  FROM public.profiles p
  WHERE p.id = v_site.owner_id;

  RETURN jsonb_build_object(
    'site', jsonb_build_object(
      'id', v_site.id,
      'name', v_site.name,
      'address', v_site.address,
      'owner_id', v_site.owner_id,
      'company_id', v_site.company_id,
      'updated_at', v_site.updated_at
    ),
    'owner_display_name', v_owner_name,
    'buildings', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', b.id,
        'site_id', b.site_id,
        'name', b.name,
        'updated_at', b.updated_at
      ) ORDER BY b.name)
      FROM public.buildings b
      WHERE b.site_id = v_site.id
    ), '[]'::jsonb),
    'building_floor_counts', COALESCE((
      SELECT jsonb_object_agg(sub.building_id, sub.cnt)
      FROM (
        SELECT bf.building_id, COUNT(*)::int AS cnt
        FROM public.building_floors bf
        INNER JOIN public.buildings b ON b.id = bf.building_id
        WHERE b.site_id = v_site.id
        GROUP BY bf.building_id
      ) sub
    ), '{}'::jsonb),
    'erf_asset', (
      SELECT to_jsonb(a)
      FROM public.site_erf_assets a
      WHERE a.site_id = v_site.id
      LIMIT 1
    ),
    'building_shapes', COALESCE((
      SELECT jsonb_agg(to_jsonb(sh) ORDER BY sh.building_id)
      FROM public.site_building_shapes sh
      WHERE sh.site_id = v_site.id
    ), '[]'::jsonb),
    'machine_positions', COALESCE((
      SELECT jsonb_agg(to_jsonb(smp) ORDER BY smp.machine_id)
      FROM public.site_machine_positions smp
      WHERE smp.site_id = v_site.id
        AND EXISTS (
          SELECT 1
          FROM public.machines m
          WHERE m.id = smp.machine_id
            AND m.owner_id = v_site.owner_id
            AND m.name ILIKE '%demo%'
        )
    ), '[]'::jsonb),
    'machines', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', m.id,
          'name', m.name,
          'type', m.type,
          'manufacturer', m.manufacturer,
          'owner_id', m.owner_id,
          'location', m.location,
          'is_on', m.is_on,
          'is_cooling', m.is_cooling,
          'fan_active', m.fan_active,
          'has_water', m.has_water,
          'has_heat', m.has_heat,
          'setpoint', m.setpoint,
          'motor_temp', m.motor_temp,
          'outside_temp', m.outside_temp,
          'inside_temp', m.inside_temp,
          'current', m.current,
          'voltage', m.voltage,
          'power', m.power,
          'overall_status', m.overall_status,
          'motor_status', m.motor_status,
          'is_connected', m.is_connected
        )
        ORDER BY m.name
      )
      FROM public.machines m
      WHERE m.owner_id = v_site.owner_id
        AND m.name ILIKE '%demo%'
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_client_demo() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_client_demo() TO anon, authenticated, service_role;
