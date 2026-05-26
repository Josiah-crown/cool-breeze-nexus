-- =============================================================================
-- Cmonitor — one-shot Supabase SQL Editor bootstrap
-- Use this when you see: relation "public.legal_documents" does not exist
-- Safe to re-run (IF NOT EXISTS / ON CONFLICT DO NOTHING).
-- =============================================================================

-- Optional: profiles marketing opt-in column (Account page)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_subscribed BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.email_subscribed IS
  'User consent for marketing/product email (separate from machine alert emails).';

-- -----------------------------------------------------------------------------
-- 1) Tables
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 2) RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "legal_documents_select_all" ON public.legal_documents;
CREATE POLICY "legal_documents_select_all"
  ON public.legal_documents
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "legal_documents_write_super_admin" ON public.legal_documents;
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

DROP POLICY IF EXISTS "legal_acceptances_select_own" ON public.legal_acceptances;
CREATE POLICY "legal_acceptances_select_own"
  ON public.legal_acceptances
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "legal_acceptances_insert_own" ON public.legal_acceptances;
CREATE POLICY "legal_acceptances_insert_own"
  ON public.legal_acceptances
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT ON public.legal_documents TO authenticated, anon;
GRANT SELECT, INSERT ON public.legal_acceptances TO authenticated;
GRANT ALL ON public.legal_documents TO service_role;
GRANT ALL ON public.legal_acceptances TO service_role;

-- -----------------------------------------------------------------------------
-- 3) Seed four required agreements (v1 draft text)
-- -----------------------------------------------------------------------------
INSERT INTO public.legal_documents (document_key, version, title, content_md)
VALUES
  (
    'privacy_policy',
    1,
    'Privacy Policy',
    E'# Privacy Policy (Cmonitor)\n\n**Crown Technologies** operates the **Cmonitor** platform. This policy describes what personal data we collect, why we collect it, how long we keep it, and your rights.\n\n## What we collect\n- Account details (name, email, phone, business name, address fields you provide)\n- Machine telemetry and alert history for equipment you are authorised to view\n- Audit records when you sign agreements or complete checkout\n\n## How we use data\n- To provide monitoring, alerts, sites/floorplan features, and account services\n- To meet contractual and legal obligations\n- With your consent, for product and marketing email (separate from machine alert emails)\n\n## Sharing\nWe do not sell personal data. We use subprocessors (e.g. hosting, email, payments) under appropriate agreements.\n\n## Retention & security\nData is retained as needed for the service and applicable law. Access is controlled by role-based permissions.\n\n## Your rights\nYou may request access, correction, or deletion where applicable law allows. Contact Crown Technologies using the details on your account or invoice.\n\n## Changes\nWe may publish new versions of this policy. Continued use after notice may require re-acceptance.\n\n---\n*Draft v1 — replace with counsel-approved text before production launch.*'
  ),
  (
    'user_agreement',
    1,
    'User Agreement',
    E'# User Agreement (Cmonitor)\n\nThis agreement is between **you** (the account holder or authorised user) and **Crown Technologies** for use of **Cmonitor**.\n\n## Access\n- You must keep credentials confidential.\n- You may only access machines, sites, and data your role permits.\n- You must not attempt to bypass security or probe systems without written permission.\n\n## Acceptable use\n- Use the platform for lawful monitoring and building-management purposes.\n- Do not misuse alerts, exports, or APIs to harass, spam, or disrupt others.\n\n## Availability\nWe aim for reliable service but do not guarantee uninterrupted operation. Maintenance and third-party outages may occur.\n\n## Liability\nTo the extent permitted by law, liability is limited as set out in your product/service agreement and applicable South African law.\n\n## Termination\nWe may suspend access for breach, non-payment, or safety. You may stop using the service and request account closure.\n\n---\n*Draft v1 — replace with counsel-approved text before production launch.*'
  ),
  (
    'data_use_agreement',
    1,
    'Data Use Agreement',
    E'# Data Use Agreement (Cmonitor)\n\nThis agreement covers **operational and telemetry data** from connected equipment.\n\n## Data collected\n- Sensor readings (e.g. temperature, humidity, pressure, power-related metrics where configured)\n- Device connectivity status, timestamps, and configuration metadata\n- Alert thresholds, alert events, and notification delivery logs\n\n## Purpose\n- Real-time and historical monitoring\n- Alerts and reporting for authorised users\n- Service quality, diagnostics, and product improvement (aggregated where possible)\n\n## Your responsibilities\n- Ensure you have authority to connect and monitor each machine/site\n- Keep alert recipient lists accurate\n- Do not export or share data outside your organisation without appropriate controls\n\n## Retention\nTelemetry may be retained for operational and warranty purposes. Alert history retention follows your service tier.\n\n---\n*Draft v1 — replace with counsel-approved text before production launch.*'
  ),
  (
    'product_agreement',
    1,
    'Product Agreement',
    E'# Product Agreement (Cmonitor monitoring)\n\nThis agreement describes the **monitoring service** associated with your Cmonitor account or order.\n\n## Scope\n- Remote monitoring and alerting as configured per machine\n- Dashboard access per your role (client, installer, company, or admin)\n- Support channels described on your offer or invoice\n\n## Service levels\nSpecific response targets (e.g. Essential / Comfort / Monitoring tiers) apply only where purchased and documented on your order.\n\n## Hardware & connectivity\nYou are responsible for site power, network, and physical access for installs unless a separate install contract applies.\n\n## Fees\nRecurring or once-off fees are as quoted at checkout or on your signed quote. Non-payment may result in suspended access.\n\n## Warranty & maintenance\nHardware warranty and maintenance are separate unless bundled in writing.\n\n---\n*Draft v1 — replace with counsel-approved text before production launch.*'
  )
ON CONFLICT (document_key, version) DO NOTHING;

-- Verify (should return 4 rows):
-- SELECT document_key, version, title FROM public.legal_documents ORDER BY document_key;
