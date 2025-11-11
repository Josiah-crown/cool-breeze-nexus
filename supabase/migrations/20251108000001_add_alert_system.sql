-- ========================================
-- ALERT SYSTEM - Database Schema
-- ========================================
-- Created: 2025-11-08
-- Purpose: Per-machine alert thresholds, state tracking, and history
-- ========================================

-- ========================================
-- 1. MACHINE ALERT CONFIGURATION
-- ========================================
-- Stores customizable alert thresholds for each machine
CREATE TABLE IF NOT EXISTS public.machine_alert_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  
  -- Temperature Thresholds
  motor_temp_warning DECIMAL(5,2) DEFAULT 60.0, -- °C
  motor_temp_critical DECIMAL(5,2) DEFAULT 70.0, -- °C
  compressor_temp_critical DECIMAL(5,2) DEFAULT 90.0, -- °C (heat pumps)
  
  -- Current Thresholds
  motor_amps_warning DECIMAL(6,2) DEFAULT 15.0, -- Amps (evap cooler)
  compressor_amps_warning DECIMAL(6,2) DEFAULT 25.0, -- Amps (AC/heat pump)
  
  -- Temperature Differential Thresholds
  delta_t_min_cooling DECIMAL(5,2) DEFAULT 2.0, -- °C (minimum for effective cooling)
  delta_t_min_heating DECIMAL(5,2) DEFAULT 6.0, -- °C (minimum for effective heating)
  delta_t_max_heating DECIMAL(5,2) DEFAULT 15.0, -- °C (maximum for heat pump - prevents overheating)
  
  -- Heat Pump Specific
  setpoint_tolerance DECIMAL(5,2) DEFAULT 2.0, -- °C (±tolerance for setpoint alerts)
  
  -- Duration Thresholds (minutes before alert triggers)
  duration_motor_temp_critical INTEGER DEFAULT 15, -- minutes
  duration_cooling_ineffective INTEGER DEFAULT 30, -- minutes
  duration_fan_failure INTEGER DEFAULT 10, -- minutes
  duration_motor_overcurrent INTEGER DEFAULT 5, -- minutes
  duration_low_water INTEGER DEFAULT 15, -- minutes
  duration_dump_valve INTEGER DEFAULT 30, -- minutes
  duration_pump_failure INTEGER DEFAULT 30, -- minutes
  duration_heating_failure INTEGER DEFAULT 15, -- minutes
  duration_heating_excessive INTEGER DEFAULT 30, -- minutes (delta T too high)
  duration_setpoint_deviation INTEGER DEFAULT 10, -- minutes
  
  -- Alert Frequency
  reminder_interval_hours INTEGER DEFAULT 24, -- Hours between reminder emails
  send_recovery_emails BOOLEAN DEFAULT true, -- Send "All Clear" emails
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(machine_id) -- One config per machine
);

-- ========================================
-- 2. ALERT STATES (Active Alerts)
-- ========================================
-- Tracks currently active alert conditions
CREATE TABLE IF NOT EXISTS public.alert_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- e.g., "motor_temp_critical", "fan_failure"
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  
  -- Tracking
  condition_started_at TIMESTAMPTZ NOT NULL,
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  alert_triggered BOOLEAN DEFAULT false, -- Has email been sent?
  alert_triggered_at TIMESTAMPTZ, -- When was first email sent?
  last_reminder_sent_at TIMESTAMPTZ, -- When was last reminder sent?
  
  -- Current Values (for email content)
  current_value DECIMAL(10,2), -- e.g., 75.3°C
  threshold_value DECIMAL(10,2), -- e.g., 70.0°C
  additional_data JSONB, -- Any extra context
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(machine_id, alert_type) -- One active state per alert type per machine
);

-- ========================================
-- 3. ALERT HISTORY (All Alerts Ever Sent)
-- ========================================
-- Permanent log of all alert emails sent
CREATE TABLE IF NOT EXISTS public.alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info', 'recovery')),
  
  -- Alert Details
  message TEXT NOT NULL,
  current_value DECIMAL(10,2),
  threshold_value DECIMAL(10,2),
  duration_minutes INTEGER, -- How long condition persisted before alert
  
  -- Email Tracking
  recipients JSONB, -- Array of {userId, email, role} who received this alert
  email_sent BOOLEAN DEFAULT true,
  email_error TEXT, -- If email failed to send
  
  -- Timing
  condition_started_at TIMESTAMPTZ,
  alert_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ========================================
CREATE INDEX IF NOT EXISTS idx_alert_states_machine_id ON public.alert_states(machine_id);
CREATE INDEX IF NOT EXISTS idx_alert_states_severity ON public.alert_states(severity);
CREATE INDEX IF NOT EXISTS idx_alert_history_machine_id ON public.alert_history(machine_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_severity ON public.alert_history(severity);
CREATE INDEX IF NOT EXISTS idx_alert_history_created_at ON public.alert_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_machine_alert_config_machine_id ON public.machine_alert_config(machine_id);

-- ========================================
-- 5. GRANT PERMISSIONS
-- ========================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.machine_alert_config TO authenticated;
GRANT SELECT ON public.machine_alert_config TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alert_states TO authenticated;
GRANT SELECT ON public.alert_states TO anon;

GRANT SELECT, INSERT ON public.alert_history TO authenticated;
GRANT SELECT ON public.alert_history TO anon;

-- ========================================
-- 6. FUNCTION: Create Default Alert Config for New Machines
-- ========================================
CREATE OR REPLACE FUNCTION create_default_alert_config()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default alert configuration for new machine
  INSERT INTO public.machine_alert_config (machine_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 7. TRIGGER: Auto-create Alert Config on Machine Insert
-- ========================================
DROP TRIGGER IF EXISTS trigger_create_default_alert_config ON public.machines;
CREATE TRIGGER trigger_create_default_alert_config
  AFTER INSERT ON public.machines
  FOR EACH ROW
  EXECUTE FUNCTION create_default_alert_config();

-- ========================================
-- 8. BACKFILL: Create Alert Config for Existing Machines
-- ========================================
INSERT INTO public.machine_alert_config (machine_id)
SELECT id FROM public.machines
WHERE id NOT IN (SELECT machine_id FROM public.machine_alert_config)
ON CONFLICT (machine_id) DO NOTHING;

-- ========================================
-- 9. COMMENTS FOR DOCUMENTATION
-- ========================================
COMMENT ON TABLE public.machine_alert_config IS 'Customizable alert thresholds for each machine';
COMMENT ON TABLE public.alert_states IS 'Currently active alert conditions being tracked';
COMMENT ON TABLE public.alert_history IS 'Permanent log of all alert emails sent';

COMMENT ON COLUMN public.machine_alert_config.motor_temp_warning IS 'Temperature (°C) that triggers a warning alert';
COMMENT ON COLUMN public.machine_alert_config.motor_temp_critical IS 'Temperature (°C) that triggers a critical alert';
COMMENT ON COLUMN public.machine_alert_config.reminder_interval_hours IS 'Hours between reminder emails for persistent alerts';

COMMENT ON COLUMN public.alert_states.condition_started_at IS 'When the alert condition first began';
COMMENT ON COLUMN public.alert_states.alert_triggered IS 'Whether the initial alert email has been sent';
COMMENT ON COLUMN public.alert_states.last_reminder_sent_at IS 'When the last reminder email was sent';

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- Next Steps:
-- 1. Run this migration in Supabase
-- 2. Verify all existing machines have alert_config entries
-- 3. Implement alert checking Edge Function
-- 4. Implement email sending logic
-- 5. Create UI for editing thresholds
-- ========================================

