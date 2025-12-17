-- ========================================
-- SETUP MACHINES AND API KEYS FOR SIMULATORS
-- ========================================
-- This script helps you create the machines and API keys
-- needed for the fake data stream simulators
-- Run this in your Supabase SQL Editor
-- ========================================

-- ========================================
-- 1. CREATE ALLIANCE HEATPUMP MACHINE
-- ========================================

-- Insert Alliance heatpump
INSERT INTO public.machines (
  id,
  name,
  type,
  manufacturer,
  owner_id,
  location,
  temperature_setpoint,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),  -- Will generate a UUID
  'Alliance Heatpump Demo',
  'heatpump',
  'Alliance',
  (SELECT id FROM auth.users LIMIT 1),  -- Use first user as owner (change as needed)
  'Demo Location - Office',
  55.0,  -- Default setpoint 55°C
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING
RETURNING id, name, type, manufacturer;

-- ========================================
-- 2. CREATE COOLBREEZE EVAPORATIVE COOLER MACHINE
-- ========================================

-- Insert CoolBreeze evaporative cooler
INSERT INTO public.machines (
  id,
  name,
  type,
  manufacturer,
  owner_id,
  location,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),  -- Will generate a UUID
  'CoolBreeze Evaporative Demo',
  'evaporative',
  'CoolBreeze',
  (SELECT id FROM auth.users LIMIT 1),  -- Use first user as owner (change as needed)
  'Demo Location - Warehouse',
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING
RETURNING id, name, type, manufacturer;

-- ========================================
-- 3. CREATE API KEYS FOR BOTH MACHINES
-- ========================================

-- Generate API keys for Alliance heatpump
INSERT INTO public.api_keys (
  id,
  key,
  machine_id,
  created_by,
  created_at,
  last_used_at,
  is_active,
  description
)
SELECT
  gen_random_uuid(),
  'alliance-demo-' || substr(md5(random()::text), 1, 32),  -- Generate random API key
  m.id,
  (SELECT id FROM auth.users LIMIT 1),
  NOW(),
  NULL,
  true,
  'API key for Alliance Heatpump Demo simulator'
FROM public.machines m
WHERE m.name = 'Alliance Heatpump Demo'
  AND m.manufacturer = 'Alliance'
  AND NOT EXISTS (
    SELECT 1 FROM public.api_keys ak 
    WHERE ak.machine_id = m.id 
    AND ak.description LIKE '%simulator%'
  )
RETURNING key, machine_id, description;

-- Generate API keys for CoolBreeze evaporative cooler
INSERT INTO public.api_keys (
  id,
  key,
  machine_id,
  created_by,
  created_at,
  last_used_at,
  is_active,
  description
)
SELECT
  gen_random_uuid(),
  'coolbreeze-demo-' || substr(md5(random()::text), 1, 32),  -- Generate random API key
  m.id,
  (SELECT id FROM auth.users LIMIT 1),
  NOW(),
  NULL,
  true,
  'API key for CoolBreeze Evaporative Demo simulator'
FROM public.machines m
WHERE m.name = 'CoolBreeze Evaporative Demo'
  AND m.manufacturer = 'CoolBreeze'
  AND NOT EXISTS (
    SELECT 1 FROM public.api_keys ak 
    WHERE ak.machine_id = m.id 
    AND ak.description LIKE '%simulator%'
  )
RETURNING key, machine_id, description;

-- ========================================
-- 4. CREATE DEFAULT CONFIGS FOR MACHINES
-- ========================================

-- Create Alliance voltage config (GPIO5 for pump relay)
INSERT INTO public.alliance_voltage_config (
  id,
  machine_id,
  voltage_input_1_function,
  voltage_input_2_function,
  voltage_input_3_function,
  voltage_input_4_function,
  voltage_input_5_function,
  voltage_input_6_function,
  voltage_active_threshold,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  m.id,
  'Custom_1',  -- Fan (if used)
  'unused',
  'unused',
  'unused',
  'Custom_5',  -- GPIO5 - Pump relay
  'unused',
  6.0,
  NOW(),
  NOW()
FROM public.machines m
WHERE m.name = 'Alliance Heatpump Demo'
  AND NOT EXISTS (
    SELECT 1 FROM public.alliance_voltage_config avc WHERE avc.machine_id = m.id
  )
RETURNING machine_id, voltage_input_5_function;

-- Create Alliance notification config
INSERT INTO public.alliance_notifications (
  id,
  machine_id,
  current_min_alert,
  current_max_alert,
  delta_t_min_heating,
  delta_t_max_heating,
  setpoint_tolerance,
  duration_heating_failure,
  duration_compressor_failure,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  m.id,
  0.5,   -- current_min_alert
  30.0,  -- current_max_alert
  2.0,   -- delta_t_min_heating
  15.0,  -- delta_t_max_heating
  5.0,   -- setpoint_tolerance
  5,     -- duration_heating_failure
  5,     -- duration_compressor_failure
  NOW(),
  NOW()
FROM public.machines m
WHERE m.name = 'Alliance Heatpump Demo'
  AND NOT EXISTS (
    SELECT 1 FROM public.alliance_notifications an WHERE an.machine_id = m.id
  )
RETURNING machine_id, current_min_alert, current_max_alert;

-- Create CoolBreeze voltage config
INSERT INTO public.coolbreeze_voltage_config (
  id,
  machine_id,
  voltage_input_1_function,
  voltage_input_2_function,
  voltage_input_3_function,
  voltage_input_4_function,
  voltage_input_5_function,
  voltage_input_6_function,
  voltage_active_threshold,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  m.id,
  'Custom_1',  -- Fan
  'Custom_2',  -- Pump
  'Custom_3',  -- Drain
  'unused',    -- Exhaust (unused)
  'Custom_5',  -- GPIO5 - Float switch
  'unused',
  6.0,
  NOW(),
  NOW()
FROM public.machines m
WHERE m.name = 'CoolBreeze Evaporative Demo'
  AND NOT EXISTS (
    SELECT 1 FROM public.coolbreeze_voltage_config cvc WHERE cvc.machine_id = m.id
  )
RETURNING machine_id, voltage_input_1_function, voltage_input_2_function;

-- Create CoolBreeze notification config
INSERT INTO public.coolbreeze_notifications (
  id,
  machine_id,
  motor_temp_warning,
  motor_temp_critical,
  motor_amps_warning,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  m.id,
  70.0,  -- motor_temp_warning
  85.0,  -- motor_temp_critical
  8.0,   -- motor_amps_warning
  NOW(),
  NOW()
FROM public.machines m
WHERE m.name = 'CoolBreeze Evaporative Demo'
  AND NOT EXISTS (
    SELECT 1 FROM public.coolbreeze_notifications cn WHERE cn.machine_id = m.id
  )
RETURNING machine_id, motor_temp_warning, motor_temp_critical;

-- ========================================
-- 5. RETRIEVE CONFIGURATION FOR SIMULATORS
-- ========================================

-- Get Alliance Heatpump configuration
SELECT 
  m.id AS machine_id,
  m.name,
  m.type,
  m.manufacturer,
  ak.key AS api_key,
  '🔧 Copy these values to alliance-heatpump-simulator.js' AS instructions
FROM public.machines m
JOIN public.api_keys ak ON ak.machine_id = m.id
WHERE m.name = 'Alliance Heatpump Demo'
  AND ak.is_active = true
  AND ak.description LIKE '%simulator%';

-- Get CoolBreeze Evaporative configuration  
SELECT 
  m.id AS machine_id,
  m.name,
  m.type,
  m.manufacturer,
  ak.key AS api_key,
  '🔧 Copy these values to coolbreeze-evaporative-simulator.js' AS instructions
FROM public.machines m
JOIN public.api_keys ak ON ak.machine_id = m.id
WHERE m.name = 'CoolBreeze Evaporative Demo'
  AND ak.is_active = true
  AND ak.description LIKE '%simulator%';

-- ========================================
-- 6. VERIFY SETUP
-- ========================================

-- Check all demo machines
SELECT 
  m.id,
  m.name,
  m.type,
  m.manufacturer,
  COUNT(ak.id) AS api_key_count,
  CASE 
    WHEN m.manufacturer = 'Alliance' THEN 
      EXISTS(SELECT 1 FROM public.alliance_voltage_config WHERE machine_id = m.id)
    WHEN m.manufacturer = 'CoolBreeze' THEN 
      EXISTS(SELECT 1 FROM public.coolbreeze_voltage_config WHERE machine_id = m.id)
    ELSE false
  END AS has_voltage_config,
  CASE 
    WHEN m.manufacturer = 'Alliance' THEN 
      EXISTS(SELECT 1 FROM public.alliance_notifications WHERE machine_id = m.id)
    WHEN m.manufacturer = 'CoolBreeze' THEN 
      EXISTS(SELECT 1 FROM public.coolbreeze_notifications WHERE machine_id = m.id)
    ELSE false
  END AS has_notification_config
FROM public.machines m
LEFT JOIN public.api_keys ak ON ak.machine_id = m.id AND ak.is_active = true
WHERE m.name LIKE '%Demo'
GROUP BY m.id, m.name, m.type, m.manufacturer;

-- ========================================
-- NOTES
-- ========================================
-- 
-- After running this script:
-- 1. Copy the machine_id and api_key from the SELECT queries above
-- 2. Update the simulator scripts with these values
-- 3. Get your Supabase URL from: Project Settings → API → Project URL
-- 4. Run the simulators: node alliance-heatpump-simulator.js
--
-- ========================================

