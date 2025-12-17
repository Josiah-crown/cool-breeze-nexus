-- ========================================
-- COMPLETE COOLBREEZE SETUP
-- ========================================
-- Purpose: Create all missing CoolBreeze tables and fix processing
-- Date: 2025-02-03
-- 
-- This creates the same table structure that Cirrus has:
-- - coolbreeze (data table) - ALREADY EXISTS
-- - coolbreeze_voltage_config (configuration)
-- - coolbreeze_notifications (alert thresholds)
-- - process_coolbreeze_reading() function
-- - trigger for processing
-- ========================================

-- ========================================
-- 1. CREATE COOLBREEZE_VOLTAGE_CONFIG TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS public.coolbreeze_voltage_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  voltage_input_1_function TEXT DEFAULT 'Custom_1',  -- Fan
  voltage_input_2_function TEXT DEFAULT 'Custom_2',  -- Pump
  voltage_input_3_function TEXT DEFAULT 'Custom_3',  -- Drain
  voltage_input_4_function TEXT DEFAULT 'Custom_4',  -- Exhaust
  voltage_input_5_function TEXT DEFAULT 'Custom_5',  -- GPIO5 Water/Float
  voltage_input_6_function TEXT DEFAULT 'unused',
  voltage_active_threshold NUMERIC(4,2) DEFAULT 6.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_coolbreeze_voltage_config_machine UNIQUE (machine_id)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_coolbreeze_voltage_config_machine_id 
ON public.coolbreeze_voltage_config(machine_id);

-- Add comment
COMMENT ON TABLE public.coolbreeze_voltage_config IS 
  'Voltage input configuration for CoolBreeze machines. Default: input_1=Fan, input_2=Pump, input_3=Drain, input_4=Exhaust, input_5=Water(GPIO5)';

-- ========================================
-- 2. CREATE COOLBREEZE_NOTIFICATIONS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS public.coolbreeze_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  
  -- Temperature thresholds
  motor_temp_warning DECIMAL(5,2) DEFAULT 70.0,
  motor_temp_critical DECIMAL(5,2) DEFAULT 85.0,
  
  -- Current thresholds
  motor_amps_warning DECIMAL(6,2) DEFAULT 8.0,
  
  -- Voltage thresholds
  voltage_min DECIMAL(5,2) DEFAULT 200.0,
  voltage_max DECIMAL(5,2) DEFAULT 250.0,
  pickup_voltage_min DECIMAL(4,2) DEFAULT 6.0,
  
  -- Delta T thresholds
  delta_t_min_cooling DECIMAL(5,2) DEFAULT 3.0,
  
  -- Duration thresholds (minutes)
  duration_motor_temp_critical INTEGER DEFAULT 5,
  duration_fan_failure INTEGER DEFAULT 5,
  duration_water_empty INTEGER DEFAULT 30,
  
  -- Alert settings
  reminder_interval_hours INTEGER DEFAULT 24,
  send_recovery_emails BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_coolbreeze_notifications_machine UNIQUE (machine_id)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_coolbreeze_notifications_machine_id 
ON public.coolbreeze_notifications(machine_id);

-- Add comment
COMMENT ON TABLE public.coolbreeze_notifications IS 
  'Notification thresholds and settings for CoolBreeze evaporative coolers';

-- ========================================
-- 3. ADD MISSING COLUMNS TO COOLBREEZE TABLE
-- ========================================

-- Add exhaust_voltage column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'coolbreeze' 
    AND column_name = 'exhaust_voltage'
  ) THEN
    ALTER TABLE public.coolbreeze
    ADD COLUMN exhaust_voltage NUMERIC(5,2);
  END IF;
END $$;

-- Add exhaust_status column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'coolbreeze' 
    AND column_name = 'exhaust_status'
  ) THEN
    ALTER TABLE public.coolbreeze
    ADD COLUMN exhaust_status TEXT DEFAULT 'OFF';
  END IF;
END $$;

-- Add exhaust_active column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'coolbreeze' 
    AND column_name = 'exhaust_active'
  ) THEN
    ALTER TABLE public.coolbreeze
    ADD COLUMN exhaust_active BOOLEAN DEFAULT false;
  END IF;
END $$;

-- ========================================
-- 4. ENABLE RLS ON NEW TABLES
-- ========================================

ALTER TABLE public.coolbreeze_voltage_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coolbreeze_notifications ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 5. CREATE RLS POLICIES FOR COOLBREEZE_VOLTAGE_CONFIG
-- ========================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own coolbreeze voltage config" ON public.coolbreeze_voltage_config;
DROP POLICY IF EXISTS "Users can insert their own coolbreeze voltage config" ON public.coolbreeze_voltage_config;
DROP POLICY IF EXISTS "Users can update their own coolbreeze voltage config" ON public.coolbreeze_voltage_config;
DROP POLICY IF EXISTS "Service role full access to coolbreeze_voltage_config" ON public.coolbreeze_voltage_config;

-- SELECT policy
CREATE POLICY "Users can view their own coolbreeze voltage config"
ON public.coolbreeze_voltage_config
FOR SELECT
USING (
  machine_id IN (
    SELECT id FROM public.machines WHERE owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- INSERT policy
CREATE POLICY "Users can insert their own coolbreeze voltage config"
ON public.coolbreeze_voltage_config
FOR INSERT
WITH CHECK (
  machine_id IN (
    SELECT id FROM public.machines WHERE owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- UPDATE policy
CREATE POLICY "Users can update their own coolbreeze voltage config"
ON public.coolbreeze_voltage_config
FOR UPDATE
USING (
  machine_id IN (
    SELECT id FROM public.machines WHERE owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- Service role policy
CREATE POLICY "Service role full access to coolbreeze_voltage_config"
ON public.coolbreeze_voltage_config
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ========================================
-- 6. CREATE RLS POLICIES FOR COOLBREEZE_NOTIFICATIONS
-- ========================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own coolbreeze notifications" ON public.coolbreeze_notifications;
DROP POLICY IF EXISTS "Users can insert their own coolbreeze notifications" ON public.coolbreeze_notifications;
DROP POLICY IF EXISTS "Users can update their own coolbreeze notifications" ON public.coolbreeze_notifications;
DROP POLICY IF EXISTS "Service role full access to coolbreeze_notifications" ON public.coolbreeze_notifications;

-- SELECT policy
CREATE POLICY "Users can view their own coolbreeze notifications"
ON public.coolbreeze_notifications
FOR SELECT
USING (
  machine_id IN (
    SELECT id FROM public.machines WHERE owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- INSERT policy
CREATE POLICY "Users can insert their own coolbreeze notifications"
ON public.coolbreeze_notifications
FOR INSERT
WITH CHECK (
  machine_id IN (
    SELECT id FROM public.machines WHERE owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- UPDATE policy
CREATE POLICY "Users can update their own coolbreeze notifications"
ON public.coolbreeze_notifications
FOR UPDATE
USING (
  machine_id IN (
    SELECT id FROM public.machines WHERE owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- Service role policy
CREATE POLICY "Service role full access to coolbreeze_notifications"
ON public.coolbreeze_notifications
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ========================================
-- 7. DROP AND RECREATE PROCESSING FUNCTION
-- ========================================

DROP TRIGGER IF EXISTS trigger_process_coolbreeze_reading ON public.readings_raw;
DROP FUNCTION IF EXISTS public.process_coolbreeze_reading() CASCADE;

-- Create CoolBreeze processing function with CORRECT voltage mapping
CREATE OR REPLACE FUNCTION public.process_coolbreeze_reading()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_machine_type TEXT;
  v_machine_manufacturer TEXT;
  v_status_calc JSONB;
  v_ambient_temp NUMERIC;
  v_duct_temp NUMERIC;
  v_motor_temp NUMERIC;
  v_has_water BOOLEAN;
  v_fan_active BOOLEAN := false;
  v_pump_active BOOLEAN := false;
  v_drain_active BOOLEAN := false;
  v_exhaust_active BOOLEAN := false;
  v_delta_t NUMERIC;
  v_power NUMERIC;
  v_current NUMERIC;
  v_voltage NUMERIC;
  v_fan_voltage NUMERIC;
  v_pump_voltage NUMERIC;
  v_drain_voltage NUMERIC;
  v_exhaust_voltage NUMERIC;
  v_water_voltage NUMERIC;
  v_fan_status TEXT;
  v_pump_status TEXT;
  v_drain_status TEXT;
  v_exhaust_status TEXT;
  v_fan_speed INTEGER;
  v_voltage_config RECORD;
  v_active_threshold NUMERIC := 6.0;
BEGIN
  -- Check if this machine is a CoolBreeze machine
  SELECT m.type, COALESCE(m.manufacturer, '') INTO v_machine_type, v_machine_manufacturer
  FROM public.machines m
  WHERE m.id = NEW.machine_id;
  
  -- Only process if it's a CoolBreeze manufacturer
  IF v_machine_manufacturer != 'CoolBreeze' THEN
    RETURN NEW; -- Skip processing, but allow the insert to continue
  END IF;
  
  -- VALIDATE TEMPERATURE READINGS (reject electrical interference errors)
  IF NEW.motor_temp IS NOT NULL AND (NEW.motor_temp = -127.0 OR NEW.motor_temp = -999.0 OR NEW.motor_temp < -50.0 OR NEW.motor_temp > 120.0) THEN
    RAISE WARNING 'Invalid motor temperature reading: % for machine % - skipping processing', NEW.motor_temp, NEW.machine_id;
    RETURN NEW;
  END IF;
  
  IF NEW.outside_temp IS NOT NULL AND (NEW.outside_temp = -127.0 OR NEW.outside_temp = -999.0 OR NEW.outside_temp < -50.0 OR NEW.outside_temp > 120.0) THEN
    RAISE WARNING 'Invalid outside temperature reading: % for machine % - skipping processing', NEW.outside_temp, NEW.machine_id;
    RETURN NEW;
  END IF;
  
  IF NEW.inside_temp IS NOT NULL AND (NEW.inside_temp = -127.0 OR NEW.inside_temp = -999.0 OR NEW.inside_temp < -50.0 OR NEW.inside_temp > 120.0) THEN
    RAISE WARNING 'Invalid inside temperature reading: % for machine % - skipping processing', NEW.inside_temp, NEW.machine_id;
    RETURN NEW;
  END IF;
  
  -- Extract RAW values
  v_ambient_temp := NEW.outside_temp;
  v_duct_temp := NEW.inside_temp;
  v_motor_temp := NEW.motor_temp;
  v_has_water := COALESCE(NEW.has_water, false);
  v_current := NEW.current;
  v_voltage := NEW.voltage;
  v_power := COALESCE(NEW.power, (NEW.voltage * COALESCE(NEW.current, 0)));
  v_delta_t := ABS(COALESCE(v_ambient_temp, 0) - COALESCE(v_duct_temp, 0));
  
  -- Get voltage configuration for this machine (if exists)
  SELECT * INTO v_voltage_config
  FROM public.coolbreeze_voltage_config
  WHERE machine_id = NEW.machine_id
  LIMIT 1;
  
  -- Get active threshold from config or use default
  IF v_voltage_config IS NOT NULL THEN
    v_active_threshold := COALESCE(v_voltage_config.voltage_active_threshold, 6.0);
  END IF;
  
  -- ========================================
  -- CORRECT VOLTAGE INPUT MAPPING FOR COOLBREEZE
  -- ========================================
  -- voltage_input_1 = Fan
  -- voltage_input_2 = Pump (cooling)
  -- voltage_input_3 = Solenoid/Drain
  -- voltage_input_4 = Exhaust (reverse)
  -- voltage_input_5 = Water/Float (GPIO5)
  -- ========================================
  
  v_fan_voltage := NEW.voltage_input_1;
  v_pump_voltage := NEW.voltage_input_2;
  v_drain_voltage := NEW.voltage_input_3;
  v_exhaust_voltage := NEW.voltage_input_4;
  v_water_voltage := NEW.voltage_input_5;
  
  -- Determine active states based on voltage threshold (>6V = active)
  v_fan_active := COALESCE(v_fan_voltage, 0) >= v_active_threshold;
  v_pump_active := COALESCE(v_pump_voltage, 0) >= v_active_threshold;
  v_drain_active := COALESCE(v_drain_voltage, 0) >= v_active_threshold;
  v_exhaust_active := COALESCE(v_exhaust_voltage, 0) >= v_active_threshold;
  
  -- Water detection from GPIO5 (voltage_input_5) - high voltage = water present
  IF v_water_voltage IS NOT NULL THEN
    v_has_water := v_water_voltage >= v_active_threshold;
  END IF;
  
  -- Determine status text for each pickup
  v_fan_status := CASE 
    WHEN v_fan_voltage IS NULL OR v_fan_voltage < 0.5 THEN 'DISCONNECTED'
    WHEN v_fan_active THEN 'ON'
    ELSE 'OFF'
  END;
  
  v_pump_status := CASE 
    WHEN v_pump_voltage IS NULL OR v_pump_voltage < 0.5 THEN 'DISCONNECTED'
    WHEN v_pump_active THEN 'ON'
    ELSE 'OFF'
  END;
  
  v_drain_status := CASE 
    WHEN v_drain_voltage IS NULL OR v_drain_voltage < 0.5 THEN 'DISCONNECTED'
    WHEN v_drain_active THEN 'ON'
    ELSE 'OFF'
  END;
  
  v_exhaust_status := CASE 
    WHEN v_exhaust_voltage IS NULL OR v_exhaust_voltage < 0.5 THEN 'DISCONNECTED'
    WHEN v_exhaust_active THEN 'ON'
    ELSE 'OFF'
  END;
  
  -- Calculate fan speed (0-100%)
  v_fan_speed := CASE WHEN v_fan_active THEN 100 ELSE 0 END;
  
  -- Build status JSONB
  v_status_calc := jsonb_build_object(
    'fan_active', v_fan_active,
    'pump_active', v_pump_active,
    'drain_active', v_drain_active,
    'exhaust_active', v_exhaust_active,
    'has_water', v_has_water,
    'is_cooling', (v_fan_active AND v_pump_active),
    'is_on', (v_fan_active OR v_pump_active OR v_drain_active OR v_exhaust_active)
  );
  
  -- Insert into coolbreeze table
  INSERT INTO public.coolbreeze (
    machine_id,
    timestamp,
    ambient_temp,
    duct_temp,
    motor_temp,
    delta_t,
    fan_active,
    pump_active,
    drain_active,
    exhaust_active,
    is_cooling,
    is_on,
    is_connected,
    has_water,
    water_level,
    voltage,
    current,
    power,
    fan_voltage,
    pump_voltage,
    drain_voltage,
    exhaust_voltage,
    fan_status,
    pump_status,
    drain_status,
    exhaust_status,
    fan_speed,
    overall_status,
    motor_status,
    water_status,
    cooling_status,
    status_details
  ) VALUES (
    NEW.machine_id,
    COALESCE(NEW.timestamp, NEW.created_at, NOW()),
    v_ambient_temp,
    v_duct_temp,
    v_motor_temp,
    v_delta_t,
    v_fan_active,
    v_pump_active,
    v_drain_active,
    v_exhaust_active,
    (v_fan_active AND v_pump_active),  -- is_cooling
    (v_fan_active OR v_pump_active OR v_drain_active OR v_exhaust_active),  -- is_on
    true,  -- is_connected (we just received data)
    v_has_water,
    CASE WHEN v_has_water THEN 100.0 ELSE 0.0 END,  -- water_level
    v_voltage,
    v_current,
    v_power,
    v_fan_voltage,
    v_pump_voltage,
    v_drain_voltage,
    v_exhaust_voltage,
    v_fan_status,
    v_pump_status,
    v_drain_status,
    v_exhaust_status,
    v_fan_speed,
    'operational',  -- overall_status
    'normal',       -- motor_status
    CASE WHEN v_has_water THEN 'ok' ELSE 'empty' END,  -- water_status
    CASE WHEN v_fan_active AND v_pump_active THEN 'active' ELSE 'idle' END,  -- cooling_status
    v_status_calc
  )
  ON CONFLICT (machine_id, timestamp) 
  DO UPDATE SET
    ambient_temp = EXCLUDED.ambient_temp,
    duct_temp = EXCLUDED.duct_temp,
    motor_temp = EXCLUDED.motor_temp,
    delta_t = EXCLUDED.delta_t,
    fan_active = EXCLUDED.fan_active,
    pump_active = EXCLUDED.pump_active,
    drain_active = EXCLUDED.drain_active,
    exhaust_active = EXCLUDED.exhaust_active,
    is_cooling = EXCLUDED.is_cooling,
    is_on = EXCLUDED.is_on,
    has_water = EXCLUDED.has_water,
    water_level = EXCLUDED.water_level,
    voltage = EXCLUDED.voltage,
    current = EXCLUDED.current,
    power = EXCLUDED.power,
    fan_voltage = EXCLUDED.fan_voltage,
    pump_voltage = EXCLUDED.pump_voltage,
    drain_voltage = EXCLUDED.drain_voltage,
    exhaust_voltage = EXCLUDED.exhaust_voltage,
    fan_status = EXCLUDED.fan_status,
    pump_status = EXCLUDED.pump_status,
    drain_status = EXCLUDED.drain_status,
    exhaust_status = EXCLUDED.exhaust_status,
    fan_speed = EXCLUDED.fan_speed,
    status_details = EXCLUDED.status_details,
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error processing coolbreeze reading for machine %: %', NEW.machine_id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_process_coolbreeze_reading
  AFTER INSERT ON public.readings_raw
  FOR EACH ROW
  EXECUTE FUNCTION public.process_coolbreeze_reading();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.process_coolbreeze_reading() TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_coolbreeze_reading() TO service_role;

COMMENT ON FUNCTION public.process_coolbreeze_reading IS 
  'Processes readings_raw entries for CoolBreeze evaporative coolers. Voltage mapping: input_1=Fan, input_2=Pump, input_3=Drain, input_4=Exhaust, input_5=Water(GPIO5).';

-- ========================================
-- 8. GRANT TABLE PERMISSIONS
-- ========================================

GRANT SELECT, INSERT, UPDATE ON public.coolbreeze_voltage_config TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.coolbreeze_notifications TO authenticated;
GRANT ALL ON public.coolbreeze_voltage_config TO service_role;
GRANT ALL ON public.coolbreeze_notifications TO service_role;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- 
-- Created tables:
-- ✅ coolbreeze_voltage_config (with RLS policies)
-- ✅ coolbreeze_notifications (with RLS policies)
-- 
-- Added columns to coolbreeze:
-- ✅ exhaust_voltage
-- ✅ exhaust_status
-- ✅ exhaust_active
-- 
-- Created function:
-- ✅ process_coolbreeze_reading()
-- 
-- Created trigger:
-- ✅ trigger_process_coolbreeze_reading
-- 
-- Voltage mapping:
-- voltage_input_1 → fan_voltage    → fan_active
-- voltage_input_2 → pump_voltage   → pump_active (cooling)
-- voltage_input_3 → drain_voltage  → drain_active (solenoid)
-- voltage_input_4 → exhaust_voltage → exhaust_active (reverse)
-- voltage_input_5 → water detection → has_water (GPIO5 float switch)
-- ========================================

