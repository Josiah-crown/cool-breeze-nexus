-- ========================================
-- SETUP TEST MACHINES (GENERIC CONFIG)
-- ========================================
-- Uses generic tables:
-- - machine_voltage_config (ONE table for all manufacturers)
-- - machine_alert_config (ONE table for all manufacturers)
-- ========================================

-- ========================================
-- 1. CREATE CIRRUS TEST MACHINE
-- ========================================

INSERT INTO public.machines (
  id, name, type, manufacturer, owner_id, location, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'Cirrus Test Device',
  'evaporative',
  'Cirrus',
  (SELECT id FROM auth.users LIMIT 1),
  'Test Location - Manual Control',
  NOW(), NOW()
)
ON CONFLICT DO NOTHING
RETURNING id, name, type, manufacturer;

-- ========================================
-- 2. CREATE ALLIANCE TEST MACHINE  
-- ========================================

INSERT INTO public.machines (
  id, name, type, manufacturer, owner_id, location, temperature_setpoint, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'Alliance Test Device',
  'heatpump',
  'Alliance',
  (SELECT id FROM auth.users LIMIT 1),
  'Test Location - Manual Control',
  55.0,
  NOW(), NOW()
)
ON CONFLICT DO NOTHING
RETURNING id, name, type, manufacturer;

-- ========================================
-- 3. CREATE COOLBREEZE TEST MACHINE
-- ========================================

INSERT INTO public.machines (
  id, name, type, manufacturer, owner_id, location, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'CoolBreeze Test Device',
  'evaporative',
  'CoolBreeze',
  (SELECT id FROM auth.users LIMIT 1),
  'Test Location - Manual Control',
  NOW(), NOW()
)
ON CONFLICT DO NOTHING
RETURNING id, name, type, manufacturer;

-- ========================================
-- 4. CREATE API KEYS FOR ALL TEST MACHINES
-- ========================================

-- Cirrus API Key
INSERT INTO public.api_keys (id, key, machine_id, created_by, created_at, is_active, description)
SELECT gen_random_uuid(), 'cirrus-test-' || substr(md5(random()::text), 1, 32),
  m.id, (SELECT id FROM auth.users LIMIT 1), NOW(), true,
  'API key for Cirrus Test Device - Manual Testing'
FROM public.machines m
WHERE m.name = 'Cirrus Test Device'
  AND NOT EXISTS (SELECT 1 FROM public.api_keys ak WHERE ak.machine_id = m.id AND ak.description LIKE '%Manual Testing%')
RETURNING key, machine_id, description;

-- Alliance API Key
INSERT INTO public.api_keys (id, key, machine_id, created_by, created_at, is_active, description)
SELECT gen_random_uuid(), 'alliance-test-' || substr(md5(random()::text), 1, 32),
  m.id, (SELECT id FROM auth.users LIMIT 1), NOW(), true,
  'API key for Alliance Test Device - Manual Testing'
FROM public.machines m
WHERE m.name = 'Alliance Test Device'
  AND NOT EXISTS (SELECT 1 FROM public.api_keys ak WHERE ak.machine_id = m.id AND ak.description LIKE '%Manual Testing%')
RETURNING key, machine_id, description;

-- CoolBreeze API Key
INSERT INTO public.api_keys (id, key, machine_id, created_by, created_at, is_active, description)
SELECT gen_random_uuid(), 'coolbreeze-test-' || substr(md5(random()::text), 1, 32),
  m.id, (SELECT id FROM auth.users LIMIT 1), NOW(), true,
  'API key for CoolBreeze Test Device - Manual Testing'
FROM public.machines m
WHERE m.name = 'CoolBreeze Test Device'
  AND NOT EXISTS (SELECT 1 FROM public.api_keys ak WHERE ak.machine_id = m.id AND ak.description LIKE '%Manual Testing%')
RETURNING key, machine_id, description;

-- ========================================
-- 5. CREATE GENERIC VOLTAGE CONFIGS
-- ========================================

-- Cirrus voltage config (using GENERIC table)
INSERT INTO public.machine_voltage_config (
  id, machine_id,
  voltage_input_1_function, voltage_input_2_function, voltage_input_3_function,
  voltage_input_4_function, voltage_input_5_function, voltage_input_6_function,
  voltage_active_threshold
)
SELECT gen_random_uuid(), m.id,
  'fan', 'pump', 'drain', 'exhaust', 'water', 'unused', 6.0
FROM public.machines m
WHERE m.name = 'Cirrus Test Device'
  AND NOT EXISTS (SELECT 1 FROM public.machine_voltage_config mvc WHERE mvc.machine_id = m.id);

-- Alliance voltage config (using GENERIC table)
INSERT INTO public.machine_voltage_config (
  id, machine_id,
  voltage_input_1_function, voltage_input_2_function, voltage_input_3_function,
  voltage_input_4_function, voltage_input_5_function, voltage_input_6_function,
  voltage_active_threshold
)
SELECT gen_random_uuid(), m.id,
  'unused', 'unused', 'unused', 'unused', 'pump', 'unused', 6.0
FROM public.machines m
WHERE m.name = 'Alliance Test Device'
  AND NOT EXISTS (SELECT 1 FROM public.machine_voltage_config mvc WHERE mvc.machine_id = m.id);

-- CoolBreeze voltage config (using GENERIC table)
INSERT INTO public.machine_voltage_config (
  id, machine_id,
  voltage_input_1_function, voltage_input_2_function, voltage_input_3_function,
  voltage_input_4_function, voltage_input_5_function, voltage_input_6_function,
  voltage_active_threshold
)
SELECT gen_random_uuid(), m.id,
  'fan', 'pump', 'drain', 'exhaust', 'water', 'unused', 6.0
FROM public.machines m
WHERE m.name = 'CoolBreeze Test Device'
  AND NOT EXISTS (SELECT 1 FROM public.machine_voltage_config mvc WHERE mvc.machine_id = m.id);

-- ========================================
-- 6. CREATE GENERIC ALERT CONFIGS
-- ========================================

-- Cirrus alert config (using GENERIC table)
INSERT INTO public.machine_alert_config (
  id, machine_id,
  motor_temp_warning, motor_temp_critical, motor_amps_warning,
  delta_t_min_cooling
)
SELECT gen_random_uuid(), m.id,
  70.0, 85.0, 8.0, 3.0
FROM public.machines m
WHERE m.name = 'Cirrus Test Device'
  AND NOT EXISTS (SELECT 1 FROM public.machine_alert_config mac WHERE mac.machine_id = m.id);

-- Alliance alert config (using GENERIC table with heatpump fields)
INSERT INTO public.machine_alert_config (
  id, machine_id,
  motor_temp_warning, motor_temp_critical, motor_amps_warning,
  current_min_alert, current_max_alert,
  delta_t_min_heating, delta_t_max_heating, setpoint_tolerance,
  duration_compressor_failure
)
SELECT gen_random_uuid(), m.id,
  70.0, 85.0, 15.0,
  0.5, 30.0,
  2.0, 15.0, 5.0,
  5
FROM public.machines m
WHERE m.name = 'Alliance Test Device'
  AND NOT EXISTS (SELECT 1 FROM public.machine_alert_config mac WHERE mac.machine_id = m.id);

-- CoolBreeze alert config (using GENERIC table)
INSERT INTO public.machine_alert_config (
  id, machine_id,
  motor_temp_warning, motor_temp_critical, motor_amps_warning,
  delta_t_min_cooling
)
SELECT gen_random_uuid(), m.id,
  70.0, 85.0, 8.0, 3.0
FROM public.machines m
WHERE m.name = 'CoolBreeze Test Device'
  AND NOT EXISTS (SELECT 1 FROM public.machine_alert_config mac WHERE mac.machine_id = m.id);

-- ========================================
-- 7. RETRIEVE ALL TEST MACHINE CONFIGURATIONS
-- ========================================

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
-- 8. VERIFY SETUP
-- ========================================

SELECT 
  m.name,
  m.type,
  m.manufacturer,
  COUNT(DISTINCT ak.id) AS api_keys,
  EXISTS(SELECT 1 FROM public.machine_voltage_config WHERE machine_id = m.id) AS has_voltage_config,
  EXISTS(SELECT 1 FROM public.machine_alert_config WHERE machine_id = m.id) AS has_alert_config
FROM public.machines m
LEFT JOIN public.api_keys ak ON ak.machine_id = m.id
WHERE m.name LIKE '%Test Device'
GROUP BY m.id, m.name, m.type, m.manufacturer;

-- ========================================
-- NOTES
-- ========================================
-- 
-- This setup uses GENERIC tables:
-- - machine_voltage_config (ONE table for ALL manufacturers)
-- - machine_alert_config (ONE table for ALL manufacturers)
-- 
-- No manufacturer-specific config tables needed!
-- ========================================

