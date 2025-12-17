-- ========================================
-- SETUP TEST MACHINES FOR MANUAL TESTING
-- ========================================
-- Creates 3 test machines (Cirrus, Alliance, CoolBreeze)
-- with API keys for manual testing control panel
-- Run this in your Supabase SQL Editor
-- ========================================

-- ========================================
-- 1. CREATE CIRRUS TEST MACHINE
-- ========================================

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
  gen_random_uuid(),
  'Cirrus Test Device',
  'evaporative',
  'Cirrus',
  (SELECT id FROM auth.users LIMIT 1),
  'Test Location - Manual Control',
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING
RETURNING id, name, type, manufacturer;

-- ========================================
-- 2. CREATE ALLIANCE TEST MACHINE  
-- ========================================

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
  gen_random_uuid(),
  'Alliance Test Device',
  'heatpump',
  'Alliance',
  (SELECT id FROM auth.users LIMIT 1),
  'Test Location - Manual Control',
  55.0,
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING
RETURNING id, name, type, manufacturer;

-- ========================================
-- 3. CREATE COOLBREEZE TEST MACHINE
-- ========================================

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
  gen_random_uuid(),
  'CoolBreeze Test Device',
  'evaporative',
  'CoolBreeze',
  (SELECT id FROM auth.users LIMIT 1),
  'Test Location - Manual Control',
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING
RETURNING id, name, type, manufacturer;

-- ========================================
-- 4. CREATE API KEYS FOR ALL TEST MACHINES
-- ========================================

-- Cirrus API Key
INSERT INTO public.api_keys (
  id,
  key,
  machine_id,
  created_by,
  created_at,
  is_active,
  description
)
SELECT
  gen_random_uuid(),
  'cirrus-test-' || substr(md5(random()::text), 1, 32),
  m.id,
  (SELECT id FROM auth.users LIMIT 1),
  NOW(),
  true,
  'API key for Cirrus Test Device - Manual Testing'
FROM public.machines m
WHERE m.name = 'Cirrus Test Device'
  AND NOT EXISTS (
    SELECT 1 FROM public.api_keys ak 
    WHERE ak.machine_id = m.id 
    AND ak.description LIKE '%Manual Testing%'
  )
RETURNING key, machine_id, description;

-- Alliance API Key
INSERT INTO public.api_keys (
  id,
  key,
  machine_id,
  created_by,
  created_at,
  is_active,
  description
)
SELECT
  gen_random_uuid(),
  'alliance-test-' || substr(md5(random()::text), 1, 32),
  m.id,
  (SELECT id FROM auth.users LIMIT 1),
  NOW(),
  true,
  'API key for Alliance Test Device - Manual Testing'
FROM public.machines m
WHERE m.name = 'Alliance Test Device'
  AND NOT EXISTS (
    SELECT 1 FROM public.api_keys ak 
    WHERE ak.machine_id = m.id 
    AND ak.description LIKE '%Manual Testing%'
  )
RETURNING key, machine_id, description;

-- CoolBreeze API Key
INSERT INTO public.api_keys (
  id,
  key,
  machine_id,
  created_by,
  created_at,
  is_active,
  description
)
SELECT
  gen_random_uuid(),
  'coolbreeze-test-' || substr(md5(random()::text), 1, 32),
  m.id,
  (SELECT id FROM auth.users LIMIT 1),
  NOW(),
  true,
  'API key for CoolBreeze Test Device - Manual Testing'
FROM public.machines m
WHERE m.name = 'CoolBreeze Test Device'
  AND NOT EXISTS (
    SELECT 1 FROM public.api_keys ak 
    WHERE ak.machine_id = m.id 
    AND ak.description LIKE '%Manual Testing%'
  )
RETURNING key, machine_id, description;

-- ========================================
-- 5. CREATE DEFAULT CONFIGS
-- ========================================

-- Cirrus voltage config
INSERT INTO public.cirrus_voltage_config (
  id,
  machine_id,
  voltage_input_1_function,
  voltage_input_2_function,
  voltage_input_3_function,
  voltage_input_4_function,
  voltage_input_5_function,
  voltage_input_6_function,
  voltage_active_threshold
)
SELECT
  gen_random_uuid(),
  m.id,
  'Custom_1',  -- Fan
  'Custom_2',  -- Pump
  'Custom_3',  -- Drain
  'Custom_4',  -- Exhaust
  'Custom_5',  -- GPIO5 Float switch
  'unused',
  6.0
FROM public.machines m
WHERE m.name = 'Cirrus Test Device'
  AND NOT EXISTS (
    SELECT 1 FROM public.cirrus_voltage_config cvc WHERE cvc.machine_id = m.id
  );

-- Cirrus notification config
INSERT INTO public.cirrus_notifications (
  id,
  machine_id,
  motor_temp_warning,
  motor_temp_critical,
  motor_amps_warning
)
SELECT
  gen_random_uuid(),
  m.id,
  70.0,
  85.0,
  8.0
FROM public.machines m
WHERE m.name = 'Cirrus Test Device'
  AND NOT EXISTS (
    SELECT 1 FROM public.cirrus_notifications cn WHERE cn.machine_id = m.id
  );

-- Alliance voltage config
INSERT INTO public.alliance_voltage_config (
  id,
  machine_id,
  voltage_input_5_function,
  voltage_active_threshold
)
SELECT
  gen_random_uuid(),
  m.id,
  'Custom_5',  -- GPIO5 Pump relay
  6.0
FROM public.machines m
WHERE m.name = 'Alliance Test Device'
  AND NOT EXISTS (
    SELECT 1 FROM public.alliance_voltage_config avc WHERE avc.machine_id = m.id
  );

-- Alliance notification config
INSERT INTO public.alliance_notifications (
  id,
  machine_id,
  current_min_alert,
  current_max_alert,
  delta_t_min_heating,
  delta_t_max_heating
)
SELECT
  gen_random_uuid(),
  m.id,
  0.5,
  30.0,
  2.0,
  15.0
FROM public.machines m
WHERE m.name = 'Alliance Test Device'
  AND NOT EXISTS (
    SELECT 1 FROM public.alliance_notifications an WHERE an.machine_id = m.id
  );

-- CoolBreeze voltage config
INSERT INTO public.coolbreeze_voltage_config (
  id,
  machine_id,
  voltage_input_1_function,
  voltage_input_2_function,
  voltage_input_3_function,
  voltage_input_4_function,
  voltage_input_5_function,
  voltage_input_6_function,
  voltage_active_threshold
)
SELECT
  gen_random_uuid(),
  m.id,
  'Custom_1',  -- Fan
  'Custom_2',  -- Pump
  'Custom_3',  -- Drain
  'Custom_4',  -- Exhaust
  'Custom_5',  -- GPIO5 Float switch
  'unused',
  6.0
FROM public.machines m
WHERE m.name = 'CoolBreeze Test Device'
  AND NOT EXISTS (
    SELECT 1 FROM public.coolbreeze_voltage_config cvc WHERE cvc.machine_id = m.id
  );

-- CoolBreeze notification config
INSERT INTO public.coolbreeze_notifications (
  id,
  machine_id,
  motor_temp_warning,
  motor_temp_critical,
  motor_amps_warning
)
SELECT
  gen_random_uuid(),
  m.id,
  70.0,
  85.0,
  8.0
FROM public.machines m
WHERE m.name = 'CoolBreeze Test Device'
  AND NOT EXISTS (
    SELECT 1 FROM public.coolbreeze_notifications cn WHERE cn.machine_id = m.id
  );

-- ========================================
-- 6. RETRIEVE ALL TEST MACHINE CONFIGURATIONS
-- ========================================

-- Get all test machines with their API keys
SELECT 
  m.id AS machine_id,
  m.name,
  m.type,
  m.manufacturer,
  ak.key AS api_key,
  '🔧 Copy these values to manual-tester.html' AS instructions
FROM public.machines m
JOIN public.api_keys ak ON ak.machine_id = m.id
WHERE m.name LIKE '%Test Device'
  AND ak.is_active = true
  AND ak.description LIKE '%Manual Testing%'
ORDER BY m.manufacturer;

-- ========================================
-- 7. VERIFY SETUP
-- ========================================

SELECT 
  m.name,
  m.type,
  m.manufacturer,
  COUNT(DISTINCT ak.id) AS api_keys,
  CASE 
    WHEN m.manufacturer = 'Cirrus' THEN 
      EXISTS(SELECT 1 FROM public.cirrus_voltage_config WHERE machine_id = m.id)
    WHEN m.manufacturer = 'Alliance' THEN 
      EXISTS(SELECT 1 FROM public.alliance_voltage_config WHERE machine_id = m.id)
    WHEN m.manufacturer = 'CoolBreeze' THEN 
      EXISTS(SELECT 1 FROM public.coolbreeze_voltage_config WHERE machine_id = m.id)
  END AS has_voltage_config,
  CASE 
    WHEN m.manufacturer = 'Cirrus' THEN 
      EXISTS(SELECT 1 FROM public.cirrus_notifications WHERE machine_id = m.id)
    WHEN m.manufacturer = 'Alliance' THEN 
      EXISTS(SELECT 1 FROM public.alliance_notifications WHERE machine_id = m.id)
    WHEN m.manufacturer = 'CoolBreeze' THEN 
      EXISTS(SELECT 1 FROM public.coolbreeze_notifications WHERE machine_id = m.id)
  END AS has_notifications
FROM public.machines m
LEFT JOIN public.api_keys ak ON ak.machine_id = m.id
WHERE m.name LIKE '%Test Device'
GROUP BY m.id, m.name, m.type, m.manufacturer;

-- ========================================
-- NOTES
-- ========================================
-- 
-- After running this script:
-- 1. Copy the machine_id and api_key for each device
-- 2. Open manual-tester.html in your browser
-- 3. Paste the values into the respective device tabs
-- 4. Get your Supabase URL from Project Settings → API
-- 5. Start testing!
--
-- The test devices will appear on your frontend dashboard
-- You can manually control each parameter to test:
-- - Temperature thresholds
-- - Current limits
-- - Voltage pickup states
-- - Water level detection
-- - Compressor status
-- - All notification triggers
--
-- ========================================

