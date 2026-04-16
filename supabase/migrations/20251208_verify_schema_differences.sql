-- ========================================
-- VERIFY SCHEMA DIFFERENCES (UTILITY SCRIPT - NOT A MIGRATION)
-- ========================================
-- Purpose: Compare schema between two databases
-- Usage: Run this MANUALLY on both PRODUCTION and STAGING, then compare results
-- Date: 2025-12-08
-- ========================================
-- NOTE: This is a utility script, not a migration. It should be run manually.
-- If this file is being applied as a migration, it will do nothing.
-- ========================================

-- Wrap in DO block to make it safe if run as migration
DO $$
BEGIN
  -- This script is meant to be run manually, not as a migration
  -- If run as migration, do nothing
  NULL;
END $$;

-- The actual queries below are for manual execution only:
/*

-- Get all tables in public schema
SELECT 
  'TABLE' AS object_type,
  table_name,
  'CREATE TABLE ' || table_name AS definition
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Get all columns for each table
SELECT 
  'COLUMN' AS object_type,
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default,
  table_name || '.' || column_name || ' (' || data_type || ')' AS definition
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Get all functions
SELECT 
  'FUNCTION' AS object_type,
  routine_name,
  routine_definition AS definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- Get all triggers
SELECT 
  'TRIGGER' AS object_type,
  trigger_name,
  event_object_table,
  action_statement AS definition
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Get all indexes
SELECT 
  'INDEX' AS object_type,
  indexname AS index_name,
  tablename AS table_name,
  indexdef AS definition
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Get all constraints
SELECT 
  'CONSTRAINT' AS object_type,
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  tc.table_name || '.' || tc.constraint_name || ' (' || tc.constraint_type || ')' AS definition
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- Get all enums
SELECT 
  'ENUM' AS object_type,
  t.typname AS enum_name,
  string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS enum_values,
  'TYPE ' || t.typname || ' AS ENUM (' || string_agg(quote_literal(e.enumlabel), ', ' ORDER BY e.enumsortorder) || ')' AS definition
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
GROUP BY t.typname
ORDER BY t.typname;
*/
