-- ============================================================================
-- Fix get_historical_data function to support alliance table
-- ============================================================================
-- This fixes the fan_speed handling for heatpumps
-- Note: We use 'alliance' table (not alliance_calculated)
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_historical_data(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.get_historical_data(
  p_machine_id UUID,
  p_period TEXT,
  p_table_name TEXT
)
RETURNS TABLE (
  "timestamp" TIMESTAMPTZ,
  motor_temp NUMERIC,
  "current" NUMERIC,
  ambient_temp NUMERIC,
  duct_temp NUMERIC,
  delta_t NUMERIC,
  fan_active BOOLEAN,
  is_cooling BOOLEAN,
  is_heating BOOLEAN,
  has_water BOOLEAN,
  pump_active BOOLEAN,
  power NUMERIC,
  voltage NUMERIC,
  fan_speed INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_time TIMESTAMPTZ;
  v_interval INTERVAL;
  v_is_heatpump BOOLEAN;
BEGIN
  -- Check if this is a heatpump table (alliance)
  v_is_heatpump := (p_table_name = 'alliance');

  -- Calculate start time and interval based on period
  CASE p_period
    WHEN '24h' THEN
      v_start_time := NOW() - INTERVAL '24 hours';
      v_interval := INTERVAL '0 seconds'; -- No aggregation for 24h
    WHEN '7d' THEN
      v_start_time := NOW() - INTERVAL '7 days';
      v_interval := INTERVAL '10 minutes'; -- 10-minute buckets
    WHEN '30d' THEN
      v_start_time := NOW() - INTERVAL '30 days';
      v_interval := INTERVAL '1 hour'; -- 1-hour buckets
    WHEN '1y' THEN
      v_start_time := NOW() - INTERVAL '365 days';
      v_interval := INTERVAL '1 day'; -- 1-day buckets
    ELSE
      v_start_time := NOW() - INTERVAL '24 hours';
      v_interval := INTERVAL '0 seconds';
  END CASE;

  -- Build and execute dynamic query based on table name
  -- For 24h: return all readings
  -- For other periods: aggregate by time bucket
  IF v_interval = INTERVAL '0 seconds' THEN
    -- 24h: Return all readings (no aggregation)
    RETURN QUERY EXECUTE format('
      SELECT 
        r.timestamp,
        r.motor_temp,
        r.current,
        r.ambient_temp,
        r.duct_temp,
        r.delta_t,
        r.fan_active,
        COALESCE(r.is_cooling, false) AS is_cooling,
        COALESCE(r.is_heating, false) AS is_heating,
        r.has_water,
        r.pump_active,
        r.power,
        r.voltage,
        CASE 
          WHEN $3 THEN NULL::INTEGER
          ELSE COALESCE(r.fan_speed, 0)
        END AS fan_speed
      FROM %I r
      WHERE r.machine_id = $1
        AND r.timestamp >= $2
      ORDER BY r.timestamp ASC
    ', p_table_name) USING p_machine_id, v_start_time, v_is_heatpump;
  ELSE
    -- 7d, 30d, 1y: Aggregate by time bucket
    RETURN QUERY EXECUTE format('
      SELECT 
        date_bin($3::interval, r.timestamp, ''2000-01-01''::timestamp) AS timestamp,
        AVG(r.motor_temp) AS motor_temp,
        AVG(r.current) AS current,
        AVG(r.ambient_temp) AS ambient_temp,
        AVG(r.duct_temp) AS duct_temp,
        AVG(r.delta_t) AS delta_t,
        BOOL_OR(r.fan_active) AS fan_active, -- True if fan was active at any point in bucket
        BOOL_OR(COALESCE(r.is_cooling, false)) AS is_cooling,
        BOOL_OR(COALESCE(r.is_heating, false)) AS is_heating, -- True if heating was active at any point
        BOOL_OR(r.has_water) AS has_water,
        BOOL_OR(r.pump_active) AS pump_active, -- True if pump was active at any point in bucket
        AVG(r.power) AS power,
        AVG(r.voltage) AS voltage,
        CASE 
          WHEN $4 THEN NULL::INTEGER
          ELSE AVG(COALESCE(r.fan_speed, 0))::INTEGER
        END AS fan_speed
      FROM %I r
      WHERE r.machine_id = $1
        AND r.timestamp >= $2
      GROUP BY date_bin($3::interval, r.timestamp, ''2000-01-01''::timestamp)
      ORDER BY timestamp ASC
    ', p_table_name) USING p_machine_id, v_start_time, v_interval, v_is_heatpump;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_historical_data(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_historical_data(UUID, TEXT, TEXT) TO service_role;

-- Add comment
COMMENT ON FUNCTION public.get_historical_data IS 
'Fetches historical data for a machine with appropriate aggregation:
- 24h: All readings (no aggregation, 3-minute intervals)
- 7d: 10-minute averages
- 30d: 1-hour averages
- 1y: 1-day averages (365 data points)
Returns: timestamp, motor_temp, current, ambient_temp, duct_temp, delta_t, fan_active, is_cooling, is_heating, has_water, pump_active, power, voltage, fan_speed (NULL for heatpumps)
Note: fan_speed is NULL for alliance table since heatpumps do not have variable speed fans
Note: is_heating is only populated for heatpump tables (alliance)
Parameters: machine_id, period (24h|7d|30d|1y), table_name (cirrus|coolbreeze|alliance)';

-- ============================================================================
-- Update historical_data_summary view to include alliance
-- ============================================================================

DROP VIEW IF EXISTS public.historical_data_summary;

CREATE OR REPLACE VIEW public.historical_data_summary AS
SELECT 
  'cirrus' AS table_name,
  machine_id,
  MIN(timestamp) AS earliest_data,
  MAX(timestamp) AS latest_data,
  COUNT(*) AS total_readings,
  COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '365 days') AS readings_last_year
FROM public.cirrus
GROUP BY machine_id
UNION ALL
SELECT 
  'coolbreeze' AS table_name,
  machine_id,
  MIN(timestamp) AS earliest_data,
  MAX(timestamp) AS latest_data,
  COUNT(*) AS total_readings,
  COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '365 days') AS readings_last_year
FROM public.coolbreeze
GROUP BY machine_id
UNION ALL
SELECT 
  'alliance' AS table_name,
  machine_id,
  MIN(timestamp) AS earliest_data,
  MAX(timestamp) AS latest_data,
  COUNT(*) AS total_readings,
  COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '365 days') AS readings_last_year
FROM public.alliance
GROUP BY machine_id;

-- Grant select on view
GRANT SELECT ON public.historical_data_summary TO authenticated;
GRANT SELECT ON public.historical_data_summary TO service_role;

COMMENT ON VIEW public.historical_data_summary IS 
'Summary view showing data ranges for each machine in each processing table. 
Use this to verify what data exists and date ranges.
Updated to include alliance table.';

