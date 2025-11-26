-- Add notifications_enabled column to machines table
ALTER TABLE public.machines 
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN NOT NULL DEFAULT false;

-- Add comment
COMMENT ON COLUMN public.machines.notifications_enabled IS 'Whether push notifications are enabled for this machine';


