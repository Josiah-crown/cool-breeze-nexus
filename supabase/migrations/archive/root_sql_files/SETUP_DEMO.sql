-- ========================================
-- IOT NEXUS - DEMO DATA SETUP
-- ========================================
-- This script creates:
-- - 1 Super Admin (Headoffice@crowntechnologies.co.za)
-- - 3 Companies (Ironhorse, Crowntechnologies, TomHVAC)
-- - 10 Installers (blessing, thami, mark, etc.)
-- - 20 Clients (random names and addresses)
-- - 50 Machines (evaporative, airconditioner, heatpump)
-- ========================================
-- Run this in Supabase SQL Editor
-- IMPORTANT: You must create the auth users FIRST (see instructions below)
-- ========================================

-- ========================================
-- STEP 1: CREATE AUTH USERS FIRST
-- ========================================
-- Go to: https://supabase.com/dashboard/project/wjyanxstvbiqefmgpccb/auth/users
-- Click "Add User" and create these users (use simple passwords like "Password123!"):
--
-- SUPER ADMIN:
-- 1. headoffice@crowntechnologies.co.za
--
-- COMPANIES:
-- 2. ironhorse@company.com
-- 3. crown@crowntechnologies.co.za
-- 4. tom@tomhvac.com
--
-- INSTALLERS:
-- 5. blessing@installer.com
-- 6. thami@installer.com
-- 7. mark@installer.com
-- 8. james@installer.com
-- 9. david@installer.com
-- 10. michael@installer.com
-- 11. robert@installer.com
-- 12. william@installer.com
-- 13. joseph@installer.com
-- 14. charles@installer.com
--
-- CLIENTS:
-- 15-34. client1@client.com through client20@client.com
-- (Or just run the ones you need - script will handle missing ones gracefully)
--
-- After creating auth users, copy their UUIDs into the variables below:
-- ========================================

-- ========================================
-- STEP 2: SET USER IDs (Replace with actual UUIDs from Step 1)
-- ========================================
-- You can get all UUIDs at once with this query:
-- SELECT id, email FROM auth.users ORDER BY email;
-- ========================================

-- For now, we'll use the email to look up the UUIDs dynamically
-- This way you don't need to manually copy/paste 34 UUIDs!

DO $$
DECLARE
  -- Super Admin
  v_super_admin_id UUID;
  
  -- Companies
  v_ironhorse_id UUID;
  v_crown_id UUID;
  v_tomhvac_id UUID;
  
  -- Installers
  v_blessing_id UUID;
  v_thami_id UUID;
  v_mark_id UUID;
  v_james_id UUID;
  v_david_id UUID;
  v_michael_id UUID;
  v_robert_id UUID;
  v_william_id UUID;
  v_joseph_id UUID;
  v_charles_id UUID;
  
  -- Client IDs (array)
  v_client_ids UUID[];
  v_client_id UUID;
  v_counter INT;
  
  -- Machine counters
  v_machine_counter INT := 1;
  v_random_temp NUMERIC;
  v_random_delta NUMERIC;
  v_machine_types TEXT[] := ARRAY['evaporative', 'airconditioner', 'heatpump'];
  v_machine_type TEXT;
  
BEGIN
  RAISE NOTICE 'Starting demo data creation...';
  
  -- ========================================
  -- LOOKUP USER IDs FROM AUTH
  -- ========================================
  SELECT id INTO v_super_admin_id FROM auth.users WHERE email = 'headoffice@crowntechnologies.co.za';
  SELECT id INTO v_ironhorse_id FROM auth.users WHERE email = 'ironhorse@company.com';
  SELECT id INTO v_crown_id FROM auth.users WHERE email = 'crown@crowntechnologies.co.za';
  SELECT id INTO v_tomhvac_id FROM auth.users WHERE email = 'tom@tomhvac.com';
  
  SELECT id INTO v_blessing_id FROM auth.users WHERE email = 'blessing@installer.com';
  SELECT id INTO v_thami_id FROM auth.users WHERE email = 'thami@installer.com';
  SELECT id INTO v_mark_id FROM auth.users WHERE email = 'mark@installer.com';
  SELECT id INTO v_james_id FROM auth.users WHERE email = 'james@installer.com';
  SELECT id INTO v_david_id FROM auth.users WHERE email = 'david@installer.com';
  SELECT id INTO v_michael_id FROM auth.users WHERE email = 'michael@installer.com';
  SELECT id INTO v_robert_id FROM auth.users WHERE email = 'robert@installer.com';
  SELECT id INTO v_william_id FROM auth.users WHERE email = 'william@installer.com';
  SELECT id INTO v_joseph_id FROM auth.users WHERE email = 'joseph@installer.com';
  SELECT id INTO v_charles_id FROM auth.users WHERE email = 'charles@installer.com';
  
  -- Get client IDs
  SELECT ARRAY_AGG(id) INTO v_client_ids 
  FROM auth.users 
  WHERE email LIKE 'client%@client.com';
  
  -- ========================================
  -- CREATE PROFILES
  -- ========================================
  RAISE NOTICE 'Creating profiles...';
  
  -- Super Admin
  IF v_super_admin_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, name, email, cell_number, country, state, city, street, suburb, full_name_business)
    VALUES (v_super_admin_id, 'Head Office', 'headoffice@crowntechnologies.co.za', '+27123456789', 'South Africa', 'Gauteng', 'Johannesburg', '123 Main St', 'Sandton', 'Crown Technologies Head Office');
  END IF;
  
  -- Companies
  IF v_ironhorse_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, name, email, cell_number, country, state, city, street, suburb, full_name_business)
    VALUES (v_ironhorse_id, 'Ironhorse', 'ironhorse@company.com', '+27111111111', 'South Africa', 'Western Cape', 'Cape Town', '45 Mining Ave', 'City Centre', 'Ironhorse HVAC Solutions');
  END IF;
  
  IF v_crown_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, name, email, cell_number, country, state, city, street, suburb, full_name_business)
    VALUES (v_crown_id, 'Crowntechnologies', 'crown@crowntechnologies.co.za', '+27222222222', 'South Africa', 'Gauteng', 'Pretoria', '78 Tech Park Rd', 'Centurion', 'Crown Technologies Pty Ltd');
  END IF;
  
  IF v_tomhvac_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, name, email, cell_number, country, state, city, street, suburb, full_name_business)
    VALUES (v_tomhvac_id, 'TomHVAC', 'tom@tomhvac.com', '+27333333333', 'South Africa', 'KwaZulu-Natal', 'Durban', '12 Coastal Dr', 'Umhlanga', 'Tom HVAC Services');
  END IF;
  
  -- Installers
  IF v_blessing_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, name, email, cell_number, country, state, city, street, suburb, full_name_business)
    VALUES (v_blessing_id, 'Blessing Mkhize', 'blessing@installer.com', '+27810001001', 'South Africa', 'Gauteng', 'Johannesburg', '5 Oak St', 'Roodepoort', 'Blessing Mkhize');
  END IF;
  
  IF v_thami_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, name, email, cell_number, country, state, city, street, suburb, full_name_business)
    VALUES (v_thami_id, 'Thami Ndlovu', 'thami@installer.com', '+27810001002', 'South Africa', 'Gauteng', 'Soweto', '22 Freedom Rd', 'Soweto', 'Thami Ndlovu');
  END IF;
  
  IF v_mark_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, name, email, cell_number, country, state, city, street, suburb, full_name_business)
    VALUES (v_mark_id, 'Mark Johnson', 'mark@installer.com', '+27810001003', 'South Africa', 'Western Cape', 'Cape Town', '88 Beach Rd', 'Sea Point', 'Mark Johnson');
  END IF;
  
  IF v_james_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, name, email, cell_number, country, state, city, street, suburb, full_name_business)
    VALUES (v_james_id, 'James Smith', 'james@installer.com', '+27810001004', 'South Africa', 'Gauteng', 'Pretoria', '15 Maple Ave', 'Hatfield', 'James Smith');
  END IF;
  
  IF v_david_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, name, email, cell_number, country, state, city, street, suburb, full_name_business)
    VALUES (v_david_id, 'David Williams', 'david@installer.com', '+27810001005', 'South Africa', 'KwaZulu-Natal', 'Durban', '34 Palm St', 'Morningside', 'David Williams');
  END IF;
  
  IF v_michael_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, name, email, cell_number, country, state, city, street, suburb, full_name_business)
    VALUES (v_michael_id, 'Michael Brown', 'michael@installer.com', '+27810001006', 'South Africa', 'Gauteng', 'Midrand', '67 Tech Rd', 'Midrand', 'Michael Brown');
  END IF;
  
  IF v_robert_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, name, email, cell_number, country, state, city, street, suburb, full_name_business)
    VALUES (v_robert_id, 'Robert Davis', 'robert@installer.com', '+27810001007', 'South Africa', 'Western Cape', 'Stellenbosch', '9 Wine St', 'Stellenbosch', 'Robert Davis');
  END IF;
  
  IF v_william_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, name, email, cell_number, country, state, city, street, suburb, full_name_business)
    VALUES (v_william_id, 'William Miller', 'william@installer.com', '+27810001008', 'South Africa', 'Gauteng', 'Sandton', '101 Business Blvd', 'Sandton', 'William Miller');
  END IF;
  
  IF v_joseph_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, name, email, cell_number, country, state, city, street, suburb, full_name_business)
    VALUES (v_joseph_id, 'Joseph Wilson', 'joseph@installer.com', '+27810001009', 'South Africa', 'KwaZulu-Natal', 'Pietermaritzburg', '44 Valley Rd', 'PMB', 'Joseph Wilson');
  END IF;
  
  IF v_charles_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, name, email, cell_number, country, state, city, street, suburb, full_name_business)
    VALUES (v_charles_id, 'Charles Moore', 'charles@installer.com', '+27810001010', 'South Africa', 'Gauteng', 'Randburg', '77 Park Lane', 'Randburg', 'Charles Moore');
  END IF;
  
  -- Clients (20)
  v_counter := 1;
  FOREACH v_client_id IN ARRAY v_client_ids LOOP
    EXIT WHEN v_counter > 20;
    INSERT INTO public.profiles (id, name, email, cell_number, country, state, city, street, suburb, full_name_business)
    VALUES (
      v_client_id,
      'Client ' || v_counter,
      'client' || v_counter || '@client.com',
      '+2782000' || LPAD(v_counter::TEXT, 4, '0'),
      'South Africa',
      CASE 
        WHEN v_counter % 3 = 0 THEN 'Gauteng'
        WHEN v_counter % 3 = 1 THEN 'Western Cape'
        ELSE 'KwaZulu-Natal'
      END,
      CASE 
        WHEN v_counter % 3 = 0 THEN 'Johannesburg'
        WHEN v_counter % 3 = 1 THEN 'Cape Town'
        ELSE 'Durban'
      END,
      (v_counter * 10) || ' Client Street',
      'Suburb ' || v_counter,
      'Client Business ' || v_counter
    );
    v_counter := v_counter + 1;
  END LOOP;
  
  -- ========================================
  -- CREATE USER ROLES
  -- ========================================
  RAISE NOTICE 'Creating user roles...';
  
  -- Super Admin
  IF v_super_admin_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_super_admin_id, 'super_admin');
  END IF;
  
  -- Companies
  IF v_ironhorse_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_ironhorse_id, 'company');
  END IF;
  IF v_crown_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_crown_id, 'company');
  END IF;
  IF v_tomhvac_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_tomhvac_id, 'company');
  END IF;
  
  -- Installers
  IF v_blessing_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_blessing_id, 'installer');
  END IF;
  IF v_thami_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_thami_id, 'installer');
  END IF;
  IF v_mark_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_mark_id, 'installer');
  END IF;
  IF v_james_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_james_id, 'installer');
  END IF;
  IF v_david_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_david_id, 'installer');
  END IF;
  IF v_michael_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_michael_id, 'installer');
  END IF;
  IF v_robert_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_robert_id, 'installer');
  END IF;
  IF v_william_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_william_id, 'installer');
  END IF;
  IF v_joseph_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_joseph_id, 'installer');
  END IF;
  IF v_charles_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_charles_id, 'installer');
  END IF;
  
  -- Clients
  FOREACH v_client_id IN ARRAY v_client_ids LOOP
    INSERT INTO public.user_roles (user_id, role) VALUES (v_client_id, 'client');
  END LOOP;
  
  -- ========================================
  -- ASSIGN INSTALLERS TO COMPANIES
  -- ========================================
  RAISE NOTICE 'Assigning installers to companies...';
  
  -- Ironhorse gets Blessing, Thami, Mark
  IF v_ironhorse_id IS NOT NULL AND v_blessing_id IS NOT NULL THEN
    INSERT INTO public.installer_company_assignments (installer_id, company_id, assigned_by)
    VALUES (v_blessing_id, v_ironhorse_id, v_super_admin_id);
  END IF;
  IF v_ironhorse_id IS NOT NULL AND v_thami_id IS NOT NULL THEN
    INSERT INTO public.installer_company_assignments (installer_id, company_id, assigned_by)
    VALUES (v_thami_id, v_ironhorse_id, v_super_admin_id);
  END IF;
  IF v_ironhorse_id IS NOT NULL AND v_mark_id IS NOT NULL THEN
    INSERT INTO public.installer_company_assignments (installer_id, company_id, assigned_by)
    VALUES (v_mark_id, v_ironhorse_id, v_super_admin_id);
  END IF;
  
  -- Crown gets James, David, Michael, Robert
  IF v_crown_id IS NOT NULL AND v_james_id IS NOT NULL THEN
    INSERT INTO public.installer_company_assignments (installer_id, company_id, assigned_by)
    VALUES (v_james_id, v_crown_id, v_super_admin_id);
  END IF;
  IF v_crown_id IS NOT NULL AND v_david_id IS NOT NULL THEN
    INSERT INTO public.installer_company_assignments (installer_id, company_id, assigned_by)
    VALUES (v_david_id, v_crown_id, v_super_admin_id);
  END IF;
  IF v_crown_id IS NOT NULL AND v_michael_id IS NOT NULL THEN
    INSERT INTO public.installer_company_assignments (installer_id, company_id, assigned_by)
    VALUES (v_michael_id, v_crown_id, v_super_admin_id);
  END IF;
  IF v_crown_id IS NOT NULL AND v_robert_id IS NOT NULL THEN
    INSERT INTO public.installer_company_assignments (installer_id, company_id, assigned_by)
    VALUES (v_robert_id, v_crown_id, v_super_admin_id);
  END IF;
  
  -- TomHVAC gets William, Joseph, Charles
  IF v_tomhvac_id IS NOT NULL AND v_william_id IS NOT NULL THEN
    INSERT INTO public.installer_company_assignments (installer_id, company_id, assigned_by)
    VALUES (v_william_id, v_tomhvac_id, v_super_admin_id);
  END IF;
  IF v_tomhvac_id IS NOT NULL AND v_joseph_id IS NOT NULL THEN
    INSERT INTO public.installer_company_assignments (installer_id, company_id, assigned_by)
    VALUES (v_joseph_id, v_tomhvac_id, v_super_admin_id);
  END IF;
  IF v_tomhvac_id IS NOT NULL AND v_charles_id IS NOT NULL THEN
    INSERT INTO public.installer_company_assignments (installer_id, company_id, assigned_by)
    VALUES (v_charles_id, v_tomhvac_id, v_super_admin_id);
  END IF;
  
  -- ========================================
  -- ASSIGN CLIENTS TO INSTALLERS
  -- ========================================
  RAISE NOTICE 'Assigning clients to installers...';
  
  -- Distribute 20 clients among 10 installers (2 each)
  v_counter := 1;
  FOREACH v_client_id IN ARRAY v_client_ids LOOP
    EXIT WHEN v_counter > 20;
    
    -- Assign to installers in round-robin fashion
    CASE 
      WHEN v_counter IN (1, 2) AND v_blessing_id IS NOT NULL THEN
        INSERT INTO public.client_admin_assignments (client_id, admin_id, assigned_by)
        VALUES (v_client_id, v_blessing_id, v_super_admin_id);
      WHEN v_counter IN (3, 4) AND v_thami_id IS NOT NULL THEN
        INSERT INTO public.client_admin_assignments (client_id, admin_id, assigned_by)
        VALUES (v_client_id, v_thami_id, v_super_admin_id);
      WHEN v_counter IN (5, 6) AND v_mark_id IS NOT NULL THEN
        INSERT INTO public.client_admin_assignments (client_id, admin_id, assigned_by)
        VALUES (v_client_id, v_mark_id, v_super_admin_id);
      WHEN v_counter IN (7, 8) AND v_james_id IS NOT NULL THEN
        INSERT INTO public.client_admin_assignments (client_id, admin_id, assigned_by)
        VALUES (v_client_id, v_james_id, v_super_admin_id);
      WHEN v_counter IN (9, 10) AND v_david_id IS NOT NULL THEN
        INSERT INTO public.client_admin_assignments (client_id, admin_id, assigned_by)
        VALUES (v_client_id, v_david_id, v_super_admin_id);
      WHEN v_counter IN (11, 12) AND v_michael_id IS NOT NULL THEN
        INSERT INTO public.client_admin_assignments (client_id, admin_id, assigned_by)
        VALUES (v_client_id, v_michael_id, v_super_admin_id);
      WHEN v_counter IN (13, 14) AND v_robert_id IS NOT NULL THEN
        INSERT INTO public.client_admin_assignments (client_id, admin_id, assigned_by)
        VALUES (v_client_id, v_robert_id, v_super_admin_id);
      WHEN v_counter IN (15, 16) AND v_william_id IS NOT NULL THEN
        INSERT INTO public.client_admin_assignments (client_id, admin_id, assigned_by)
        VALUES (v_client_id, v_william_id, v_super_admin_id);
      WHEN v_counter IN (17, 18) AND v_joseph_id IS NOT NULL THEN
        INSERT INTO public.client_admin_assignments (client_id, admin_id, assigned_by)
        VALUES (v_client_id, v_joseph_id, v_super_admin_id);
      WHEN v_counter IN (19, 20) AND v_charles_id IS NOT NULL THEN
        INSERT INTO public.client_admin_assignments (client_id, admin_id, assigned_by)
        VALUES (v_client_id, v_charles_id, v_super_admin_id);
      ELSE
        NULL;
    END CASE;
    
    v_counter := v_counter + 1;
  END LOOP;
  
  -- ========================================
  -- CREATE 50 MACHINES
  -- ========================================
  RAISE NOTICE 'Creating 50 machines...';
  
  -- Create machines for clients (40 machines - 2 per client)
  v_counter := 1;
  FOREACH v_client_id IN ARRAY v_client_ids LOOP
    EXIT WHEN v_counter > 20;
    
    -- Machine 1 for this client
    v_random_temp := 18 + (random() * 15);
    v_random_delta := 5 + (random() * 15);
    v_machine_type := v_machine_types[(FLOOR(random() * 3) + 1)::INT];
    
    INSERT INTO public.machines (
      name, type, owner_id, location,
      is_on, is_connected, has_water, is_cooling, fan_active, has_pump, has_heat,
      motor_temp, outside_temp, inside_temp, delta_t,
      current, voltage, power, temperature_setpoint,
      overall_status, motor_status, notifications_enabled
    ) VALUES (
      'Machine ' || v_machine_counter || 'A',
      v_machine_type,
      v_client_id,
      'Building A - Floor ' || ((v_counter % 5) + 1),
      random() > 0.3,
      random() > 0.1,
      random() > 0.2,
      random() > 0.4,
      random() > 0.4,
      v_machine_type = 'heatpump',
      v_machine_type = 'heatpump' AND random() > 0.5,
      40 + (random() * 20),
      v_random_temp,
      v_random_temp - 5,
      v_random_delta,
      8 + (random() * 12),
      220 + (random() * 20),
      (1 + random() * 4) * 1000,
      CASE WHEN v_machine_type = 'heatpump' THEN 50 + (random() * 15) ELSE NULL END,
      CASE 
        WHEN random() > 0.8 THEN 'error'
        WHEN random() > 0.6 THEN 'warning'
        ELSE 'good'
      END,
      CASE 
        WHEN random() > 0.9 THEN 'critical'
        WHEN random() > 0.7 THEN 'warning'
        ELSE 'normal'
      END,
      false
    );
    v_machine_counter := v_machine_counter + 1;
    
    -- Machine 2 for this client
    v_random_temp := 18 + (random() * 15);
    v_random_delta := 5 + (random() * 15);
    v_machine_type := v_machine_types[(FLOOR(random() * 3) + 1)::INT];
    
    INSERT INTO public.machines (
      name, type, owner_id, location,
      is_on, is_connected, has_water, is_cooling, fan_active, has_pump, has_heat,
      motor_temp, outside_temp, inside_temp, delta_t,
      current, voltage, power, temperature_setpoint,
      overall_status, motor_status, notifications_enabled
    ) VALUES (
      'Machine ' || v_machine_counter || 'B',
      v_machine_type,
      v_client_id,
      'Building B - Floor ' || ((v_counter % 3) + 1),
      random() > 0.3,
      random() > 0.1,
      random() > 0.2,
      random() > 0.4,
      random() > 0.4,
      v_machine_type = 'heatpump',
      v_machine_type = 'heatpump' AND random() > 0.5,
      40 + (random() * 20),
      v_random_temp,
      v_random_temp - 5,
      v_random_delta,
      8 + (random() * 12),
      220 + (random() * 20),
      (1 + random() * 4) * 1000,
      CASE WHEN v_machine_type = 'heatpump' THEN 50 + (random() * 15) ELSE NULL END,
      CASE 
        WHEN random() > 0.8 THEN 'error'
        WHEN random() > 0.6 THEN 'warning'
        ELSE 'good'
      END,
      CASE 
        WHEN random() > 0.9 THEN 'critical'
        WHEN random() > 0.7 THEN 'warning'
        ELSE 'normal'
      END,
      false
    );
    v_machine_counter := v_machine_counter + 1;
    
    v_counter := v_counter + 1;
  END LOOP;
  
  -- Create 10 more machines owned by super admin for testing
  FOR i IN 1..10 LOOP
    v_random_temp := 18 + (random() * 15);
    v_random_delta := 5 + (random() * 15);
    v_machine_type := v_machine_types[(FLOOR(random() * 3) + 1)::INT];
    
    IF v_super_admin_id IS NOT NULL THEN
      INSERT INTO public.machines (
        name, type, owner_id, location,
        is_on, is_connected, has_water, is_cooling, fan_active, has_pump, has_heat,
        motor_temp, outside_temp, inside_temp, delta_t,
        current, voltage, power, temperature_setpoint,
        overall_status, motor_status, notifications_enabled
      ) VALUES (
        'HQ Test Machine ' || i,
        v_machine_type,
        v_super_admin_id,
        'Head Office - Test Lab ' || i,
        random() > 0.3,
        random() > 0.1,
        random() > 0.2,
        random() > 0.4,
        random() > 0.4,
        v_machine_type = 'heatpump',
        v_machine_type = 'heatpump' AND random() > 0.5,
        40 + (random() * 20),
        v_random_temp,
        v_random_temp - 5,
        v_random_delta,
        8 + (random() * 12),
        220 + (random() * 20),
        (1 + random() * 4) * 1000,
        CASE WHEN v_machine_type = 'heatpump' THEN 50 + (random() * 15) ELSE NULL END,
        CASE 
          WHEN random() > 0.8 THEN 'error'
          WHEN random() > 0.6 THEN 'warning'
          ELSE 'good'
        END,
        CASE 
          WHEN random() > 0.9 THEN 'critical'
          WHEN random() > 0.7 THEN 'warning'
          ELSE 'normal'
        END,
        false
      );
    END IF;
  END LOOP;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DEMO DATA CREATED SUCCESSFULLY!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '- 1 Super Admin';
  RAISE NOTICE '- 3 Companies';
  RAISE NOTICE '- 10 Installers';
  RAISE NOTICE '- 20 Clients';
  RAISE NOTICE '- 50 Machines (40 for clients, 10 for super admin)';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Login as: headoffice@crowntechnologies.co.za';
  RAISE NOTICE 'Password: (the password you set in Step 1)';
  RAISE NOTICE '========================================';
  
END $$;

-- ========================================
-- VERIFY DATA
-- ========================================
SELECT 'Profiles created:' as info, COUNT(*) as count FROM public.profiles
UNION ALL
SELECT 'User roles created:', COUNT(*) FROM public.user_roles
UNION ALL
SELECT 'Companies:', COUNT(*) FROM public.user_roles WHERE role = 'company'
UNION ALL
SELECT 'Installers:', COUNT(*) FROM public.user_roles WHERE role = 'installer'
UNION ALL
SELECT 'Clients:', COUNT(*) FROM public.user_roles WHERE role = 'client'
UNION ALL
SELECT 'Machines created:', COUNT(*) FROM public.machines
UNION ALL
SELECT 'Installer assignments:', COUNT(*) FROM public.installer_company_assignments
UNION ALL
SELECT 'Client assignments:', COUNT(*) FROM public.client_admin_assignments;

