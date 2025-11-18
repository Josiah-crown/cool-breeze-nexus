-- Add rate limiting table to prevent duplicate edge function calls
-- This helps optimize bandwidth by preventing multiple inserts within a short time window

CREATE TABLE IF NOT EXISTS public.edge_function_rate_limit (
  machine_id UUID PRIMARY KEY REFERENCES public.machines(id) ON DELETE CASCADE,
  last_call_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  call_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_rate_limit_machine ON public.edge_function_rate_limit(machine_id);

-- Function to check and update rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_machine_id UUID,
  p_min_interval_seconds INTEGER DEFAULT 120  -- 2 minutes default
) RETURNS BOOLEAN AS $$
DECLARE
  v_last_call TIMESTAMPTZ;
  v_seconds_since_last_call INTEGER;
BEGIN
  -- Get last call time
  SELECT last_call_at INTO v_last_call
  FROM public.edge_function_rate_limit
  WHERE machine_id = p_machine_id;
  
  -- If no record exists, allow the call and create record
  IF v_last_call IS NULL THEN
    INSERT INTO public.edge_function_rate_limit (machine_id, last_call_at, call_count)
    VALUES (p_machine_id, NOW(), 1)
    ON CONFLICT (machine_id) DO UPDATE
    SET last_call_at = NOW(), call_count = edge_function_rate_limit.call_count + 1, updated_at = NOW();
    RETURN TRUE;
  END IF;
  
  -- Calculate seconds since last call
  v_seconds_since_last_call := EXTRACT(EPOCH FROM (NOW() - v_last_call))::INTEGER;
  
  -- If enough time has passed, allow the call
  IF v_seconds_since_last_call >= p_min_interval_seconds THEN
    UPDATE public.edge_function_rate_limit
    SET last_call_at = NOW(), call_count = call_count + 1, updated_at = NOW()
    WHERE machine_id = p_machine_id;
    RETURN TRUE;
  END IF;
  
  -- Rate limit exceeded
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE public.edge_function_rate_limit ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access rate limit table
CREATE POLICY "Service role can manage rate limits"
  ON public.edge_function_rate_limit
  FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE public.edge_function_rate_limit IS 'Rate limiting for edge function calls to prevent excessive requests';
COMMENT ON FUNCTION public.check_rate_limit IS 'Checks if enough time has passed since last call for a machine. Returns TRUE if call is allowed, FALSE if rate limited.';


