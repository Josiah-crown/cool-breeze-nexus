-- profiles.email_subscribed: marketing email opt-in (GDPR). Safe if column already exists.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_subscribed BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.email_subscribed IS
  'User consent for marketing/product email (separate from machine alert emails).';
