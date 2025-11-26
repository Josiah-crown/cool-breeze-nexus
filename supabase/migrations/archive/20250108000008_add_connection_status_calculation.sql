-- Connection Status Calculation
-- Determines if machine is connected based on last reading time
-- Connected = last reading within 10 minutes

-- Function to calculate connection status for a machine
CREATE OR REPLACE FUNCTION public.calculate_machine_connection_status(
  p_machine_id UUID,
  p_timeout_minutes INTEGER DEFAULT 10
) RETURNS BOOLEAN AS $$
DECLARE
  v_last_reading TIMESTAMPTZ;
BEGIN
  -- Get the most recent reading timestamp for this machine
  SELECT MAX(timestamp) INTO v_last_reading
  FROM public.cirrus
  WHERE machine_id = p_machine_id;
  
  -- If no readings exist, return false
  IF v_last_reading IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if last reading is within timeout period
  IF v_last_reading >= (NOW() - (p_timeout_minutes || ' minutes')::INTERVAL) THEN
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to update connection status for all machines
CREATE OR REPLACE FUNCTION public.update_all_machine_connection_status()
RETURNS TABLE(machine_id UUID, is_connected BOOLEAN, last_reading TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  WITH last_readings AS (
    SELECT 
      c.machine_id,
      MAX(c.timestamp) as last_reading_time
    FROM public.cirrus c
    GROUP BY c.machine_id
  )
  SELECT 
    m.id as machine_id,
    COALESCE(lr.last_reading_time >= (NOW() - INTERVAL '10 minutes'), false) as is_connected,
    lr.last_reading_time
  FROM public.machines m
  LEFT JOIN last_readings lr ON lr.machine_id = m.id;
END;
$$ LANGUAGE plpgsql;

-- View to show current connection status for all machines
CREATE OR REPLACE VIEW public.machine_connection_status AS
SELECT 
  m.id as machine_id,
  m.name as machine_name,
  m.type as machine_type,
  MAX(c.timestamp) as last_reading_time,
  CASE 
    WHEN MAX(c.timestamp) >= (NOW() - INTERVAL '10 minutes') THEN true
    ELSE false
  END as is_connected,
  EXTRACT(EPOCH FROM (NOW() - MAX(c.timestamp)))/60 as minutes_since_last_reading
FROM public.machines m
LEFT JOIN public.cirrus c ON c.machine_id = m.id
GROUP BY m.id, m.name, m.type;

COMMENT ON FUNCTION public.calculate_machine_connection_status IS 'Calculates if machine is connected based on last reading time (default 10 minute timeout)';
COMMENT ON VIEW public.machine_connection_status IS 'Shows current connection status for all machines based on last reading time';


