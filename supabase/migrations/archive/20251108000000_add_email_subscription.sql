-- Add email_subscribed column to profiles table for GDPR compliance
-- Users must explicitly opt-in to receive email notifications

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email_subscribed BOOLEAN NOT NULL DEFAULT false;

-- Add comment explaining the field
COMMENT ON COLUMN public.profiles.email_subscribed IS 'User consent for receiving email notifications (GDPR compliant). Must be explicitly enabled.';

-- Grant permissions
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

