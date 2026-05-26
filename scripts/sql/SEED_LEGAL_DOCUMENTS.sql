-- STOP: If you get "relation public.legal_documents does not exist",
-- run BOOTSTRAP_LEGAL_TABLES_AND_SEED.sql instead (creates tables + seed).
--
-- This file only INSERTs rows — use after tables exist.

INSERT INTO public.legal_documents (document_key, version, title, content_md)
VALUES
  (
    'privacy_policy',
    1,
    'Privacy Policy',
    E'# Privacy Policy (Cmonitor)\n\n**Crown Technologies** operates the **Cmonitor** platform.\n\n---\n*Draft v1.*'
  ),
  (
    'user_agreement',
    1,
    'User Agreement',
    E'# User Agreement (Cmonitor)\n\n---\n*Draft v1.*'
  ),
  (
    'data_use_agreement',
    1,
    'Data Use Agreement',
    E'# Data Use Agreement (Cmonitor)\n\n---\n*Draft v1.*'
  ),
  (
    'product_agreement',
    1,
    'Product Agreement',
    E'# Product Agreement (Cmonitor)\n\n---\n*Draft v1.*'
  )
ON CONFLICT (document_key, version) DO NOTHING;
