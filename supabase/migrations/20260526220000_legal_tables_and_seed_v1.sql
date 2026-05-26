-- Creates legal_documents + legal_acceptances if missing, then seeds v1 drafts.
-- For production that never ran 20260506000000 / 20260520100000 legal sections.

CREATE TABLE IF NOT EXISTS public.legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_key TEXT NOT NULL CHECK (document_key <> ''),
  version INTEGER NOT NULL CHECK (version > 0),
  title TEXT NOT NULL,
  content_md TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (document_key, version)
);

CREATE TABLE IF NOT EXISTS public.legal_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_key TEXT NOT NULL,
  document_version INTEGER NOT NULL CHECK (document_version > 0),
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  UNIQUE (user_id, document_key, document_version)
);

CREATE INDEX IF NOT EXISTS idx_legal_documents_key ON public.legal_documents (document_key);
CREATE INDEX IF NOT EXISTS idx_legal_acceptances_user ON public.legal_acceptances (user_id);
CREATE INDEX IF NOT EXISTS idx_legal_acceptances_doc ON public.legal_acceptances (document_key, document_version);

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "legal_documents_select_all" ON public.legal_documents;
CREATE POLICY "legal_documents_select_all"
  ON public.legal_documents FOR SELECT USING (true);

DROP POLICY IF EXISTS "legal_documents_write_super_admin" ON public.legal_documents;
CREATE POLICY "legal_documents_write_super_admin"
  ON public.legal_documents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "legal_acceptances_select_own" ON public.legal_acceptances;
CREATE POLICY "legal_acceptances_select_own"
  ON public.legal_acceptances FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "legal_acceptances_insert_own" ON public.legal_acceptances;
CREATE POLICY "legal_acceptances_insert_own"
  ON public.legal_acceptances FOR INSERT WITH CHECK (auth.uid() = user_id);

GRANT SELECT ON public.legal_documents TO authenticated, anon;
GRANT SELECT, INSERT ON public.legal_acceptances TO authenticated;
GRANT ALL ON public.legal_documents TO service_role;
GRANT ALL ON public.legal_acceptances TO service_role;

INSERT INTO public.legal_documents (document_key, version, title, content_md)
VALUES
  ('privacy_policy', 1, 'Privacy Policy', E'# Privacy Policy (Cmonitor)\n\n**Crown Technologies** operates the **Cmonitor** platform.\n\n---\n*Draft v1.*'),
  ('user_agreement', 1, 'User Agreement', E'# User Agreement (Cmonitor)\n\n---\n*Draft v1.*'),
  ('data_use_agreement', 1, 'Data Use Agreement', E'# Data Use Agreement (Cmonitor)\n\n---\n*Draft v1.*'),
  ('product_agreement', 1, 'Product Agreement', E'# Product Agreement (Cmonitor)\n\n---\n*Draft v1.*')
ON CONFLICT (document_key, version) DO NOTHING;
