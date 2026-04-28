-- ========================================
-- ADD get_historical_data_json WRAPPER
-- Date: April 22, 2026
--
-- Purpose:
-- PostgREST (the HTTP layer Supabase uses to serve RPC calls) silently
-- truncates SETOF-returning functions at ~1000 rows (db-max-rows). Our
-- 7d_3m period returns up to 3360 rows, so the response was being clipped
-- to the oldest ~1080 rows, making the chart look stuck at 4/15-4/17.
--
-- Fix: Wrap the existing get_historical_data() in a function that returns
-- a single JSONB value (the full array). PostgREST sees "1 row" and no
-- truncation happens. The Edge Function then parses that JSONB and returns
-- the same shape to the frontend (array of row objects), so NO frontend
-- changes are needed.
--
-- This wrapper works for ALL tables (cirrus/coolbreeze/alliance) and ALL
-- periods automatically — it just delegates to get_historical_data().
-- ========================================

CREATE OR REPLACE FUNCTION public.get_historical_data_json(
  p_machine_id UUID,
  p_period TEXT DEFAULT '24h',
  p_table_name TEXT DEFAULT 'cirrus'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (
      SELECT jsonb_agg(to_jsonb(t) ORDER BY t.timestamp ASC)
      FROM public.get_historical_data(p_machine_id, p_period, p_table_name) t
    ),
    '[]'::jsonb
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_historical_data_json(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_historical_data_json(UUID, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_historical_data_json(UUID, TEXT, TEXT) TO service_role;
