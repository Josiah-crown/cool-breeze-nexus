-- ========================================
-- GET EXACT PRODUCTION SCHEMA
-- ========================================
-- Purpose: Generate CREATE statements for all objects in production
-- Usage: Run this on PRODUCTION, then use output to create staging
-- ========================================

-- ========================================
-- 1. GET ALL TABLES (with CREATE TABLE statements)
-- ========================================
SELECT 
    '-- Table: ' || schemaname || '.' || tablename AS comment,
    pg_get_tabledef(schemaname || '.' || tablename) AS create_statement
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ========================================
-- 2. GET ALL FUNCTIONS
-- ========================================
SELECT 
    '-- Function: ' || routine_name AS comment,
    pg_get_functiondef(oid) AS create_statement
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY routine_name;

-- ========================================
-- 3. GET ALL VIEWS
-- ========================================
SELECT 
    '-- View: ' || schemaname || '.' || viewname AS comment,
    pg_get_viewdef(schemaname || '.' || viewname, true) AS create_statement
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;

-- ========================================
-- 4. GET ALL TRIGGERS
-- ========================================
SELECT 
    '-- Trigger: ' || trigger_name || ' ON ' || event_object_table AS comment,
    pg_get_triggerdef(oid) AS create_statement
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND NOT t.tgisinternal
ORDER BY event_object_table, trigger_name;

-- ========================================
-- 5. GET ALL TYPES/ENUMS
-- ========================================
SELECT 
    '-- Type: ' || typname AS comment,
    'CREATE TYPE ' || typname || ' AS ENUM (' || 
    string_agg(quote_literal(enumlabel), ', ' ORDER BY enumsortorder) || 
    ');' AS create_statement
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON t.typnamespace = n.oid
WHERE n.nspname = 'public'
GROUP BY typname
ORDER BY typname;



