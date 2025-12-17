-- ========================================
-- SETUP DEMO ACCOUNTS (CASE-INSENSITIVE FIX)
-- ========================================
-- Uses ILIKE for case-insensitive email matching
-- ========================================

-- ========================================
-- 1. CREATE PROFILES (case-insensitive)
-- ========================================

-- Super Admin Profile
INSERT INTO public.profiles (id, name, email, cell_number, country, state, city, street, suburb, full_name_business)
SELECT id, 'Super Admin', email, '+27000000000', 'South Africa', 'Gauteng', 'Johannesburg', '1 Admin Street', 'Central', 'IOT Nexus Admin'
FROM auth.users WHERE LOWER(email) = LOWER('Superadmin@IOTnexus.site')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Crown Technologies Profile
INSERT INTO public.profiles (id, name, email, cell_number, country, state, city, street, suburb, full_name_business)
SELECT id, 'Crown Technologies', email, '+27123456789', 'South Africa', 'Gauteng', 'Johannesburg', '123 Tech Park', 'Sandton', 'Crown Technologies (Pty) Ltd'
FROM auth.users WHERE LOWER(email) = LOWER('headoffice@crowntechnologies.co.za')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Blessing Profile
INSERT INTO public.profiles (id, name, email, cell_number, country, state, city, street, suburb, full_name_business)
SELECT id, 'Blessing Installer', email, '+27111222333', 'South Africa', 'Gauteng', 'Johannesburg', '45 Installer Lane', 'Midrand', 'Blessing - Crown Installer'
FROM auth.users WHERE LOWER(email) = LOWER('Blessing@crowntechnologies.co.za')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Neil Profile
INSERT INTO public.profiles (id, name, email, cell_number, country, state, city, street, suburb, full_name_business)
SELECT id, 'Neil Customer', email, '+27444555666', 'South Africa', 'Gauteng', 'Pretoria', '78 Customer Road', 'Centurion', 'Neil - Residential Customer'
FROM auth.users WHERE LOWER(email) = LOWER('Neil@crowntechnologies.co.za')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- ========================================
-- 2. ASSIGN USER ROLES (case-insensitive)
-- ========================================

-- Super Admin role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin' FROM auth.users WHERE LOWER(email) = LOWER('Superadmin@IOTnexus.site')
ON CONFLICT (user_id, role) DO NOTHING;

-- Company role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'company' FROM auth.users WHERE LOWER(email) = LOWER('headoffice@crowntechnologies.co.za')
ON CONFLICT (user_id, role) DO NOTHING;

-- Installer role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'installer' FROM auth.users WHERE LOWER(email) = LOWER('Blessing@crowntechnologies.co.za')
ON CONFLICT (user_id, role) DO NOTHING;

-- Client role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'client' FROM auth.users WHERE LOWER(email) = LOWER('Neil@crowntechnologies.co.za')
ON CONFLICT (user_id, role) DO NOTHING;

-- ========================================
-- 3. CREATE HIERARCHY ASSIGNMENTS
-- ========================================

-- Assign Blessing to Crown Technologies
INSERT INTO public.installer_company_assignments (installer_id, company_id, assigned_by)
SELECT 
  (SELECT id FROM auth.users WHERE LOWER(email) = LOWER('Blessing@crowntechnologies.co.za')),
  (SELECT id FROM auth.users WHERE LOWER(email) = LOWER('headoffice@crowntechnologies.co.za')),
  (SELECT id FROM auth.users WHERE LOWER(email) = LOWER('Superadmin@IOTnexus.site'))
WHERE EXISTS (SELECT 1 FROM auth.users WHERE LOWER(email) = LOWER('Blessing@crowntechnologies.co.za'))
ON CONFLICT DO NOTHING;

-- Assign Neil to Blessing
INSERT INTO public.client_admin_assignments (client_id, admin_id, assigned_by)
SELECT 
  (SELECT id FROM auth.users WHERE LOWER(email) = LOWER('Neil@crowntechnologies.co.za')),
  (SELECT id FROM auth.users WHERE LOWER(email) = LOWER('Blessing@crowntechnologies.co.za')),
  (SELECT id FROM auth.users WHERE LOWER(email) = LOWER('Superadmin@IOTnexus.site'))
WHERE EXISTS (SELECT 1 FROM auth.users WHERE LOWER(email) = LOWER('Neil@crowntechnologies.co.za'))
ON CONFLICT (client_id) DO NOTHING;

-- ========================================
-- 4. CREATE DEMO MACHINES
-- ========================================

-- Get Neil's ID for owner_id
DO $$
DECLARE
  v_neil_id UUID;
BEGIN
  SELECT id INTO v_neil_id FROM auth.users WHERE LOWER(email) = LOWER('Neil@crowntechnologies.co.za');
  
  IF v_neil_id IS NULL THEN
    RAISE EXCEPTION 'Neil user not found!';
  END IF;
  
  -- Create Cirrus machine
  INSERT INTO public.machines (name, type, manufacturer, owner_id, location)
  VALUES ('Neil''s Cirrus Cooler', 'evaporative', 'Cirrus', v_neil_id, 'Pretoria - Living Room')
  ON CONFLICT DO NOTHING;
  
  -- Create CoolBreeze machine
  INSERT INTO public.machines (name, type, manufacturer, owner_id, location)
  VALUES ('Neil''s CoolBreeze Unit', 'evaporative', 'CoolBreeze', v_neil_id, 'Pretoria - Bedroom')
  ON CONFLICT DO NOTHING;
  
  -- Create Alliance machine
  INSERT INTO public.machines (name, type, manufacturer, owner_id, location, temperature_setpoint)
  VALUES ('Neil''s Alliance Heatpump', 'heatpump', 'Alliance', v_neil_id, 'Pretoria - Pool Area', 55.0)
  ON CONFLICT DO NOTHING;
END $$;

-- ========================================
-- 5. CREATE API KEYS
-- ========================================

-- Cirrus API Key
INSERT INTO public.api_keys (key, machine_id, created_by, is_active, description)
SELECT 
  'cirrus-demo-' || substr(md5(random()::text), 1, 24),
  m.id, 
  m.owner_id,
  true,
  'Demo API Key'
FROM public.machines m
WHERE m.name = 'Neil''s Cirrus Cooler'
  AND NOT EXISTS (SELECT 1 FROM public.api_keys WHERE machine_id = m.id);

-- CoolBreeze API Key
INSERT INTO public.api_keys (key, machine_id, created_by, is_active, description)
SELECT 
  'coolbreeze-demo-' || substr(md5(random()::text), 1, 24),
  m.id, 
  m.owner_id,
  true,
  'Demo API Key'
FROM public.machines m
WHERE m.name = 'Neil''s CoolBreeze Unit'
  AND NOT EXISTS (SELECT 1 FROM public.api_keys WHERE machine_id = m.id);

-- Alliance API Key
INSERT INTO public.api_keys (key, machine_id, created_by, is_active, description)
SELECT 
  'alliance-demo-' || substr(md5(random()::text), 1, 24),
  m.id, 
  m.owner_id,
  true,
  'Demo API Key'
FROM public.machines m
WHERE m.name = 'Neil''s Alliance Heatpump'
  AND NOT EXISTS (SELECT 1 FROM public.api_keys WHERE machine_id = m.id);

-- ========================================
-- 6. CREATE CONFIGS
-- ========================================

-- Voltage configs
INSERT INTO public.machine_voltage_config (machine_id, voltage_input_1_function, voltage_input_2_function, voltage_input_3_function, voltage_input_4_function, voltage_input_5_function, voltage_active_threshold)
SELECT m.id, 'fan', 'pump', 'drain', 'exhaust', 'water', 6.0
FROM public.machines m WHERE m.manufacturer IN ('Cirrus', 'CoolBreeze')
  AND NOT EXISTS (SELECT 1 FROM public.machine_voltage_config WHERE machine_id = m.id);

INSERT INTO public.machine_voltage_config (machine_id, voltage_input_1_function, voltage_input_2_function, voltage_input_3_function, voltage_input_4_function, voltage_input_5_function, voltage_active_threshold)
SELECT m.id, 'unused', 'unused', 'unused', 'unused', 'pump', 6.0
FROM public.machines m WHERE m.manufacturer = 'Alliance'
  AND NOT EXISTS (SELECT 1 FROM public.machine_voltage_config WHERE machine_id = m.id);

-- Alert configs
INSERT INTO public.machine_alert_config (machine_id, motor_temp_warning, motor_temp_critical, motor_amps_warning, delta_t_min_cooling)
SELECT m.id, 70.0, 85.0, 8.0, 3.0
FROM public.machines m WHERE m.manufacturer IN ('Cirrus', 'CoolBreeze')
  AND NOT EXISTS (SELECT 1 FROM public.machine_alert_config WHERE machine_id = m.id);

INSERT INTO public.machine_alert_config (machine_id, motor_temp_warning, motor_temp_critical, motor_amps_warning, current_min_alert, current_max_alert, delta_t_min_heating, setpoint_tolerance, duration_compressor_failure)
SELECT m.id, 70.0, 85.0, 15.0, 0.5, 30.0, 2.0, 5.0, 5
FROM public.machines m WHERE m.manufacturer = 'Alliance'
  AND NOT EXISTS (SELECT 1 FROM public.machine_alert_config WHERE machine_id = m.id);

-- ========================================
-- 7. VERIFY RESULTS
-- ========================================

SELECT '=== USERS & ROLES ===' as section;
SELECT p.name, p.email, ur.role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
ORDER BY ur.role;

SELECT '=== MACHINES & API KEYS ===' as section;
SELECT m.name, m.type, m.manufacturer, m.location, ak.key as api_key
FROM public.machines m
LEFT JOIN public.api_keys ak ON ak.machine_id = m.id AND ak.is_active = true
ORDER BY m.manufacturer;

SELECT '=== HIERARCHY ===' as section;
SELECT 
  'Company → Installer' as relationship,
  c.email as company,
  i.email as installer
FROM public.installer_company_assignments ica
JOIN auth.users c ON c.id = ica.company_id
JOIN auth.users i ON i.id = ica.installer_id;

SELECT 
  'Installer → Client' as relationship,
  a.email as admin,
  cl.email as client
FROM public.client_admin_assignments caa
JOIN auth.users a ON a.id = caa.admin_id
JOIN auth.users cl ON cl.id = caa.client_id;


