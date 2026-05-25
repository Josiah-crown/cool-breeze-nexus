-- Legal agreements + consent tracking (v1)
-- Purpose: store versioned legal documents and per-user acceptance (audit trail).

-- 1) Versioned legal documents
CREATE TABLE IF NOT EXISTS public.legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_key TEXT NOT NULL CHECK (document_key <> ''),
  version INTEGER NOT NULL CHECK (version > 0),
  title TEXT NOT NULL,
  content_md TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(document_key, version)
);

-- 2) Acceptance audit trail
CREATE TABLE IF NOT EXISTS public.legal_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_key TEXT NOT NULL,
  document_version INTEGER NOT NULL CHECK (document_version > 0),
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  -- Prevent accidental duplicates; allow re-accept only if version changes
  UNIQUE(user_id, document_key, document_version)
);

CREATE INDEX IF NOT EXISTS idx_legal_documents_key ON public.legal_documents(document_key);
CREATE INDEX IF NOT EXISTS idx_legal_acceptances_user ON public.legal_acceptances(user_id);
CREATE INDEX IF NOT EXISTS idx_legal_acceptances_doc ON public.legal_acceptances(document_key, document_version);

-- RLS
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;

-- Documents are readable to everyone (so pages can show them pre-login if needed).
DO $$ BEGIN
  CREATE POLICY "legal_documents_select_all"
  ON public.legal_documents
  FOR SELECT
  USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Only admins can insert/update documents (relies on your existing user_roles model).
-- If you don't have a helper function for admin checks, keep this tight: only allow super_admin role.
DO $$ BEGIN
  CREATE POLICY "legal_documents_write_super_admin"
  ON public.legal_documents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'super_admin'
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users can see their own acceptances.
DO $$ BEGIN
  CREATE POLICY "legal_acceptances_select_own"
  ON public.legal_acceptances
  FOR SELECT
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users can insert their own acceptance rows.
DO $$ BEGIN
  CREATE POLICY "legal_acceptances_insert_own"
  ON public.legal_acceptances
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Seed baseline documents (v1). Replace content_md later with your finalized legal text.
INSERT INTO public.legal_documents (document_key, version, title, content_md)
VALUES
  (
    'privacy_policy',
    1,
    'Privacy Policy',
    'This Privacy Policy explains how Crown Technologies collects, uses, and protects personal data within the Cmonitor platform.\n\n**Draft placeholder**: Replace with your finalized policy text.'
  ),
  (
    'user_agreement',
    1,
    'User Agreement',
    'This User Agreement governs access to and use of the Cmonitor platform.\n\n**Draft placeholder**: Replace with your finalized agreement text.'
  ),
  (
    'data_use_agreement',
    1,
    'Data Use Agreement',
    'This Data Use Agreement describes what operational/telemetry data is collected and how it is used.\n\n**Draft placeholder**: Replace with your finalized agreement text.'
  ),
  (
    'product_agreement',
    1,
    'Product Agreement',
    'This Product Agreement covers the monitoring/SLA service terms tied to your selected offering.\n\n**Draft placeholder**: Replace with your finalized agreement text.'
  )
ON CONFLICT (document_key, version) DO NOTHING;

