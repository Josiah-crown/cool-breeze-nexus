-- Site ERF + building outlines + machine pins on ERF (idempotent ensure)
-- Run on hosted Supabase if site_erf_assets is missing from schema cache.

CREATE TABLE IF NOT EXISTS public.site_erf_assets (
  site_id UUID PRIMARY KEY REFERENCES public.sites(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_site_erf_assets_updated_at ON public.site_erf_assets;
CREATE TRIGGER update_site_erf_assets_updated_at
  BEFORE UPDATE ON public.site_erf_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.site_erf_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view site erf assets" ON public.site_erf_assets;
CREATE POLICY "Users can view site erf assets" ON public.site_erf_assets
  FOR SELECT
  USING (public.user_can_access_site(site_id));

DROP POLICY IF EXISTS "Managers can manage site erf assets" ON public.site_erf_assets;
CREATE POLICY "Managers can manage site erf assets" ON public.site_erf_assets
  FOR ALL
  USING (public.user_can_manage_site(site_id))
  WITH CHECK (public.user_can_manage_site(site_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_erf_assets TO authenticated;
GRANT ALL ON public.site_erf_assets TO service_role;

CREATE TABLE IF NOT EXISTS public.site_building_shapes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  x_pct DOUBLE PRECISION NOT NULL,
  y_pct DOUBLE PRECISION NOT NULL,
  w_pct DOUBLE PRECISION NOT NULL,
  h_pct DOUBLE PRECISION NOT NULL,
  label_override TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(site_id, building_id)
);

CREATE INDEX IF NOT EXISTS idx_site_building_shapes_site_id ON public.site_building_shapes(site_id);
CREATE INDEX IF NOT EXISTS idx_site_building_shapes_building_id ON public.site_building_shapes(building_id);

DROP TRIGGER IF EXISTS update_site_building_shapes_updated_at ON public.site_building_shapes;
CREATE TRIGGER update_site_building_shapes_updated_at
  BEFORE UPDATE ON public.site_building_shapes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.site_building_shapes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view site building shapes" ON public.site_building_shapes;
CREATE POLICY "Users can view site building shapes" ON public.site_building_shapes
  FOR SELECT
  USING (public.user_can_access_site(site_id));

DROP POLICY IF EXISTS "Managers can manage site building shapes" ON public.site_building_shapes;
CREATE POLICY "Managers can manage site building shapes" ON public.site_building_shapes
  FOR ALL
  USING (public.user_can_manage_site(site_id))
  WITH CHECK (public.user_can_manage_site(site_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_building_shapes TO authenticated;
GRANT ALL ON public.site_building_shapes TO service_role;

-- Machine pins on site ERF (not per-building floorplan image)
CREATE TABLE IF NOT EXISTS public.site_machine_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  building_id UUID NULL REFERENCES public.buildings(id) ON DELETE SET NULL,
  x_pct DOUBLE PRECISION NOT NULL CHECK (x_pct >= 0 AND x_pct <= 100),
  y_pct DOUBLE PRECISION NOT NULL CHECK (y_pct >= 0 AND y_pct <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(site_id, machine_id)
);

CREATE INDEX IF NOT EXISTS idx_site_machine_positions_site_id ON public.site_machine_positions(site_id);
CREATE INDEX IF NOT EXISTS idx_site_machine_positions_machine_id ON public.site_machine_positions(machine_id);

DROP TRIGGER IF EXISTS update_site_machine_positions_updated_at ON public.site_machine_positions;
CREATE TRIGGER update_site_machine_positions_updated_at
  BEFORE UPDATE ON public.site_machine_positions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.site_machine_positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view site machine positions" ON public.site_machine_positions;
CREATE POLICY "Users can view site machine positions" ON public.site_machine_positions
  FOR SELECT
  USING (public.user_can_access_site(site_id));

DROP POLICY IF EXISTS "Managers can manage site machine positions" ON public.site_machine_positions;
CREATE POLICY "Managers can manage site machine positions" ON public.site_machine_positions
  FOR ALL
  USING (public.user_can_manage_site(site_id))
  WITH CHECK (public.user_can_manage_site(site_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_machine_positions TO authenticated;
GRANT ALL ON public.site_machine_positions TO service_role;
