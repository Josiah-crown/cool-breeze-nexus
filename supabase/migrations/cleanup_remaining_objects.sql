-- ========================================
-- CLEANUP REMAINING OBJECTS
-- ========================================
-- Purpose: Remove any remaining functions, triggers, types after manual table deletion
-- Usage: Run this on STAGING to ensure everything is clean
-- ========================================

-- Drop all functions that might still exist
DROP FUNCTION IF EXISTS public.get_historical_data CASCADE;
DROP FUNCTION IF EXISTS public.process_cirrus_reading CASCADE;
DROP FUNCTION IF EXISTS public.process_coolbreeze_reading CASCADE;
DROP FUNCTION IF EXISTS public.process_alliance_reading CASCADE;
DROP FUNCTION IF EXISTS public.has_role CASCADE;
DROP FUNCTION IF EXISTS public.get_user_admin CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column CASCADE;
DROP FUNCTION IF EXISTS public.update_SMM_updated_at CASCADE;
DROP FUNCTION IF EXISTS public.SMM_handle_unsubscribe CASCADE;
DROP FUNCTION IF EXISTS public.SMM_cleanup_old_failed_addresses CASCADE;

-- Drop all custom types/enums
DROP TYPE IF EXISTS public.app_role CASCADE;

-- Drop any remaining triggers (should be gone with tables, but just in case)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT trigger_name, event_object_table 
              FROM information_schema.triggers 
              WHERE trigger_schema = 'public') 
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || 
                ' ON ' || quote_ident(r.event_object_table) || ' CASCADE';
    END LOOP;
END $$;

-- Verify cleanup
SELECT 
    'Remaining Objects Check' AS status,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') AS tables,
    (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION') AS functions,
    (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public') AS triggers,
    (SELECT COUNT(*) FROM pg_type WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public') AND typtype = 'e') AS enums;

SELECT 'Cleanup complete! If all counts are 0 (or very low), you are ready to proceed.' AS status;



