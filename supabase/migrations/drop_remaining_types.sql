-- ========================================
-- DROP REMAINING TYPES/ENUMS
-- ========================================
-- Purpose: Drop any remaining custom types that prevent migrations from running
-- Usage: Run this on STAGING before pushing migrations
-- ========================================

-- Drop the app_role enum (and any dependent objects)
DROP TYPE IF EXISTS public.app_role CASCADE;

-- Verify it's gone
SELECT 
    'Types Check' AS status,
    COUNT(*) AS remaining_enums
FROM pg_type 
WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public') 
  AND typtype = 'e';

SELECT 'Types dropped. You can now run migrations.' AS status;



