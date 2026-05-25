-- Maintenance & repair lead capture (v1)

CREATE TABLE IF NOT EXISTS public.service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL DEFAULT 'website',
  name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  site_address TEXT,
  urgency TEXT NOT NULL DEFAULT 'standard' CHECK (urgency IN ('standard', 'urgent')),
  message TEXT NOT NULL
);

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

-- Allow inserts from the website (anon or authenticated). Admin review happens in tooling/outside scope.
DO $$ BEGIN
  CREATE POLICY "service_requests_insert_anyone"
  ON public.service_requests
  FOR INSERT
  WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Restrict reads to super_admin only (avoid leaking requests).
DO $$ BEGIN
  CREATE POLICY "service_requests_select_super_admin"
  ON public.service_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'super_admin'
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

