# SQL Files Analysis - Root Directory

**Date:** November 25, 2025  
**Purpose:** Categorize and archive SQL files in root directory

---

## 📊 Categories

### **1. Obsolete Migration Files** ❌ ARCHIVE
- `ALL_MIGRATIONS_COMBINED.sql` - **OBSOLETE** - Replaced by `000_COMPLETE_DATABASE_SCHEMA.sql`

### **2. One-Time Fix Scripts** ⚠️ ARCHIVE (Keep for Reference)
These were used to fix specific issues and are likely no longer needed:

- `FIX_COOLBREEZE_403_COMPLETE.sql` - Fixed CoolBreeze 403 error
- `FIX_COOLBREEZE_403_SIMPLE_TEST.sql` - Test fix for CoolBreeze
- `FIX_COOLBREEZE_RLS.sql` - CoolBreeze RLS fix
- `FIX_COOLBREEZE_RLS_DEBUG.sql` - Debug version
- `FIX_COOLBREEZE_RLS_FINAL.sql` - Final version
- `FIX_COOLBREEZE_RLS_FINAL_WORKING.sql` - Working version
- `FIX_COOLBREEZE_RLS_SIMPLE.sql` - Simple version
- `FIX_MACHINE_CREATION_RLS.sql` - Machine creation RLS fix
- `FIX_MACHINES_TABLE.sql` - Machines table fix
- `FIX_MISSING_RLS_POLICIES.sql` - Missing RLS policies fix
- `FIX_READINGS_RAW_COMPLETE.sql` - Readings raw fix
- `FIX_TRIGGER_FUNCTIONS_SECURITY.sql` - Trigger security fix
- `FIX_TRIGGER_PERMISSIONS.sql` - Trigger permissions fix
- `FIX_USER_ROLES_PERMISSIONS.sql` - User roles fix
- `FIX_ALL_RLS_SECURITY.sql` - All RLS security fix
- `FIX_ANON_PERMISSIONS.sql` - Anon permissions fix
- `NUCLEAR_FIX_PERMISSIONS.sql` - Nuclear permissions fix
- `ENABLE_RLS_AND_FIX_POLICIES.sql` - Enable RLS and fix policies

### **3. Diagnostic/Check Scripts** ✅ KEEP (Useful for Troubleshooting)
These are useful for debugging and checking system status:

- `CHECK_1_READINGS_RAW.sql` - Check readings_raw table
- `CHECK_2_MACHINES_TABLE.sql` - Check machines table
- `CHECK_3_TOTAL_COUNT.sql` - Check total counts
- `CHECK_ALL_RLS_STATUS.sql` - Check all RLS status
- `CHECK_ESP32_DATA.sql` - Check ESP32 data arrival
- `CHECK_ESP32_DATA_ARRIVAL.sql` - Check ESP32 data arrival
- `VERIFY_ACTUAL_RLS_STATUS.sql` - Verify RLS status
- `VERIFY_COOLBREEZE_RLS.sql` - Verify CoolBreeze RLS
- `VERIFY_RLS_COMPLETE.sql` - Verify RLS complete
- `DEBUG_USER_SESSION.sql` - Debug user session

### **4. Setup/Configuration Scripts** ⚠️ ARCHIVE (Likely Obsolete)
- `ENABLE_ESP32_DIRECT_INSERT.sql` - Enable ESP32 direct insert (might be obsolete)
- `SETUP_DEMO.sql` - Demo setup (obsolete)
- `CLEANUP_DEMO.sql` - Demo cleanup (obsolete)
- `TEST_ANON_INSERT.sql` - Test anon insert (obsolete)
- `QUICK_FIX_ESP32_ONLY.sql` - Quick ESP32 fix (obsolete)

### **5. Column/Table Modification Scripts** ⚠️ ARCHIVE (Likely Obsolete)
- `ADD_DELTA_T_COLUMN.sql` - Add delta_t column (likely already applied)
- `ADD_MISSING_MACHINE_COLUMNS.sql` - Add missing machine columns (likely already applied)
- `FIX_MACHINES_TABLE.sql` - Fix machines table (likely already applied)

---

## 📋 Recommendation

### **Archive These:**
1. All fix scripts (FIX_*.sql) - One-time fixes, no longer needed
2. All setup scripts (SETUP_*.sql, ENABLE_*.sql) - One-time setup, likely obsolete
3. `ALL_MIGRATIONS_COMBINED.sql` - Replaced by new schema
4. Column modification scripts - Likely already applied

### **Keep These:**
1. Diagnostic scripts (CHECK_*.sql, VERIFY_*.sql) - Useful for troubleshooting
2. Debug scripts (DEBUG_*.sql) - Useful for debugging

---

## 🗂️ Archive Location
`supabase/migrations/archive/root_sql_files/`

---

**Status:** Ready to archive obsolete files

