-- ========================================
-- CLEAR MIGRATION HISTORY
-- ========================================
-- Purpose: Clear the migration tracking table so migrations can be reapplied
-- Usage: Run this on STAGING if you get "duplicate key" errors during migration
-- WARNING: This will make Supabase think no migrations have been applied
-- ========================================

-- Clear all migration history
DELETE FROM supabase_migrations.schema_migrations;

-- Verify it's empty
SELECT 
    'Migration history cleared' AS status,
    COUNT(*) AS remaining_migrations
FROM supabase_migrations.schema_migrations;

-- If you want to see what was there before clearing (for reference):
-- SELECT version, name, inserted_at FROM supabase_migrations.schema_migrations ORDER BY inserted_at;

SELECT 'Migration history cleared. You can now re-run migrations.' AS status;



