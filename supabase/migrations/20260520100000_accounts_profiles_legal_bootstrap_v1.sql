-- Accounts bootstrap (Supabase): profiles + legal agreements
-- Safe on greenfield or partial installs: IF NOT EXISTS, DROP/CREATE policies, seed ON CONFLICT DO NOTHING.
-- Depends on: public.user_roles (for super_admin legal document write policy). Apply base schema first if missing.

-- ---------------------------------------------------------------------------
-- 1) profiles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  cell_number TEXT,
  country TEXT,
  state TEXT,
  city TEXT,
  street TEXT,
  suburb TEXT,
  po_box TEXT,
  full_name_business TEXT,
  email_subscribed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cell_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS street TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suburb TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS po_box TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name_business TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_subscribed BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- updated_at helper (shared pattern)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Service role full access profiles" ON public.profiles;
CREATE POLICY "Service role full access profiles" ON public.profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) New auth user → profile row (bypasses RLS; complements client-side insert)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
BEGIN
  v_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''),
    NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
    'User'
  );

  INSERT INTO public.profiles (
    id,
    name,
    email,
    cell_number,
    country,
    state,
    city,
    street,
    suburb,
    po_box,
    full_name_business,
    email_subscribed
  )
  VALUES (
    NEW.id,
    v_name,
    COALESCE(NEW.email, ''),
    '',
    '',
    '',
    '',
    '',
    '',
    NULL,
    v_name,
    false
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'After auth.users insert, ensure public.profiles row exists (SECURITY DEFINER).';

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- ---------------------------------------------------------------------------
-- 3) Legal documents + acceptances (match app + prior migration intent)
-- ---------------------------------------------------------------------------
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

CREATE TABLE IF NOT EXISTS public.legal_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_key TEXT NOT NULL,
  document_version INTEGER NOT NULL CHECK (document_version > 0),
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  UNIQUE(user_id, document_key, document_version)
);

CREATE INDEX IF NOT EXISTS idx_legal_documents_key ON public.legal_documents(document_key);
CREATE INDEX IF NOT EXISTS idx_legal_acceptances_user ON public.legal_acceptances(user_id);
CREATE INDEX IF NOT EXISTS idx_legal_acceptances_doc ON public.legal_acceptances(document_key, document_version);

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
    'This Product Agreement covers the monitoring/SLA service terms tied to your selected offering.\n\n**Draft placeholder**: Replace with your finalized product agreement text.'
  )
ON CONFLICT (document_key, version) DO NOTHING;

GRANT SELECT ON public.legal_documents TO authenticated, anon;
GRANT SELECT, INSERT ON public.legal_acceptances TO authenticated;
GRANT ALL ON public.legal_documents TO service_role;
GRANT ALL ON public.legal_acceptances TO service_role;

-- ---------------------------------------------------------------------------
-- 4) Backfill profiles for existing auth users (migration runs as privileged role)
-- ---------------------------------------------------------------------------
INSERT INTO public.profiles (
  id,
  name,
  email,
  cell_number,
  country,
  state,
  city,
  street,
  suburb,
  po_box,
  full_name_business,
  email_subscribed
)
SELECT
  u.id,
  COALESCE(
    NULLIF(trim(u.raw_user_meta_data->>'name'), ''),
    NULLIF(split_part(COALESCE(u.email, ''), '@', 1), ''),
    'User'
  ),
  COALESCE(u.email, ''),
  '',
  '',
  '',
  '',
  '',
  '',
  NULL,
  COALESCE(
    NULLIF(trim(u.raw_user_meta_data->>'name'), ''),
    NULLIF(split_part(COALESCE(u.email, ''), '@', 1), ''),
    'User'
  ),
  false
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;
