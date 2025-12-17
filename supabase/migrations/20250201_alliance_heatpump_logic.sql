-- ========================================
-- ALLIANCE HEATPUMP LOGIC UPDATE
-- ========================================
-- Purpose: Update Alliance manufacturer to support new heatpump logic
-- Date: 2025-02-01
-- 
-- Changes:
-- 1. GPIO5 (voltage_input_5) = heating relay (like float switch for water)
-- 2. Pump determined by current (>1 amp = on, <1 amp = off)
-- 3. Compressor status with 5-minute delay and complex logic
-- 4. Frontend displays: Connected, HEAT, Pump, Compressor Status
-- ========================================

-- ========================================
-- 1. ADD voltage_input_5 TO readings_raw (for GPIO5)
-- ========================================

ALTER TABLE public.readings_raw
ADD COLUMN IF NOT EXISTS voltage_input_5 NUMERIC(5,2);

COMMENT ON COLUMN public.readings_raw.voltage_input_5 IS 
  'GPIO5 - Float switch for evaporative coolers, Heat relay for heatpumps';

-- ========================================
-- 2. CREATE alliance_calculated TABLE IF NOT EXISTS
-- ========================================

-- Create alliance_calculated table if it doesn't exist (matches schema from 000_COMPLETE_DATABASE_SCHEMA.sql)
CREATE TABLE IF NOT EXISTS public.alliance_calculated (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Processed temperatures
  ambient_temp NUMERIC(5,2),
  duct_temp NUMERIC(5,2),
  motor_temp NUMERIC(5,2),
  delta_t NUMERIC(5,2),
  
  -- Main electrical (from CT)
  voltage NUMERIC(6,2),  -- Line voltage from CT
  current NUMERIC(6,2),
  power NUMERIC(7,2),
  
  -- Pickup voltages (all 6, mapped from voltage_inputs via voltage_config)
  voltage_1 NUMERIC(5,2),
  voltage_2 NUMERIC(5,2),
  voltage_3 NUMERIC(5,2),
  voltage_4 NUMERIC(5,2),
  voltage_5 NUMERIC(5,2),
  voltage_6 NUMERIC(5,2),
  
  -- Operational states (calculated from pickup voltages)
  fan_active BOOLEAN NOT NULL DEFAULT false,
  pump_active BOOLEAN NOT NULL DEFAULT false,
  drain_active BOOLEAN NOT NULL DEFAULT false,
  exhaust_active BOOLEAN NOT NULL DEFAULT false,
  is_cooling BOOLEAN NOT NULL DEFAULT false,
  is_heating BOOLEAN NOT NULL DEFAULT false,
  is_on BOOLEAN NOT NULL DEFAULT false,
  is_connected BOOLEAN NOT NULL DEFAULT true,
  
  -- Water status
  has_water BOOLEAN NOT NULL DEFAULT true,
  
  -- Calculated status
  overall_status TEXT NOT NULL DEFAULT 'unknown' 
    CHECK (overall_status IN ('operational', 'warning', 'error', 'offline', 'unknown')),
  motor_status TEXT NOT NULL DEFAULT 'normal'
    CHECK (motor_status IN ('normal', 'warning', 'critical')),
  water_status TEXT NOT NULL DEFAULT 'ok'
    CHECK (water_status IN ('ok', 'low', 'empty')),
  cooling_status TEXT NOT NULL DEFAULT 'idle'
    CHECK (cooling_status IN ('idle', 'active', 'inefficient')),
  heating_status TEXT NOT NULL DEFAULT 'idle'
    CHECK (heating_status IN ('idle', 'active', 'inefficient', 'excessive')),
  
  -- Compressor status (new fields for heatpump logic)
  compressor_status TEXT DEFAULT 'good' CHECK (compressor_status IN ('good', 'warning', 'failed')),
  compressor_issue_first_detected_at TIMESTAMPTZ,
  
  -- Parameter compliance flags
  motor_temp_within_parameters BOOLEAN,
  current_within_parameters BOOLEAN,
  voltage_within_parameters BOOLEAN,
  power_within_parameters BOOLEAN,
  water_within_parameters BOOLEAN,
  setpoint_within_parameters BOOLEAN,
  
  -- Additional details
  status_details JSONB,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_alliance_calculated_machine_timestamp UNIQUE (machine_id, timestamp)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_alliance_calc_machine_id ON public.alliance_calculated(machine_id);
CREATE INDEX IF NOT EXISTS idx_alliance_calc_timestamp ON public.alliance_calculated(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alliance_calc_machine_timestamp ON public.alliance_calculated(machine_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alliance_calc_status ON public.alliance_calculated(overall_status);

-- ========================================
-- 3. ADD COMPRESSOR STATUS FIELDS TO ALLIANCE (if not already added)
-- ========================================

-- Add compressor_status to alliance_calculated table (if column doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'alliance_calculated' 
    AND column_name = 'compressor_status'
  ) THEN
    ALTER TABLE public.alliance_calculated
    ADD COLUMN compressor_status TEXT DEFAULT 'good'
      CHECK (compressor_status IN ('good', 'warning', 'failed'));
  END IF;
END $$;

-- Add timestamp tracking for compressor issues (if column doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'alliance_calculated' 
    AND column_name = 'compressor_issue_first_detected_at'
  ) THEN
    ALTER TABLE public.alliance_calculated
    ADD COLUMN compressor_issue_first_detected_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add comment
COMMENT ON COLUMN public.alliance_calculated.compressor_status IS 
  'Compressor health status: good (LED ON), warning (LED BLINK), failed (LED OFF). Never shows warning/failed when heat is off.';

COMMENT ON COLUMN public.alliance_calculated.compressor_issue_first_detected_at IS 
  'Timestamp when compressor issue was first detected. Used for 5-minute delay before showing warning/failed status.';

-- ========================================
-- 4. ADD HEATPUMP ALERT FIELDS TO NOTIFICATIONS
-- ========================================

-- Add heatpump-specific alert fields to alliance_notifications
ALTER TABLE public.alliance_notifications
ADD COLUMN IF NOT EXISTS current_min_alert DECIMAL(6,2) DEFAULT 0.5,
ADD COLUMN IF NOT EXISTS current_max_alert DECIMAL(6,2) DEFAULT 30.0,
ADD COLUMN IF NOT EXISTS delta_t_min_heating DECIMAL(5,2) DEFAULT 2.0,
ADD COLUMN IF NOT EXISTS delta_t_max_heating DECIMAL(5,2) DEFAULT 15.0,
ADD COLUMN IF NOT EXISTS setpoint_tolerance DECIMAL(5,2) DEFAULT 5.0,
ADD COLUMN IF NOT EXISTS duration_heating_failure INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS duration_compressor_failure INTEGER DEFAULT 5;

COMMENT ON COLUMN public.alliance_notifications.current_min_alert IS 
  'Minimum current threshold for compressor health check. Below this is considered abnormal.';

COMMENT ON COLUMN public.alliance_notifications.current_max_alert IS 
  'Maximum current threshold for compressor health check. Above this is considered abnormal.';

COMMENT ON COLUMN public.alliance_notifications.delta_t_min_heating IS 
  'Minimum delta T for heating mode. Below this indicates inefficient heating.';

COMMENT ON COLUMN public.alliance_notifications.delta_t_max_heating IS 
  'Maximum delta T for heating mode. Above this indicates excessive heating.';

COMMENT ON COLUMN public.alliance_notifications.setpoint_tolerance IS 
  'Temperature tolerance from setpoint (in degrees). Used to determine if temps are within acceptable range.';

COMMENT ON COLUMN public.alliance_notifications.duration_heating_failure IS 
  'Duration (in minutes) before triggering heating failure alert.';

COMMENT ON COLUMN public.alliance_notifications.duration_compressor_failure IS 
  'Duration (in minutes) before triggering compressor failure alert (5-minute delay).';

-- ========================================
-- 5. UPDATE PROCESSING FUNCTION
-- ========================================

-- Drop existing function
DROP FUNCTION IF EXISTS public.process_alliance_reading() CASCADE;

-- Create updated processing function
CREATE OR REPLACE FUNCTION public.process_alliance_reading()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_machine_type TEXT;
  v_machine_manufacturer TEXT;
  v_machine_setpoint NUMERIC;
  v_status_calc JSONB;
  v_ambient_temp NUMERIC;
  v_duct_temp NUMERIC;
  v_motor_temp NUMERIC;
  v_has_heat BOOLEAN := false;  -- GPIO5 relay switch (like has_water for evap coolers)
  v_fan_active BOOLEAN := false;
  v_pump_active BOOLEAN := false;
  v_compressor_status TEXT := 'good';
  v_is_on BOOLEAN := false;
  v_delta_t NUMERIC;
  v_power NUMERIC;
  v_current NUMERIC;
  v_voltage NUMERIC;
  v_voltage_1 NUMERIC;
  v_voltage_2 NUMERIC;
  v_voltage_3 NUMERIC;
  v_voltage_4 NUMERIC;
  v_voltage_5 NUMERIC;
  v_voltage_6 NUMERIC;
  v_voltage_config RECORD;
  v_alert_config RECORD;
  v_active_threshold NUMERIC := 6.0;
  v_previous_issue_timestamp TIMESTAMPTZ;
  v_current_min_alert NUMERIC := 0.5;
  v_current_max_alert NUMERIC := 30.0;
BEGIN
  -- Check if this machine is an Alliance heat pump
  SELECT m.type, COALESCE(m.manufacturer, ''), m.temperature_setpoint 
  INTO v_machine_type, v_machine_manufacturer, v_machine_setpoint
  FROM public.machines m
  WHERE m.id = NEW.machine_id;
  
  -- Only process if it's an Alliance heat pump
  IF v_machine_type != 'heatpump' OR v_machine_manufacturer != 'Alliance' THEN
    RETURN NEW; -- Skip processing, but allow the insert to continue
  END IF;
  
  -- VALIDATE TEMPERATURE READINGS (reject electrical interference errors)
  -- Skip processing invalid readings but allow the insert to readings_raw to continue
  IF NEW.motor_temp IS NOT NULL AND (NEW.motor_temp = -127.0 OR NEW.motor_temp = -999.0 OR NEW.motor_temp < -50.0 OR NEW.motor_temp > 120.0) THEN
    RAISE WARNING 'Invalid motor temperature reading: % for machine % - skipping processing', NEW.motor_temp, NEW.machine_id;
    RETURN NEW; -- Skip processing but allow insert to readings_raw
  END IF;
  
  IF NEW.outside_temp IS NOT NULL AND (NEW.outside_temp = -127.0 OR NEW.outside_temp = -999.0 OR NEW.outside_temp < -50.0 OR NEW.outside_temp > 120.0) THEN
    RAISE WARNING 'Invalid outside temperature reading: % for machine % - skipping processing', NEW.outside_temp, NEW.machine_id;
    RETURN NEW; -- Skip processing but allow insert to readings_raw
  END IF;
  
  IF NEW.inside_temp IS NOT NULL AND (NEW.inside_temp = -127.0 OR NEW.inside_temp = -999.0 OR NEW.inside_temp < -50.0 OR NEW.inside_temp > 120.0) THEN
    RAISE WARNING 'Invalid inside temperature reading: % for machine % - skipping processing', NEW.inside_temp, NEW.machine_id;
    RETURN NEW; -- Skip processing but allow insert to readings_raw
  END IF;
  
  -- Extract RAW temperature values
  v_ambient_temp := NEW.outside_temp;
  v_duct_temp := NEW.inside_temp;
  v_motor_temp := NEW.motor_temp;
  
  -- Extract RAW electrical values
  v_current := COALESCE(NEW.current, 0);
  v_voltage := NEW.voltage;
  v_power := COALESCE((NEW.voltage * COALESCE(NEW.current, 0)), 0);
  
  -- Calculate Delta T (outlet - inlet, positive for heating)
  IF v_duct_temp IS NOT NULL AND v_ambient_temp IS NOT NULL THEN
    v_delta_t := v_duct_temp - v_ambient_temp;
  ELSE
    v_delta_t := NULL;
  END IF;
  
  -- Get voltage configuration for this machine (if exists)
  SELECT * INTO v_voltage_config
  FROM public.alliance_voltage_config
  WHERE machine_id = NEW.machine_id
  LIMIT 1;
  
  -- Get active threshold from config or use default
  IF v_voltage_config IS NOT NULL THEN
    v_active_threshold := COALESCE(v_voltage_config.voltage_active_threshold, 6.0);
  END IF;
  
  -- Get alert configuration for current limits
  SELECT * INTO v_alert_config
  FROM public.alliance_notifications
  WHERE machine_id = NEW.machine_id
  LIMIT 1;
  
  IF v_alert_config IS NOT NULL THEN
    v_current_min_alert := COALESCE(v_alert_config.current_min_alert, 0.5);
    v_current_max_alert := COALESCE(v_alert_config.current_max_alert, 30.0);
  END IF;
  
  -- Map voltage inputs to voltage_1 through voltage_6 based on config
  -- If no config exists, use direct mapping (voltage_input_1 → voltage_1, etc.)
  IF v_voltage_config IS NOT NULL THEN
    -- Map based on voltage_config
    v_voltage_1 := CASE 
      WHEN v_voltage_config.voltage_input_1_function = 'Custom_1' THEN NEW.voltage_input_1
      WHEN v_voltage_config.voltage_input_2_function = 'Custom_1' THEN NEW.voltage_input_2
      WHEN v_voltage_config.voltage_input_3_function = 'Custom_1' THEN NEW.voltage_input_3
      WHEN v_voltage_config.voltage_input_4_function = 'Custom_1' THEN NEW.voltage_input_4
      WHEN v_voltage_config.voltage_input_5_function = 'Custom_1' THEN NEW.voltage_input_5
      WHEN v_voltage_config.voltage_input_6_function = 'Custom_1' THEN NEW.voltage_input_6
      ELSE NULL
    END;
    
    v_voltage_2 := CASE 
      WHEN v_voltage_config.voltage_input_1_function = 'Custom_2' THEN NEW.voltage_input_1
      WHEN v_voltage_config.voltage_input_2_function = 'Custom_2' THEN NEW.voltage_input_2
      WHEN v_voltage_config.voltage_input_3_function = 'Custom_2' THEN NEW.voltage_input_3
      WHEN v_voltage_config.voltage_input_4_function = 'Custom_2' THEN NEW.voltage_input_4
      WHEN v_voltage_config.voltage_input_5_function = 'Custom_2' THEN NEW.voltage_input_5
      WHEN v_voltage_config.voltage_input_6_function = 'Custom_2' THEN NEW.voltage_input_6
      ELSE NULL
    END;
    
    v_voltage_3 := CASE 
      WHEN v_voltage_config.voltage_input_1_function = 'Custom_3' THEN NEW.voltage_input_1
      WHEN v_voltage_config.voltage_input_2_function = 'Custom_3' THEN NEW.voltage_input_2
      WHEN v_voltage_config.voltage_input_3_function = 'Custom_3' THEN NEW.voltage_input_3
      WHEN v_voltage_config.voltage_input_4_function = 'Custom_3' THEN NEW.voltage_input_4
      WHEN v_voltage_config.voltage_input_5_function = 'Custom_3' THEN NEW.voltage_input_5
      WHEN v_voltage_config.voltage_input_6_function = 'Custom_3' THEN NEW.voltage_input_6
      ELSE NULL
    END;
    
    v_voltage_4 := CASE 
      WHEN v_voltage_config.voltage_input_1_function = 'Custom_4' THEN NEW.voltage_input_1
      WHEN v_voltage_config.voltage_input_2_function = 'Custom_4' THEN NEW.voltage_input_2
      WHEN v_voltage_config.voltage_input_3_function = 'Custom_4' THEN NEW.voltage_input_3
      WHEN v_voltage_config.voltage_input_4_function = 'Custom_4' THEN NEW.voltage_input_4
      WHEN v_voltage_config.voltage_input_5_function = 'Custom_4' THEN NEW.voltage_input_5
      WHEN v_voltage_config.voltage_input_6_function = 'Custom_4' THEN NEW.voltage_input_6
      ELSE NULL
    END;
    
    v_voltage_5 := CASE 
      WHEN v_voltage_config.voltage_input_1_function = 'Custom_5' THEN NEW.voltage_input_1
      WHEN v_voltage_config.voltage_input_2_function = 'Custom_5' THEN NEW.voltage_input_2
      WHEN v_voltage_config.voltage_input_3_function = 'Custom_5' THEN NEW.voltage_input_3
      WHEN v_voltage_config.voltage_input_4_function = 'Custom_5' THEN NEW.voltage_input_4
      WHEN v_voltage_config.voltage_input_5_function = 'Custom_5' THEN NEW.voltage_input_5
      WHEN v_voltage_config.voltage_input_6_function = 'Custom_5' THEN NEW.voltage_input_6
      ELSE NULL
    END;
    
    v_voltage_6 := CASE 
      WHEN v_voltage_config.voltage_input_1_function = 'Custom_6' THEN NEW.voltage_input_1
      WHEN v_voltage_config.voltage_input_2_function = 'Custom_6' THEN NEW.voltage_input_2
      WHEN v_voltage_config.voltage_input_3_function = 'Custom_6' THEN NEW.voltage_input_3
      WHEN v_voltage_config.voltage_input_4_function = 'Custom_6' THEN NEW.voltage_input_4
      WHEN v_voltage_config.voltage_input_5_function = 'Custom_6' THEN NEW.voltage_input_5
      WHEN v_voltage_config.voltage_input_6_function = 'Custom_6' THEN NEW.voltage_input_6
      ELSE NULL
    END;
  ELSE
    -- No config: direct mapping
    v_voltage_1 := NEW.voltage_input_1;
    v_voltage_2 := NEW.voltage_input_2;
    v_voltage_3 := NEW.voltage_input_3;
    v_voltage_4 := NEW.voltage_input_4;
    v_voltage_5 := NEW.voltage_input_5;
    v_voltage_6 := NEW.voltage_input_6;
  END IF;
  
  -- ========================================
  -- HEATPUMP SPECIFIC LOGIC
  -- ========================================
  
  -- GPIO5 (voltage_input_5) = PUMP relay switch (like float switch for evaporative coolers)
  -- Shows if pump is running or not
  v_pump_active := COALESCE(v_voltage_5, 0) >= v_active_threshold;
  
  -- HEAT determined by CT current (>1 amp = heating, <1 amp = not heating)
  v_has_heat := v_current > 1.0;
  
  -- FAN active (if using fan, otherwise this may not be relevant for all heatpumps)
  v_fan_active := COALESCE(v_voltage_1, 0) >= v_active_threshold;
  
  -- Machine is "on" if pump relay is active
  v_is_on := v_pump_active;
  
  -- ========================================
  -- COMPRESSOR STATUS CALCULATION
  -- ========================================
  -- Rules:
  -- 1. When pump and heat are on, delta T > 2 → LED ON (good)
  -- 2. When pump and heat are on, (Delta T <= 0) + outlet and inlet within 5 degrees of setpoint → LED ON (good)
  -- 3. When pump and heat are on, CT is within Current alert limits → LED ON (good)
  -- 4. If pump is off, never read Compressor status as "failed" or "warning"
  -- 5. 5 minute delay before reading compressor as "warning" or "failed"
  -- ========================================
  
  IF NOT v_pump_active THEN
    -- Rule 4: If pump is off, always show "good"
    v_compressor_status := 'good';
    v_previous_issue_timestamp := NULL;
  ELSIF v_pump_active AND v_has_heat THEN
    -- Pump and heat are both on - evaluate compressor health
    DECLARE
      v_is_healthy BOOLEAN := false;
      v_outlet_temp NUMERIC := v_duct_temp;
      v_inlet_temp NUMERIC := v_ambient_temp;
      v_setpoint NUMERIC := v_machine_setpoint;
    BEGIN
      -- Rule 1: Delta T > 2
      IF v_delta_t IS NOT NULL AND v_delta_t > 2 THEN
        v_is_healthy := true;
      END IF;
      
      -- Rule 2: (Delta T <= 0) + outlet and inlet within 5 degrees of setpoint
      IF v_delta_t IS NOT NULL AND v_delta_t <= 0 THEN
        IF v_setpoint IS NOT NULL AND v_outlet_temp IS NOT NULL AND v_inlet_temp IS NOT NULL THEN
          IF ABS(v_outlet_temp - v_setpoint) <= 5 AND ABS(v_inlet_temp - v_setpoint) <= 5 THEN
            v_is_healthy := true;
          END IF;
        END IF;
      END IF;
      
      -- Rule 3: CT is within current alert limits
      IF v_current >= v_current_min_alert AND v_current <= v_current_max_alert THEN
        v_is_healthy := true;
      END IF;
      
      -- Determine status with 5-minute delay (Rule 5)
      IF v_is_healthy THEN
        -- System is healthy, clear issue timestamp
        v_compressor_status := 'good';
        v_previous_issue_timestamp := NULL;
      ELSE
        -- System has an issue, check for 5-minute delay
        -- Get previous issue timestamp from the last reading
        SELECT compressor_issue_first_detected_at INTO v_previous_issue_timestamp
        FROM public.alliance_calculated
        WHERE machine_id = NEW.machine_id
          AND compressor_status IN ('warning', 'failed')
        ORDER BY timestamp DESC
        LIMIT 1;
        
        -- If no previous issue timestamp, this is the first detection
        IF v_previous_issue_timestamp IS NULL THEN
          v_previous_issue_timestamp := NEW.timestamp;
          v_compressor_status := 'good';  -- Still showing good during the delay period
        ELSE
          -- Check if 5 minutes have passed
          IF (EXTRACT(EPOCH FROM (NEW.timestamp - v_previous_issue_timestamp)) / 60) >= 5 THEN
            -- 5 minutes have passed, show the issue
            -- Determine if it's warning or failed based on severity
            IF v_delta_t IS NOT NULL AND v_delta_t < -5 THEN
              v_compressor_status := 'failed';  -- Severe issue: cooling instead of heating
            ELSIF v_current < v_current_min_alert OR v_current > v_current_max_alert THEN
              v_compressor_status := 'warning';  -- Current out of range
            ELSE
              v_compressor_status := 'warning';  -- General inefficiency
            END IF;
          ELSE
            -- Still within delay period, show good
            v_compressor_status := 'good';
          END IF;
        END IF;
      END IF;
    END;
  ELSE
    -- Pump is on but heat is off (current < 1A) - compressor not running, status is good
    v_compressor_status := 'good';
    v_previous_issue_timestamp := NULL;
  END IF;
  
  -- Calculate basic status JSONB
  v_status_calc := jsonb_build_object(
    'fan_active', v_fan_active,
    'pump_active', v_pump_active,  -- GPIO5 relay
    'has_heat', v_has_heat,        -- Current > 1A
    'is_on', v_is_on,
    'compressor_status', v_compressor_status
  );
  
  -- Insert into alliance_calculated table
  INSERT INTO public.alliance_calculated (
    machine_id,
    timestamp,
    ambient_temp,
    duct_temp,
    motor_temp,
    delta_t,
    voltage,
    current,
    power,
    voltage_1,
    voltage_2,
    voltage_3,
    voltage_4,
    voltage_5,
    voltage_6,
    fan_active,
    pump_active,
    is_heating,
    is_on,
    is_connected,
    has_water,  -- Repurposed as "has_heat" for frontend compatibility
    overall_status,
    motor_status,
    heating_status,
    compressor_status,
    compressor_issue_first_detected_at,
    status_details
  ) VALUES (
    NEW.machine_id,
    NEW.timestamp,
    v_ambient_temp,
    v_duct_temp,
    v_motor_temp,
    v_delta_t,
    v_voltage,
    v_current,
    v_power,
    v_voltage_1,
    v_voltage_2,
    v_voltage_3,
    v_voltage_4,
    v_voltage_5,
    v_voltage_6,
    v_fan_active,
    v_pump_active,
    v_has_heat,  -- is_heating = has_heat
    v_is_on,
    true,  -- is_connected (assumed true if we're receiving data)
    v_pump_active,  -- Repurposed has_water field as pump for frontend (GPIO5 relay)
    'operational',  -- overall_status (default, can be enhanced)
    'normal',  -- motor_status (default)
    CASE WHEN v_pump_active AND v_has_heat THEN 'active' ELSE 'idle' END,  -- heating_status
    v_compressor_status,
    v_previous_issue_timestamp,
    v_status_calc
  )
  ON CONFLICT (machine_id, timestamp) 
  DO UPDATE SET
    ambient_temp = EXCLUDED.ambient_temp,
    duct_temp = EXCLUDED.duct_temp,
    motor_temp = EXCLUDED.motor_temp,
    delta_t = EXCLUDED.delta_t,
    voltage = EXCLUDED.voltage,
    current = EXCLUDED.current,
    power = EXCLUDED.power,
    voltage_1 = EXCLUDED.voltage_1,
    voltage_2 = EXCLUDED.voltage_2,
    voltage_3 = EXCLUDED.voltage_3,
    voltage_4 = EXCLUDED.voltage_4,
    voltage_5 = EXCLUDED.voltage_5,
    voltage_6 = EXCLUDED.voltage_6,
    fan_active = EXCLUDED.fan_active,
    pump_active = EXCLUDED.pump_active,
    is_heating = EXCLUDED.is_heating,
    is_on = EXCLUDED.is_on,
    has_water = EXCLUDED.has_water,
    compressor_status = EXCLUDED.compressor_status,
    compressor_issue_first_detected_at = EXCLUDED.compressor_issue_first_detected_at,
    status_details = EXCLUDED.status_details,
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'Error processing alliance reading for machine %: %', NEW.machine_id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on readings_raw table (same pattern as Cirrus/CoolBreeze)
DROP TRIGGER IF EXISTS trigger_process_alliance_reading ON public.readings_raw;
CREATE TRIGGER trigger_process_alliance_reading
  AFTER INSERT ON public.readings_raw
  FOR EACH ROW
  EXECUTE FUNCTION public.process_alliance_reading();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.process_alliance_reading() TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_alliance_reading() TO service_role;

COMMENT ON FUNCTION public.process_alliance_reading IS 
  'Processes readings_raw entries for Alliance heatpumps. GPIO5 = pump relay (like float switch), Current > 1A = heating, complex compressor status with 5-minute delay.';

-- ========================================
-- 6. CREATE DEFAULT CONFIGS FOR EXISTING ALLIANCE MACHINES
-- ========================================

-- Update voltage config for Alliance machines to use voltage_input_5 for heat relay
INSERT INTO public.alliance_voltage_config (machine_id, voltage_input_5_function, voltage_active_threshold)
SELECT m.id, 'Custom_5', 6.0
FROM public.machines m
WHERE m.manufacturer = 'Alliance' 
  AND m.type = 'heatpump'
  AND NOT EXISTS (
    SELECT 1 FROM public.alliance_voltage_config avc WHERE avc.machine_id = m.id
  );

-- Create notification config for Alliance machines if not exists
INSERT INTO public.alliance_notifications (
  machine_id,
  current_min_alert,
  current_max_alert,
  delta_t_min_heating,
  delta_t_max_heating,
  setpoint_tolerance,
  duration_heating_failure,
  duration_compressor_failure
)
SELECT 
  m.id,
  0.5,   -- current_min_alert
  30.0,  -- current_max_alert
  2.0,   -- delta_t_min_heating
  15.0,  -- delta_t_max_heating
  5.0,   -- setpoint_tolerance
  5,     -- duration_heating_failure (5 minutes)
  5      -- duration_compressor_failure (5 minutes)
FROM public.machines m
WHERE m.manufacturer = 'Alliance'
  AND m.type = 'heatpump'
  AND NOT EXISTS (
    SELECT 1 FROM public.alliance_notifications an WHERE an.machine_id = m.id
  );

-- ========================================
-- MIGRATION COMPLETE
-- ========================================

COMMENT ON TABLE public.alliance_calculated IS 
  'Calculated data for Alliance heat pumps. GPIO5 = pump relay, heat = current>1A, compressor status with 5-min delay.';

