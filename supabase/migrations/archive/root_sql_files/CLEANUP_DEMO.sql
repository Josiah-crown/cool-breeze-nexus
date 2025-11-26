-- ========================================
-- IOT NEXUS - DEMO DATA CLEANUP
-- ========================================
-- This script removes ALL demo data created by SETUP_DEMO.sql
-- ========================================
-- ⚠️ WARNING: This will delete:
-- - All machines
-- - All client, installer, and company assignments
-- - All profiles and user roles
-- - ALL AUTH USERS (except ones you specify to keep)
-- ========================================
-- Run this in Supabase SQL Editor AFTER your demo
-- ========================================

DO $$
DECLARE
  v_keep_emails TEXT[] := ARRAY[
    -- Add any email addresses you want to KEEP (not delete)
    -- Example: 'myreal@email.com'
    -- Leave empty to delete ALL demo users
  ];
  v_deleted_count INT;
BEGIN
  RAISE NOTICE 'Starting demo data cleanup...';
  
  -- ========================================
  -- DELETE MACHINES (CASCADE will handle)
  -- ========================================
  DELETE FROM public.machines WHERE true;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % machines', v_deleted_count;
  
  -- ========================================
  -- DELETE API KEYS
  -- ========================================
  DELETE FROM public.api_keys WHERE true;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % API keys', v_deleted_count;
  
  -- ========================================
  -- DELETE ASSIGNMENTS
  -- ========================================
  DELETE FROM public.client_admin_assignments WHERE true;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % client assignments', v_deleted_count;
  
  DELETE FROM public.installer_company_assignments WHERE true;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % installer assignments', v_deleted_count;
  
  -- ========================================
  -- DELETE USER ROLES
  -- ========================================
  DELETE FROM public.user_roles WHERE true;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % user roles', v_deleted_count;
  
  -- ========================================
  -- DELETE PROFILES
  -- ========================================
  DELETE FROM public.profiles WHERE true;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % profiles', v_deleted_count;
  
  -- ========================================
  -- DELETE AUTH USERS (except kept ones)
  -- ========================================
  -- Note: This requires service_role key access
  -- If this fails, manually delete users from Authentication > Users in dashboard
  
  IF array_length(v_keep_emails, 1) IS NULL OR array_length(v_keep_emails, 1) = 0 THEN
    -- Delete ALL users
    DELETE FROM auth.users WHERE true;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted ALL % auth users', v_deleted_count;
  ELSE
    -- Delete all except specified emails
    DELETE FROM auth.users WHERE email != ALL(v_keep_emails);
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % auth users (kept: %)', v_deleted_count, array_to_string(v_keep_emails, ', ');
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DEMO DATA CLEANUP COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Database is now clean and ready for production data';
  RAISE NOTICE '========================================';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error during cleanup: %', SQLERRM;
    RAISE NOTICE 'You may need to manually delete auth.users from the Authentication dashboard';
END $$;

-- ========================================
-- VERIFY CLEANUP
-- ========================================
SELECT 'Remaining profiles:' as info, COUNT(*) as count FROM public.profiles
UNION ALL
SELECT 'Remaining user roles:', COUNT(*) FROM public.user_roles
UNION ALL
SELECT 'Remaining machines:', COUNT(*) FROM public.machines
UNION ALL
SELECT 'Remaining API keys:', COUNT(*) FROM public.api_keys
UNION ALL
SELECT 'Remaining auth users:', COUNT(*) FROM auth.users;

