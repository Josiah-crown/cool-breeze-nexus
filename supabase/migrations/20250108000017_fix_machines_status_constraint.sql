-- Fix machines table overall_status check constraint
-- The old constraint only allowed ('good', 'warning', 'error')
-- But we now use ('operational', 'warning', 'error', 'offline', 'unknown') to match processing tables

-- Drop the old constraint
ALTER TABLE public.machines 
DROP CONSTRAINT IF EXISTS machines_overall_status_check;

-- Add new constraint with updated status values
ALTER TABLE public.machines 
ADD CONSTRAINT machines_overall_status_check 
CHECK (overall_status IN ('operational', 'warning', 'error', 'offline', 'unknown', 'good'));

-- Note: We include 'good' for backward compatibility with existing data
-- But new data should use 'operational' instead of 'good'

COMMENT ON COLUMN public.machines.overall_status IS 'Overall machine status: operational (was "good"), warning, error, offline, or unknown';

