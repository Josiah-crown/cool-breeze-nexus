-- Temperature Reading Validation
-- Rejects obviously invalid temperature readings from DS18B20 sensors
-- Handles electrical interference issues (-127°C, -999°C, out-of-range values)

-- Function to validate temperature reading
CREATE OR REPLACE FUNCTION public.validate_temperature_reading(
  p_temp NUMERIC,
  p_min_valid NUMERIC DEFAULT -50.0,
  p_max_valid NUMERIC DEFAULT 120.0
) RETURNS BOOLEAN AS $$
BEGIN
  -- Check for NULL
  IF p_temp IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check for DS18B20 error codes
  IF p_temp = -127.0 OR p_temp = -999.0 THEN
    RETURN false;
  END IF;
  
  -- Check for out-of-range values
  IF p_temp < p_min_valid OR p_temp > p_max_valid THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Note: The processor function (process_cirrus_reading) already includes
-- temperature validation checks. This function is available for use
-- in other contexts if needed.

COMMENT ON FUNCTION public.validate_temperature_reading IS 'Validates temperature readings to reject DS18B20 error codes (-127°C, -999°C) and out-of-range values caused by electrical interference';

