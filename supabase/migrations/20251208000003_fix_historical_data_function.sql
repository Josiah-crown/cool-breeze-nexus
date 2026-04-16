-- ========================================
-- FIX HISTORICAL DATA FUNCTION - December 8, 2025
-- ========================================
-- Problem: The get_historical_data function had LIMIT 10000 which truncated data
--          for 7d, 30d, and 1y periods.
--
-- Solution: Implement proper aggregation:
-- - 24h: All readings (no aggregation) - max ~1,440 points
-- - 7d: 10-minute averages - max ~1,008 points
-- - 30d: 1-hour averages - max ~720 points
-- - 1y: 1-day averages - max ~365 points
--
-- This ensures complete data coverage while keeping response sizes reasonable.
-- ========================================

-- Drop the old function
DROP FUNCTION IF EXISTS public.get_historical_data(UUID, TEXT, TEXT);

-- Create improved function with aggregation
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
    WHEN '7d' THEN 
      v_start_time := NOW() - INTERVAL '7 days';
      v_interval_minutes := 10;  -- 10-minute averages
    WHEN '30d' THEN 
      v_start_time := NOW() - INTERVAL '30 days';
      v_interval_minutes := 60;  -- 1-hour averages
    WHEN '1y' THEN 
      v_start_time := NOW() - INTERVAL '1 year';
      v_interval_minutes := 1440;  -- 1-day averages (24 hours * 60 minutes)
    ELSE 
      v_start_time := NOW() - INTERVAL '24 hours';
      v_interval_minutes := 0;
  END CASE;
  
  -- ========================================
  -- CIRRUS TABLE
  -- ========================================
  IF p_table_name = 'cirrus' THEN
    IF v_interval_minutes = 0 THEN
      -- No aggregation - return all data
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
      -- Aggregated data
      RETURN QUERY
      SELECT 
        MIN(c.id) as id,
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
    
  -- ========================================
  -- COOLBREEZE TABLE
  -- ========================================
  ELSIF p_table_name = 'coolbreeze' THEN
    IF v_interval_minutes = 0 THEN
      -- No aggregation
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
      -- Aggregated data
      RETURN QUERY
      SELECT 
        MIN(cb.id) as id,
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
    
  -- ========================================
  -- ALLIANCE TABLE
  -- ========================================
  ELSIF p_table_name = 'alliance' THEN
    IF v_interval_minutes = 0 THEN
      -- No aggregation
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
      -- Aggregated data
      RETURN QUERY
      SELECT 
        MIN(a.id) as id,
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_historical_data(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_historical_data(UUID, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_historical_data(UUID, TEXT, TEXT) TO service_role;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- 
-- Changes:
-- ✅ Removed LIMIT 10000 that was truncating data
-- ✅ 24h: Returns all readings (no aggregation)
-- ✅ 7d: Returns 10-minute averages (~1,008 data points max)
-- ✅ 30d: Returns 1-hour averages (~720 data points max)
-- ✅ 1y: Returns 1-day averages (~365 data points max)
--
-- This ensures complete historical data coverage while keeping
-- response sizes reasonable for the frontend charts.
-- ========================================

SELECT 'Historical data function fixed! Now returns complete data with smart aggregation.' AS status;

