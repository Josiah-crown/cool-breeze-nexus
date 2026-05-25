-- CRM Sync (GoHighLevel / LeadConnector) - queued, auditable, non-destructive

DO $$ BEGIN
  CREATE TYPE public.crm_sync_job_status AS ENUM ('pending', 'processing', 'succeeded', 'failed', 'dead');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.crm_sync_job_type AS ENUM ('upsert_contact', 'set_tags');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.crm_contact_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'gohighlevel',
  location_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, location_id, user_id),
  UNIQUE(provider, location_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_contact_links_user ON public.crm_contact_links(user_id);

CREATE TABLE IF NOT EXISTS public.crm_sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'gohighlevel',
  job_type public.crm_sync_job_type NOT NULL,
  status public.crm_sync_job_status NOT NULL DEFAULT 'pending',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  -- "subject" is who/what we're syncing (contact, etc.)
  subject_key TEXT NOT NULL,
  -- payload is the intended *patch* (never blank fields)
  payload JSONB NOT NULL,
  -- desired_tags supports safe product changes: compute desired set, then reconcile
  desired_tags TEXT[],
  priority INTEGER NOT NULL DEFAULT 100,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 12,
  last_error TEXT,
  last_attempt_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_sync_jobs_status_next ON public.crm_sync_jobs(status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_crm_sync_jobs_user ON public.crm_sync_jobs(user_id);

CREATE TABLE IF NOT EXISTS public.crm_sync_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.crm_sync_jobs(id) ON DELETE CASCADE,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success BOOLEAN NOT NULL,
  http_status INTEGER,
  error_message TEXT,
  request_json JSONB,
  response_json JSONB
);

CREATE INDEX IF NOT EXISTS idx_crm_sync_attempts_job ON public.crm_sync_attempts(job_id);

-- RLS
ALTER TABLE public.crm_contact_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_sync_attempts ENABLE ROW LEVEL SECURITY;

-- Links: user can read their own link (optional, useful for support)
DO $$ BEGIN
  CREATE POLICY "crm_contact_links_select_own"
  ON public.crm_contact_links
  FOR SELECT
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Jobs/attempts are internal: only super_admin should read them.
DO $$ BEGIN
  CREATE POLICY "crm_sync_jobs_select_super_admin"
  ON public.crm_sync_jobs
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

DO $$ BEGIN
  CREATE POLICY "crm_sync_attempts_select_super_admin"
  ON public.crm_sync_attempts
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

-- Touch updated_at triggers
CREATE OR REPLACE FUNCTION public.touch_updated_at_crm()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_crm_contact_links_touch ON public.crm_contact_links;
CREATE TRIGGER trg_crm_contact_links_touch
  BEFORE UPDATE ON public.crm_contact_links
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at_crm();

DROP TRIGGER IF EXISTS trg_crm_sync_jobs_touch ON public.crm_sync_jobs;
CREATE TRIGGER trg_crm_sync_jobs_touch
  BEFORE UPDATE ON public.crm_sync_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at_crm();

