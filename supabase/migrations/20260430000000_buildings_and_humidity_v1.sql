-- Buildings + Floorplans + Humidity (v1)
-- Date: 2026-04-30
--
-- Goals:
-- - Buildings inherit access from Sites
-- - Multi-floor floorplan image upload (stored in Supabase Storage)
-- - Machine positions per floor (pins)
-- - Hourly humidity playback per building (median overall + per-machine)

-- ------------------------------------------------------------
-- 0) Site memberships (adds company/installer access without changing ownership)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.site_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('company', 'installer', 'viewer', 'manager')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(site_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_site_memberships_site_id ON public.site_memberships(site_id);
CREATE INDEX IF NOT EXISTS idx_site_memberships_user_id ON public.site_memberships(user_id);

ALTER TABLE public.site_memberships ENABLE ROW LEVEL SECURITY;

-- Helper: can the current user access a site?
CREATE OR REPLACE FUNCTION public.user_can_access_site(p_site_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sites s
    WHERE s.id = p_site_id
      AND (
        s.owner_id = auth.uid()
        OR public.has_role(auth.uid(), 'super_admin')
        OR EXISTS (
          SELECT 1
          FROM public.site_memberships sm
          WHERE sm.site_id = s.id
            AND sm.user_id = auth.uid()
        )
      )
  );
$$;

-- Helper: can the current user manage a site (edit buildings/layout/settings)?
CREATE OR REPLACE FUNCTION public.user_can_manage_site(p_site_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sites s
    WHERE s.id = p_site_id
      AND (
        s.owner_id = auth.uid()
        OR public.has_role(auth.uid(), 'super_admin')
        OR EXISTS (
          SELECT 1
          FROM public.site_memberships sm
          WHERE sm.site_id = s.id
            AND sm.user_id = auth.uid()
            AND sm.role IN ('company', 'installer', 'manager')
        )
      )
  );
$$;

-- Site memberships policies
DROP POLICY IF EXISTS "Members can view site memberships" ON public.site_memberships;
CREATE POLICY "Members can view site memberships" ON public.site_memberships
  FOR SELECT
  USING (public.user_can_access_site(site_id));

DROP POLICY IF EXISTS "Managers can manage site memberships" ON public.site_memberships;
CREATE POLICY "Managers can manage site memberships" ON public.site_memberships
  FOR ALL
  USING (public.user_can_manage_site(site_id))
  WITH CHECK (public.user_can_manage_site(site_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_memberships TO authenticated;
GRANT ALL ON public.site_memberships TO service_role;

-- Update Sites RLS to allow membership-based viewing
DROP POLICY IF EXISTS "Users can view own sites" ON public.sites;
CREATE POLICY "Users can view accessible sites" ON public.sites
  FOR SELECT
  USING (public.user_can_access_site(id));

-- ------------------------------------------------------------
-- 1) Buildings + Floors + Layout + Machine positions
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buildings_site_id ON public.buildings(site_id);

DROP TRIGGER IF EXISTS update_buildings_updated_at ON public.buildings;
CREATE TRIGGER update_buildings_updated_at
  BEFORE UPDATE ON public.buildings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view buildings via site" ON public.buildings;
CREATE POLICY "Users can view buildings via site" ON public.buildings
  FOR SELECT
  USING (public.user_can_access_site(site_id));

DROP POLICY IF EXISTS "Managers can manage buildings via site" ON public.buildings;
CREATE POLICY "Managers can manage buildings via site" ON public.buildings
  FOR INSERT
  WITH CHECK (public.user_can_manage_site(site_id));

DROP POLICY IF EXISTS "Managers can update buildings via site" ON public.buildings;
CREATE POLICY "Managers can update buildings via site" ON public.buildings
  FOR UPDATE
  USING (public.user_can_manage_site(site_id))
  WITH CHECK (public.user_can_manage_site(site_id));

DROP POLICY IF EXISTS "Managers can delete buildings via site" ON public.buildings;
CREATE POLICY "Managers can delete buildings via site" ON public.buildings
  FOR DELETE
  USING (public.user_can_manage_site(site_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.buildings TO authenticated;
GRANT ALL ON public.buildings TO service_role;

CREATE TABLE IF NOT EXISTS public.building_floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  floor_key TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(building_id, floor_key)
);

CREATE INDEX IF NOT EXISTS idx_building_floors_building_id ON public.building_floors(building_id);

ALTER TABLE public.building_floors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view building floors" ON public.building_floors;
CREATE POLICY "Users can view building floors" ON public.building_floors
  FOR SELECT
  USING (public.user_can_access_site((SELECT b.site_id FROM public.buildings b WHERE b.id = building_id)));

DROP POLICY IF EXISTS "Managers can manage building floors" ON public.building_floors;
CREATE POLICY "Managers can manage building floors" ON public.building_floors
  FOR ALL
  USING (public.user_can_manage_site((SELECT b.site_id FROM public.buildings b WHERE b.id = building_id)))
  WITH CHECK (public.user_can_manage_site((SELECT b.site_id FROM public.buildings b WHERE b.id = building_id)));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.building_floors TO authenticated;
GRANT ALL ON public.building_floors TO service_role;

-- Floorplan image metadata (the file itself lives in Supabase Storage)
CREATE TABLE IF NOT EXISTS public.building_floorplan_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  floor_key TEXT NOT NULL,
  image_path TEXT NOT NULL, -- storage object path
  width INT NULL,
  height INT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(building_id, floor_key)
);

CREATE INDEX IF NOT EXISTS idx_floorplan_assets_building_id ON public.building_floorplan_assets(building_id);

DROP TRIGGER IF EXISTS update_floorplan_assets_updated_at ON public.building_floorplan_assets;
CREATE TRIGGER update_floorplan_assets_updated_at
  BEFORE UPDATE ON public.building_floorplan_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.building_floorplan_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view floorplan assets" ON public.building_floorplan_assets;
CREATE POLICY "Users can view floorplan assets" ON public.building_floorplan_assets
  FOR SELECT
  USING (public.user_can_access_site((SELECT b.site_id FROM public.buildings b WHERE b.id = building_id)));

DROP POLICY IF EXISTS "Managers can manage floorplan assets" ON public.building_floorplan_assets;
CREATE POLICY "Managers can manage floorplan assets" ON public.building_floorplan_assets
  FOR ALL
  USING (public.user_can_manage_site((SELECT b.site_id FROM public.buildings b WHERE b.id = building_id)))
  WITH CHECK (public.user_can_manage_site((SELECT b.site_id FROM public.buildings b WHERE b.id = building_id)));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.building_floorplan_assets TO authenticated;
GRANT ALL ON public.building_floorplan_assets TO service_role;

-- Layout JSON (optional; can store Konva zones/devices later)
CREATE TABLE IF NOT EXISTS public.building_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  active_floor_key TEXT NOT NULL DEFAULT 'ground',
  layout_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_building_layouts_building_id ON public.building_layouts(building_id);

DROP TRIGGER IF EXISTS update_building_layouts_updated_at ON public.building_layouts;
CREATE TRIGGER update_building_layouts_updated_at
  BEFORE UPDATE ON public.building_layouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.building_layouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view building layouts" ON public.building_layouts;
CREATE POLICY "Users can view building layouts" ON public.building_layouts
  FOR SELECT
  USING (public.user_can_access_site((SELECT b.site_id FROM public.buildings b WHERE b.id = building_id)));

DROP POLICY IF EXISTS "Managers can manage building layouts" ON public.building_layouts;
CREATE POLICY "Managers can manage building layouts" ON public.building_layouts
  FOR ALL
  USING (public.user_can_manage_site((SELECT b.site_id FROM public.buildings b WHERE b.id = building_id)))
  WITH CHECK (public.user_can_manage_site((SELECT b.site_id FROM public.buildings b WHERE b.id = building_id)));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.building_layouts TO authenticated;
GRANT ALL ON public.building_layouts TO service_role;

-- Pins: machine positions per floor (percent coordinates)
CREATE TABLE IF NOT EXISTS public.building_machine_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  floor_key TEXT NOT NULL,
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  x_pct DOUBLE PRECISION NOT NULL,
  y_pct DOUBLE PRECISION NOT NULL,
  label_override TEXT NULL,
  kind TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(building_id, floor_key, machine_id)
);

CREATE INDEX IF NOT EXISTS idx_building_machine_positions_building_id ON public.building_machine_positions(building_id);
CREATE INDEX IF NOT EXISTS idx_building_machine_positions_machine_id ON public.building_machine_positions(machine_id);

DROP TRIGGER IF EXISTS update_building_machine_positions_updated_at ON public.building_machine_positions;
CREATE TRIGGER update_building_machine_positions_updated_at
  BEFORE UPDATE ON public.building_machine_positions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.building_machine_positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view building machine positions" ON public.building_machine_positions;
CREATE POLICY "Users can view building machine positions" ON public.building_machine_positions
  FOR SELECT
  USING (public.user_can_access_site((SELECT b.site_id FROM public.buildings b WHERE b.id = building_id)));

DROP POLICY IF EXISTS "Managers can manage building machine positions" ON public.building_machine_positions;
CREATE POLICY "Managers can manage building machine positions" ON public.building_machine_positions
  FOR ALL
  USING (public.user_can_manage_site((SELECT b.site_id FROM public.buildings b WHERE b.id = building_id)))
  WITH CHECK (public.user_can_manage_site((SELECT b.site_id FROM public.buildings b WHERE b.id = building_id)));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.building_machine_positions TO authenticated;
GRANT ALL ON public.building_machine_positions TO service_role;

-- Building-level humidity thresholds (for color scale + defaults)
CREATE TABLE IF NOT EXISTS public.humidity_building_settings (
  building_id UUID PRIMARY KEY REFERENCES public.buildings(id) ON DELETE CASCADE,
  humidity_on NUMERIC(5,2) NOT NULL DEFAULT 40,
  humidity_off NUMERIC(5,2) NOT NULL DEFAULT 60,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

DROP TRIGGER IF EXISTS update_humidity_building_settings_updated_at ON public.humidity_building_settings;
CREATE TRIGGER update_humidity_building_settings_updated_at
  BEFORE UPDATE ON public.humidity_building_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.humidity_building_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view humidity building settings" ON public.humidity_building_settings;
CREATE POLICY "Users can view humidity building settings" ON public.humidity_building_settings
  FOR SELECT
  USING (public.user_can_access_site((SELECT b.site_id FROM public.buildings b WHERE b.id = building_id)));

DROP POLICY IF EXISTS "Managers can manage humidity building settings" ON public.humidity_building_settings;
CREATE POLICY "Managers can manage humidity building settings" ON public.humidity_building_settings
  FOR ALL
  USING (public.user_can_manage_site((SELECT b.site_id FROM public.buildings b WHERE b.id = building_id)))
  WITH CHECK (public.user_can_manage_site((SELECT b.site_id FROM public.buildings b WHERE b.id = building_id)));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.humidity_building_settings TO authenticated;
GRANT ALL ON public.humidity_building_settings TO service_role;

-- ------------------------------------------------------------
-- 2) Humidity readings storage
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.humidity_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  building_id UUID NULL REFERENCES public.buildings(id) ON DELETE SET NULL,
  rh NUMERIC(5,2) NOT NULL,
  temperature NUMERIC(5,2) NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_humidity_readings_machine_time ON public.humidity_readings(machine_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_humidity_readings_building_time ON public.humidity_readings(building_id, recorded_at DESC);

ALTER TABLE public.humidity_readings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view humidity readings via building/site" ON public.humidity_readings;
CREATE POLICY "Users can view humidity readings via building/site" ON public.humidity_readings
  FOR SELECT
  USING (
    building_id IS NOT NULL
    AND public.user_can_access_site((SELECT b.site_id FROM public.buildings b WHERE b.id = building_id))
  );

-- Inserts should come from service role / edge function
DROP POLICY IF EXISTS "Service role can insert humidity readings" ON public.humidity_readings;
CREATE POLICY "Service role can insert humidity readings" ON public.humidity_readings
  FOR INSERT TO service_role
  WITH CHECK (true);

GRANT SELECT ON public.humidity_readings TO authenticated;
GRANT ALL ON public.humidity_readings TO service_role;

-- ------------------------------------------------------------
-- 3) RPC: hourly median building series + per-machine hourly series
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_building_humidity_hourly(
  p_building_id UUID,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ
)
RETURNS TABLE (
  bucket TIMESTAMPTZ,
  machine_id UUID,
  rh_avg NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Per-machine hourly averages (for playback readouts/heatmap)
  SELECT
    date_trunc('hour', recorded_at) AS bucket,
    hr.machine_id,
    AVG(hr.rh) AS rh_avg
  FROM public.humidity_readings hr
  WHERE hr.building_id = p_building_id
    AND hr.recorded_at >= p_start
    AND hr.recorded_at < p_end
  GROUP BY 1, 2
  ORDER BY 1 ASC, 2 ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_building_humidity_hourly(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_building_humidity_hourly(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;

CREATE OR REPLACE FUNCTION public.get_building_humidity_overall_hourly(
  p_building_id UUID,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ
)
RETURNS TABLE (
  bucket TIMESTAMPTZ,
  rh_median NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Overall hourly median across machines (median of per-machine hourly averages).
  WITH per_machine AS (
    SELECT
      date_trunc('hour', recorded_at) AS bucket,
      machine_id,
      AVG(rh) AS rh_avg
    FROM public.humidity_readings
    WHERE building_id = p_building_id
      AND recorded_at >= p_start
      AND recorded_at < p_end
    GROUP BY 1, 2
  )
  SELECT
    bucket,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY rh_avg) AS rh_median
  FROM per_machine
  GROUP BY bucket
  ORDER BY bucket ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_building_humidity_overall_hourly(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_building_humidity_overall_hourly(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;

-- ------------------------------------------------------------
-- 4) Storage bucket for floorplans + policies
-- ------------------------------------------------------------

-- Create bucket if missing (private by default)
INSERT INTO storage.buckets (id, name, public)
VALUES ('floorplans', 'floorplans', false)
ON CONFLICT (id) DO NOTHING;

-- Policies for storage.objects require RLS on that table.
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Object path convention:
--   floorplans/site/<site_id>/building/<building_id>/floor/<floor_key>/<filename>

DROP POLICY IF EXISTS "Users can read floorplans via site" ON storage.objects;
CREATE POLICY "Users can read floorplans via site" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'floorplans'
    AND public.user_can_access_site(
      NULLIF(split_part(name, '/', 2), '')::uuid
    )
  );

DROP POLICY IF EXISTS "Managers can upload floorplans via site" ON storage.objects;
CREATE POLICY "Managers can upload floorplans via site" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'floorplans'
    AND public.user_can_manage_site(
      NULLIF(split_part(name, '/', 2), '')::uuid
    )
  );

DROP POLICY IF EXISTS "Managers can update floorplans via site" ON storage.objects;
CREATE POLICY "Managers can update floorplans via site" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'floorplans'
    AND public.user_can_manage_site(
      NULLIF(split_part(name, '/', 2), '')::uuid
    )
  )
  WITH CHECK (
    bucket_id = 'floorplans'
    AND public.user_can_manage_site(
      NULLIF(split_part(name, '/', 2), '')::uuid
    )
  );

DROP POLICY IF EXISTS "Managers can delete floorplans via site" ON storage.objects;
CREATE POLICY "Managers can delete floorplans via site" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'floorplans'
    AND public.user_can_manage_site(
      NULLIF(split_part(name, '/', 2), '')::uuid
    )
  );

