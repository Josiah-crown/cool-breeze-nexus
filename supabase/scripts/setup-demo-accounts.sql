-- ========================================
-- SETUP DEMO ACCOUNTS & MACHINES
-- ========================================
-- Run this AFTER creating users in Supabase Authentication
--
-- Users to create first:
-- 1. Superadmin@Crowntechnologies.online (Super Admin)
-- 2. headoffice@crowntechnologies.co.za (Company - Crown Technologies)
-- 3. Blessing@crowntechnologies.co.za (Installer)
-- 4. Neil@crowntechnologies.co.za (Customer)
-- ========================================

-- ========================================
-- 1. CREATE PROFILES FOR ALL USERS
-- ========================================

-- Super Admin Profile
INSERT INTO public.profiles (
  id, name, email, cell_number, country, state, city, street, suburb, full_name_business
)
SELECT 
  id,
  'Super Admin',
  email,
  '+27000000000',
  'South Africa',
  'Gauteng',
  'Johannesburg',
  '1 Admin Street',
  'Central',
  'Crown Technologies Admin'
FROM auth.users
WHERE email = 'Superadmin@Crowntechnologies.online'
ON CONFLICT (id) DO NOTHING;

-- Crown Technologies (Company) Profile
INSERT INTO public.profiles (
  id, name, email, cell_number, country, state, city, street, suburb, full_name_business
)
SELECT 
  id,
  'Crown Technologies',
  email,
  '+27123456789',
  'South Africa',
  'Gauteng',
  'Johannesburg',
  '123 Tech Park',
  'Sandton',
  'Crown Technologies (Pty) Ltd'
FROM auth.users
WHERE email = 'headoffice@crowntechnologies.co.za'
ON CONFLICT (id) DO NOTHING;

-- Blessing (Installer) Profile
INSERT INTO public.profiles (
  id, name, email, cell_number, country, state, city, street, suburb, full_name_business
)
SELECT 
  id,
  'Blessing',
  email,
  '+27111222333',
  'South Africa',
  'Gauteng',
  'Johannesburg',
  '45 Installer Lane',
  'Midrand',
  'Blessing - Crown Installer'
FROM auth.users
WHERE email = 'Blessing@crowntechnologies.co.za'
ON CONFLICT (id) DO NOTHING;

-- Neil (Customer) Profile
INSERT INTO public.profiles (
  id, name, email, cell_number, country, state, city, street, suburb, full_name_business
)
SELECT 
  id,
  'Neil',
  email,
  '+27444555666',
  'South Africa',
  'Gauteng',
  'Pretoria',
  '78 Customer Road',
  'Centurion',
  'Neil - Residential Customer'
FROM auth.users
WHERE email = 'Neil@crowntechnologies.co.za'
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 2. ASSIGN USER ROLES
-- ========================================

-- Super Admin role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'
FROM auth.users
WHERE email = 'Superadmin@Crowntechnologies.online'
ON CONFLICT (user_id, role) DO NOTHING;

-- Crown Technologies - Company role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'company'
FROM auth.users
WHERE email = 'headoffice@crowntechnologies.co.za'
ON CONFLICT (user_id, role) DO NOTHING;

-- Blessing - Installer role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'installer'
FROM auth.users
WHERE email = 'Blessing@crowntechnologies.co.za'
ON CONFLICT (user_id, role) DO NOTHING;

-- Neil - Client role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'client'
FROM auth.users
WHERE email = 'Neil@crowntechnologies.co.za'
ON CONFLICT (user_id, role) DO NOTHING;

-- ========================================
-- 3. CREATE COMPANY-INSTALLER ASSIGNMENT
-- ========================================

-- Assign Blessing to Crown Technologies
INSERT INTO public.installer_company_assignments (installer_id, company_id, assigned_by)
SELECT 
  (SELECT id FROM auth.users WHERE email = 'Blessing@crowntechnologies.co.za'),
  (SELECT id FROM auth.users WHERE email = 'headoffice@crowntechnologies.co.za'),
  (SELECT id FROM auth.users WHERE email = 'Superadmin@Crowntechnologies.online')
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'Blessing@crowntechnologies.co.za')
  AND EXISTS (SELECT 1 FROM auth.users WHERE email = 'headoffice@crowntechnologies.co.za')
ON CONFLICT DO NOTHING;

-- ========================================
-- 4. CREATE CLIENT-ADMIN ASSIGNMENT
-- ========================================

-- Assign Neil to Blessing (installer manages client)
INSERT INTO public.client_admin_assignments (client_id, admin_id, assigned_by)
SELECT 
  (SELECT id FROM auth.users WHERE email = 'Neil@crowntechnologies.co.za'),
  (SELECT id FROM auth.users WHERE email = 'Blessing@crowntechnologies.co.za'),
  (SELECT id FROM auth.users WHERE email = 'Superadmin@Crowntechnologies.online')
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'Neil@crowntechnologies.co.za')
  AND EXISTS (SELECT 1 FROM auth.users WHERE email = 'Blessing@crowntechnologies.co.za')
ON CONFLICT (client_id) DO NOTHING;

-- ========================================
-- 5. CREATE DEMO MACHINES (owned by Neil)
-- ========================================

-- Cirrus Demo Machine
INSERT INTO public.machines (
  id, name, type, manufacturer, owner_id, location, created_at, updated_at
)
SELECT 
  gen_random_uuid(),
  'Neil''s Cirrus Cooler',
  'evaporative',
  'Cirrus',
  (SELECT id FROM auth.users WHERE email = 'Neil@crowntechnologies.co.za'),
  'Pretoria - Living Room',
  NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'Neil@crowntechnologies.co.za')
  AND NOT EXISTS (SELECT 1 FROM public.machines WHERE name = 'Neil''s Cirrus Cooler');

-- CoolBreeze Demo Machine
INSERT INTO public.machines (
  id, name, type, manufacturer, owner_id, location, created_at, updated_at
)
SELECT 
  gen_random_uuid(),
  'Neil''s CoolBreeze Unit',
  'evaporative',
  'CoolBreeze',
  (SELECT id FROM auth.users WHERE email = 'Neil@crowntechnologies.co.za'),
  'Pretoria - Bedroom',
  NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'Neil@crowntechnologies.co.za')
  AND NOT EXISTS (SELECT 1 FROM public.machines WHERE name = 'Neil''s CoolBreeze Unit');

-- Alliance Heatpump Demo Machine
INSERT INTO public.machines (
  id, name, type, manufacturer, owner_id, location, temperature_setpoint, created_at, updated_at
)
SELECT 
  gen_random_uuid(),
  'Neil''s Alliance Heatpump',
  'heatpump',
  'Alliance',
  (SELECT id FROM auth.users WHERE email = 'Neil@crowntechnologies.co.za'),
  'Pretoria - Pool Area',
  55.0,
  NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM auth.users WHERE email = 'Neil@crowntechnologies.co.za')
  AND NOT EXISTS (SELECT 1 FROM public.machines WHERE name = 'Neil''s Alliance Heatpump');

-- ========================================
-- 6. CREATE API KEYS FOR MACHINES
-- ========================================

-- Cirrus API Key
INSERT INTO public.api_keys (id, key, machine_id, created_by, created_at, is_active, description)
SELECT 
  gen_random_uuid(), 
  'cirrus-demo-' || substr(md5(random()::text), 1, 24),
  m.id, 
  (SELECT id FROM auth.users WHERE email = 'Neil@crowntechnologies.co.za'), 
  NOW(), 
  true,
  'Demo API Key for Cirrus'
FROM public.machines m
WHERE m.name = 'Neil''s Cirrus Cooler'
  AND NOT EXISTS (SELECT 1 FROM public.api_keys ak WHERE ak.machine_id = m.id);

-- CoolBreeze API Key
INSERT INTO public.api_keys (id, key, machine_id, created_by, created_at, is_active, description)
SELECT 
  gen_random_uuid(), 
  'coolbreeze-demo-' || substr(md5(random()::text), 1, 24),
  m.id, 
  (SELECT id FROM auth.users WHERE email = 'Neil@crowntechnologies.co.za'), 
  NOW(), 
  true,
  'Demo API Key for CoolBreeze'
FROM public.machines m
WHERE m.name = 'Neil''s CoolBreeze Unit'
  AND NOT EXISTS (SELECT 1 FROM public.api_keys ak WHERE ak.machine_id = m.id);

-- Alliance API Key
INSERT INTO public.api_keys (id, key, machine_id, created_by, created_at, is_active, description)
SELECT 
  gen_random_uuid(), 
  'alliance-demo-' || substr(md5(random()::text), 1, 24),
  m.id, 
  (SELECT id FROM auth.users WHERE email = 'Neil@crowntechnologies.co.za'), 
  NOW(), 
  true,
  'Demo API Key for Alliance Heatpump'
FROM public.machines m
WHERE m.name = 'Neil''s Alliance Heatpump'
  AND NOT EXISTS (SELECT 1 FROM public.api_keys ak WHERE ak.machine_id = m.id);

-- ========================================
-- 7. CREATE VOLTAGE CONFIGS FOR MACHINES
-- ========================================

-- Cirrus voltage config
INSERT INTO public.machine_voltage_config (machine_id, voltage_input_1_function, voltage_input_2_function, voltage_input_3_function, voltage_input_4_function, voltage_input_5_function, voltage_active_threshold)
SELECT m.id, 'fan', 'pump', 'drain', 'exhaust', 'water', 6.0
FROM public.machines m
WHERE m.name = 'Neil''s Cirrus Cooler'
  AND NOT EXISTS (SELECT 1 FROM public.machine_voltage_config mvc WHERE mvc.machine_id = m.id);

-- CoolBreeze voltage config
INSERT INTO public.machine_voltage_config (machine_id, voltage_input_1_function, voltage_input_2_function, voltage_input_3_function, voltage_input_4_function, voltage_input_5_function, voltage_active_threshold)
SELECT m.id, 'fan', 'pump', 'drain', 'exhaust', 'water', 6.0
FROM public.machines m
WHERE m.name = 'Neil''s CoolBreeze Unit'
  AND NOT EXISTS (SELECT 1 FROM public.machine_voltage_config mvc WHERE mvc.machine_id = m.id);

-- Alliance voltage config (GPIO5 = pump relay)
INSERT INTO public.machine_voltage_config (machine_id, voltage_input_1_function, voltage_input_2_function, voltage_input_3_function, voltage_input_4_function, voltage_input_5_function, voltage_active_threshold)
SELECT m.id, 'unused', 'unused', 'unused', 'unused', 'pump', 6.0
FROM public.machines m
WHERE m.name = 'Neil''s Alliance Heatpump'
  AND NOT EXISTS (SELECT 1 FROM public.machine_voltage_config mvc WHERE mvc.machine_id = m.id);

-- ========================================
-- 8. CREATE ALERT CONFIGS FOR MACHINES
-- ========================================

-- Cirrus alert config
INSERT INTO public.machine_alert_config (machine_id, motor_temp_warning, motor_temp_critical, motor_amps_warning, delta_t_min_cooling)
SELECT m.id, 70.0, 85.0, 8.0, 3.0
FROM public.machines m
WHERE m.name = 'Neil''s Cirrus Cooler'
  AND NOT EXISTS (SELECT 1 FROM public.machine_alert_config mac WHERE mac.machine_id = m.id);

-- CoolBreeze alert config
INSERT INTO public.machine_alert_config (machine_id, motor_temp_warning, motor_temp_critical, motor_amps_warning, delta_t_min_cooling)
SELECT m.id, 70.0, 85.0, 8.0, 3.0
FROM public.machines m
WHERE m.name = 'Neil''s CoolBreeze Unit'
  AND NOT EXISTS (SELECT 1 FROM public.machine_alert_config mac WHERE mac.machine_id = m.id);

-- Alliance alert config (with heatpump-specific fields)
INSERT INTO public.machine_alert_config (machine_id, motor_temp_warning, motor_temp_critical, motor_amps_warning, current_min_alert, current_max_alert, delta_t_min_heating, delta_t_max_heating, setpoint_tolerance, duration_compressor_failure)
SELECT m.id, 70.0, 85.0, 15.0, 0.5, 30.0, 2.0, 15.0, 5.0, 5
FROM public.machines m
WHERE m.name = 'Neil''s Alliance Heatpump'
  AND NOT EXISTS (SELECT 1 FROM public.machine_alert_config mac WHERE mac.machine_id = m.id);

-- ========================================
-- 9. VERIFY SETUP - VIEW RESULTS
-- ========================================

-- View all users with roles
SELECT 
  p.name,
  p.email,
  ur.role,
  CASE 
    WHEN ur.role = 'super_admin' THEN '👑 Super Admin'
    WHEN ur.role = 'company' THEN '🏢 Company'
    WHEN ur.role = 'installer' THEN '🔧 Installer'
    WHEN ur.role = 'client' THEN '👤 Customer'
    ELSE '❓ Unknown'
  END AS role_display
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
ORDER BY 
  CASE ur.role 
    WHEN 'super_admin' THEN 1 
    WHEN 'company' THEN 2 
    WHEN 'installer' THEN 3 
    WHEN 'client' THEN 4 
    ELSE 5 
  END;

-- View all machines with API keys
SELECT 
  m.name AS machine_name,
  m.type,
  m.manufacturer,
  m.location,
  ak.key AS api_key,
  p.name AS owner_name
FROM public.machines m
LEFT JOIN public.api_keys ak ON ak.machine_id = m.id AND ak.is_active = true
LEFT JOIN public.profiles p ON p.id = m.owner_id
ORDER BY m.manufacturer;

-- ========================================
-- SETUP COMPLETE!
-- ========================================
-- 
-- Demo Accounts Created:
-- 👑 Superadmin@Crowntechnologies.online (Super Admin)
-- 🏢 headoffice@crowntechnologies.co.za (Company)
-- 🔧 Blessing@crowntechnologies.co.za (Installer)
-- 👤 Neil@crowntechnologies.co.za (Customer)
--
-- Demo Machines Created (owned by Neil):
-- 🌀 Neil's Cirrus Cooler (evaporative)
-- ❄️ Neil's CoolBreeze Unit (evaporative)
-- 🔥 Neil's Alliance Heatpump (heatpump)
--
-- Hierarchy:
-- Crown Technologies → Blessing (installer) → Neil (customer)
-- ========================================

