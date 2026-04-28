-- ========================================
-- ADD 7d_3m PERIOD (3-minute buckets)
-- Date: April 21, 2026
--
-- Purpose:
-- - Support a 7-day "wide page" with higher resolution data (3-minute averages)
-- - Used by the 24h slider/viewport UI so it can pan across 7 days without
--   interpolating from 10-minute buckets (which looked blocky/strange).
--
-- Expected max points: 7 days * 24 hours * 60 / 3 = 3360 points
-- ========================================

CREATE OR REPLACE FUNCTION public.get_historical_data(
  p_machine_id UUID,
  p_period TEXT DEFAULT '24h',
  p_table_name TEXT DEFAULT 'cirrus'
)
RETURNS TABLE (
  id UUID,
  machine_id UUID,
  "timestamp" TIMESTAMPTZ,
  motor_temp NUMERIC,
  ambient_temp NUMERIC,
  duct_temp NUMERIC,
  delta_t NUMERIC,
  "current" NUMERIC,
  voltage NUMERIC,
  power NUMERIC,
  fan_active BOOLEAN,
  pump_active BOOLEAN,
  is_cooling BOOLEAN,
  is_heating BOOLEAN,
  is_on BOOLEAN,
  has_water BOOLEAN,
  fan_speed INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_time TIMESTAMPTZ;
  v_interval_minutes INTEGER;
BEGIN
  -- Calculate start time and aggregation interval based on period
  CASE p_period
    WHEN '24h' THEN
      v_start_time := NOW() - INTERVAL '24 hours';
      v_interval_minutes := 0;  -- No aggregation
    WHEN '7d_3m' THEN
      v_start_time := NOW() - INTERVAL '7 days';
      v_interval_minutes := 3;  -- 3-minute averages
    WHEN '7d' THEN
      v_start_time := NOW() - INTERVAL '7 days';
      v_interval_minutes := 10;  -- 10-minute averages
    WHEN '30d' THEN
      v_start_time := NOW() - INTERVAL '30 days';
      v_interval_minutes := 60;  -- 1-hour averages
    WHEN '1y' THEN
      v_start_time := NOW() - INTERVAL '1 year';
      v_interval_minutes := 1440;  -- 1-day averages
    ELSE
      v_start_time := NOW() - INTERVAL '24 hours';
      v_interval_minutes := 0;
  END CASE;

  -- CIRRUS
  IF p_table_name = 'cirrus' THEN
    IF v_interval_minutes = 0 THEN
      RETURN QUERY
      SELECT
        c.id,
        c.machine_id,
        c.timestamp,
        c.motor_temp,
        c.ambient_temp,
        c.duct_temp,
        c.delta_t,
        c.current,
        c.voltage,
        c.power,
        c.fan_active,
        c.pump_active,
        c.is_cooling,
        FALSE as is_heating,
        c.is_on,
        c.has_water,
        c.fan_speed,
        c.created_at
      FROM public.cirrus c
      WHERE c.machine_id = p_machine_id
        AND c.timestamp >= v_start_time
      ORDER BY c.timestamp ASC;
    ELSE
      RETURN QUERY
      SELECT
        (array_agg(c.id ORDER BY c.timestamp ASC))[1] as id,
        c.machine_id,
        date_trunc('hour', c.timestamp) +
          (FLOOR(EXTRACT(MINUTE FROM c.timestamp) / v_interval_minutes) * v_interval_minutes || ' minutes')::INTERVAL as timestamp,
        ROUND(AVG(c.motor_temp)::NUMERIC, 2) as motor_temp,
        ROUND(AVG(c.ambient_temp)::NUMERIC, 2) as ambient_temp,
        ROUND(AVG(c.duct_temp)::NUMERIC, 2) as duct_temp,
        ROUND(AVG(c.delta_t)::NUMERIC, 2) as delta_t,
        ROUND(AVG(c.current)::NUMERIC, 2) as current,
        ROUND(AVG(c.voltage)::NUMERIC, 2) as voltage,
        ROUND(AVG(c.power)::NUMERIC, 2) as power,
        BOOL_OR(c.fan_active) as fan_active,
        BOOL_OR(c.pump_active) as pump_active,
        BOOL_OR(c.is_cooling) as is_cooling,
        FALSE as is_heating,
        BOOL_OR(c.is_on) as is_on,
        BOOL_OR(c.has_water) as has_water,
        MAX(c.fan_speed) as fan_speed,
        MIN(c.created_at) as created_at
      FROM public.cirrus c
      WHERE c.machine_id = p_machine_id
        AND c.timestamp >= v_start_time
      GROUP BY c.machine_id,
        date_trunc('hour', c.timestamp) +
        (FLOOR(EXTRACT(MINUTE FROM c.timestamp) / v_interval_minutes) * v_interval_minutes || ' minutes')::INTERVAL
      ORDER BY timestamp ASC;
    END IF;

  -- COOLBREEZE
  ELSIF p_table_name = 'coolbreeze' THEN
    IF v_interval_minutes = 0 THEN
      RETURN QUERY
      SELECT
        cb.id,
        cb.machine_id,
        cb.timestamp,
        cb.motor_temp,
        cb.ambient_temp,
        cb.duct_temp,
        cb.delta_t,
        cb.current,
        cb.voltage,
        cb.power,
        cb.fan_active,
        cb.pump_active,
        cb.is_cooling,
        FALSE as is_heating,
        cb.is_on,
        cb.has_water,
        cb.fan_speed,
        cb.created_at
      FROM public.coolbreeze cb
      WHERE cb.machine_id = p_machine_id
        AND cb.timestamp >= v_start_time
      ORDER BY cb.timestamp ASC;
    ELSE
      RETURN QUERY
      SELECT
        (array_agg(cb.id ORDER BY cb.timestamp ASC))[1] as id,
        cb.machine_id,
        date_trunc('hour', cb.timestamp) +
          (FLOOR(EXTRACT(MINUTE FROM cb.timestamp) / v_interval_minutes) * v_interval_minutes || ' minutes')::INTERVAL as timestamp,
        ROUND(AVG(cb.motor_temp)::NUMERIC, 2) as motor_temp,
        ROUND(AVG(cb.ambient_temp)::NUMERIC, 2) as ambient_temp,
        ROUND(AVG(cb.duct_temp)::NUMERIC, 2) as duct_temp,
        ROUND(AVG(cb.delta_t)::NUMERIC, 2) as delta_t,
        ROUND(AVG(cb.current)::NUMERIC, 2) as current,
        ROUND(AVG(cb.voltage)::NUMERIC, 2) as voltage,
        ROUND(AVG(cb.power)::NUMERIC, 2) as power,
        BOOL_OR(cb.fan_active) as fan_active,
        BOOL_OR(cb.pump_active) as pump_active,
        BOOL_OR(cb.is_cooling) as is_cooling,
        FALSE as is_heating,
        BOOL_OR(cb.is_on) as is_on,
        BOOL_OR(cb.has_water) as has_water,
        MAX(cb.fan_speed) as fan_speed,
        MIN(cb.created_at) as created_at
      FROM public.coolbreeze cb
      WHERE cb.machine_id = p_machine_id
        AND cb.timestamp >= v_start_time
      GROUP BY cb.machine_id,
        date_trunc('hour', cb.timestamp) +
        (FLOOR(EXTRACT(MINUTE FROM cb.timestamp) / v_interval_minutes) * v_interval_minutes || ' minutes')::INTERVAL
      ORDER BY timestamp ASC;
    END IF;

  -- ALLIANCE
  ELSIF p_table_name = 'alliance' THEN
    IF v_interval_minutes = 0 THEN
      RETURN QUERY
      SELECT
        a.id,
        a.machine_id,
        a.timestamp,
        a.motor_temp,
        a.ambient_temp,
        a.duct_temp,
        a.delta_t,
        a.current,
        a.voltage,
        a.power,
        a.fan_active,
        a.pump_active,
        FALSE as is_cooling,
        a.is_heating,
        a.is_on,
        a.has_water,
        0 as fan_speed,
        a.created_at
      FROM public.alliance a
      WHERE a.machine_id = p_machine_id
        AND a.timestamp >= v_start_time
      ORDER BY a.timestamp ASC;
    ELSE
      RETURN QUERY
      SELECT
        (array_agg(a.id ORDER BY a.timestamp ASC))[1] as id,
        a.machine_id,
        date_trunc('hour', a.timestamp) +
          (FLOOR(EXTRACT(MINUTE FROM a.timestamp) / v_interval_minutes) * v_interval_minutes || ' minutes')::INTERVAL as timestamp,
        ROUND(AVG(a.motor_temp)::NUMERIC, 2) as motor_temp,
        ROUND(AVG(a.ambient_temp)::NUMERIC, 2) as ambient_temp,
        ROUND(AVG(a.duct_temp)::NUMERIC, 2) as duct_temp,
        ROUND(AVG(a.delta_t)::NUMERIC, 2) as delta_t,
        ROUND(AVG(a.current)::NUMERIC, 2) as current,
        ROUND(AVG(a.voltage)::NUMERIC, 2) as voltage,
        ROUND(AVG(a.power)::NUMERIC, 2) as power,
        BOOL_OR(a.fan_active) as fan_active,
        BOOL_OR(a.pump_active) as pump_active,
        FALSE as is_cooling,
        BOOL_OR(a.is_heating) as is_heating,
        BOOL_OR(a.is_on) as is_on,
        BOOL_OR(a.has_water) as has_water,
        0 as fan_speed,
        MIN(a.created_at) as created_at
      FROM public.alliance a
      WHERE a.machine_id = p_machine_id
        AND a.timestamp >= v_start_time
      GROUP BY a.machine_id,
        date_trunc('hour', a.timestamp) +
        (FLOOR(EXTRACT(MINUTE FROM a.timestamp) / v_interval_minutes) * v_interval_minutes || ' minutes')::INTERVAL
      ORDER BY timestamp ASC;
    END IF;
  ELSE
    RAISE EXCEPTION 'Unknown table: %', p_table_name;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_historical_data(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_historical_data(UUID, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_historical_data(UUID, TEXT, TEXT) TO service_role;

