-- ========================================
-- FIX DUPLICATE MIGRATION VERSIONS
-- ========================================
-- Purpose: Check migration status and clear if needed
-- Usage: Run this on STAGING to see what's been applied
-- ========================================

-- Check what migrations have been applied
SELECT 
    version,
    name,
    inserted_at
FROM supabase_migrations.schema_migrations
ORDER BY inserted_at;

-- Check which tables exist
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check which functions exist
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- If you need to clear migration history to restart:
-- DELETE FROM supabase_migrations.schema_migrations;



