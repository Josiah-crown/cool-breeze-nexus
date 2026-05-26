-- Seed only — requires legal_documents table (run 20260526220000 first, or scripts/sql/BOOTSTRAP_LEGAL_TABLES_AND_SEED.sql).
-- Idempotent: ON CONFLICT DO NOTHING.

INSERT INTO public.legal_documents (document_key, version, title, content_md)
SELECT document_key, version, title, content_md
FROM (VALUES
  (
    'privacy_policy'::text,
    1,
    'Privacy Policy'::text,
    E'# Privacy Policy (Cmonitor)\n\n**Crown Technologies** operates the **Cmonitor** platform. This policy describes what personal data we collect, why we collect it, how long we keep it, and your rights.\n\n---\n*Draft v1 — replace with counsel-approved text before production launch.*'::text
  ),
  (
    'user_agreement',
    1,
    'User Agreement',
    E'# User Agreement (Cmonitor)\n\nThis agreement is between **you** and **Crown Technologies** for use of **Cmonitor**.\n\n---\n*Draft v1 — replace with counsel-approved text before production launch.*'
  ),
  (
    'data_use_agreement',
    1,
    'Data Use Agreement',
    E'# Data Use Agreement (Cmonitor)\n\nCovers operational and telemetry data from connected equipment.\n\n---\n*Draft v1 — replace with counsel-approved text before production launch.*'
  ),
  (
    'product_agreement',
    1,
    'Product Agreement',
    E'# Product Agreement (Cmonitor monitoring)\n\nMonitoring service terms for your account or order.\n\n---\n*Draft v1 — replace with counsel-approved text before production launch.*'
  )
) AS v(document_key, version, title, content_md)
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'legal_documents'
)
ON CONFLICT (document_key, version) DO NOTHING;
