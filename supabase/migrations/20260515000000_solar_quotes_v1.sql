-- Solar PV quoting (v1) — products + saved quotes
-- Documented: docs/product/SOLAR_QUOTING.md (frontend uses localStorage until wired)

CREATE TABLE IF NOT EXISTS public.quote_products (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  list_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
  unit_sell_price NUMERIC(14, 2),
  default_qty NUMERIC(10, 2),
  unit_label TEXT,
  watts_per_panel INTEGER,
  kwh_per_unit NUMERIC(10, 2),
  kw_rating NUMERIC(10, 2),
  tags TEXT[] NOT NULL DEFAULT '{}',
  requires_system_type TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.solar_quotes (
  id TEXT PRIMARY KEY,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  system_type TEXT NOT NULL DEFAULT 'solar_pv',
  client JSONB NOT NULL DEFAULT '{}',
  pricing JSONB NOT NULL DEFAULT '{}',
  savings JSONB NOT NULL DEFAULT '{}',
  line_items JSONB NOT NULL DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.quote_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solar_quotes ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read products; only super_admin can manage catalog (later UI).
DO $$ BEGIN
  CREATE POLICY "quote_products_select_authenticated"
  ON public.quote_products FOR SELECT
  TO authenticated
  USING (active = true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "solar_quotes_all_own_or_admin"
  ON public.solar_quotes FOR ALL
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('super_admin', 'company')
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('super_admin', 'company')
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
