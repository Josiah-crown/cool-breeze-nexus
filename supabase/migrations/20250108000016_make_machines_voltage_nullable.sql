-- Make voltage column nullable in machines table
-- Since we're now using processing tables (cirrus, coolbreeze) for historical data,
-- the machines table voltage can be nullable (it's just for current status display)

ALTER TABLE public.machines 
ALTER COLUMN voltage DROP NOT NULL;

-- Also make other sensor reading columns nullable since they're now in processing tables
ALTER TABLE public.machines 
ALTER COLUMN current DROP NOT NULL,
ALTER COLUMN power DROP NOT NULL,
ALTER COLUMN motor_temp DROP NOT NULL,
ALTER COLUMN outside_temp DROP NOT NULL,
ALTER COLUMN inside_temp DROP NOT NULL,
ALTER COLUMN delta_t DROP NOT NULL;

-- Update comment
COMMENT ON COLUMN public.machines.voltage IS 'Current voltage reading (nullable - historical data is in processing tables)';
COMMENT ON COLUMN public.machines.current IS 'Current current reading (nullable - historical data is in processing tables)';
COMMENT ON COLUMN public.machines.power IS 'Current power reading (nullable - historical data is in processing tables)';
COMMENT ON COLUMN public.machines.motor_temp IS 'Current motor temperature (nullable - historical data is in processing tables)';
COMMENT ON COLUMN public.machines.outside_temp IS 'Current outside temperature (nullable - historical data is in processing tables)';
COMMENT ON COLUMN public.machines.inside_temp IS 'Current inside temperature (nullable - historical data is in processing tables)';
COMMENT ON COLUMN public.machines.delta_t IS 'Current delta T (nullable - historical data is in processing tables)';

