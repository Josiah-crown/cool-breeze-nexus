# SQL Files Cleanup Summary

**Date:** November 25, 2025  
**Status:** ✅ **COMPLETED**

---

## 📊 Files Archived

**Location:** `supabase/migrations/archive/root_sql_files/`

### **Total Files Archived:** 25 files

#### **1. Obsolete Migration Files (1 file)**
- `ALL_MIGRATIONS_COMBINED.sql` - Replaced by `000_COMPLETE_DATABASE_SCHEMA.sql`

#### **2. One-Time Fix Scripts (17 files)**
- `FIX_COOLBREEZE_403_COMPLETE.sql`
- `FIX_COOLBREEZE_403_SIMPLE_TEST.sql`
- `FIX_COOLBREEZE_RLS.sql`
- `FIX_COOLBREEZE_RLS_DEBUG.sql`
- `FIX_COOLBREEZE_RLS_FINAL.sql`
- `FIX_COOLBREEZE_RLS_FINAL_WORKING.sql`
- `FIX_COOLBREEZE_RLS_SIMPLE.sql`
- `FIX_MACHINE_CREATION_RLS.sql`
- `FIX_MACHINES_TABLE.sql`
- `FIX_MISSING_RLS_POLICIES.sql`
- `FIX_READINGS_RAW_COMPLETE.sql`
- `FIX_TRIGGER_FUNCTIONS_SECURITY.sql`
- `FIX_TRIGGER_PERMISSIONS.sql`
- `FIX_USER_ROLES_PERMISSIONS.sql`
- `FIX_ALL_RLS_SECURITY.sql`
- `FIX_ANON_PERMISSIONS.sql`
- `NUCLEAR_FIX_PERMISSIONS.sql`

#### **3. Setup/Configuration Scripts (4 files)**
- `ENABLE_ESP32_DIRECT_INSERT.sql`
- `ENABLE_RLS_AND_FIX_POLICIES.sql`
- `SETUP_DEMO.sql`
- `CLEANUP_DEMO.sql`
- `TEST_ANON_INSERT.sql`
- `QUICK_FIX_ESP32_ONLY.sql`

#### **4. Column/Table Modification Scripts (2 files)**
- `ADD_DELTA_T_COLUMN.sql`
- `ADD_MISSING_MACHINE_COLUMNS.sql`

---

## ✅ Files Kept (Diagnostic Scripts)

**Location:** Root directory

### **Total Files Kept:** 10 files

These are useful for troubleshooting and debugging:

1. `CHECK_1_READINGS_RAW.sql` - Check readings_raw table
2. `CHECK_2_MACHINES_TABLE.sql` - Check machines table
3. `CHECK_3_TOTAL_COUNT.sql` - Check total counts
4. `CHECK_ALL_RLS_STATUS.sql` - Check all RLS status
5. `CHECK_ESP32_DATA.sql` - Check ESP32 data arrival
6. `CHECK_ESP32_DATA_ARRIVAL.sql` - Check ESP32 data arrival
7. `DEBUG_USER_SESSION.sql` - Debug user session
8. `VERIFY_ACTUAL_RLS_STATUS.sql` - Verify RLS status
9. `VERIFY_COOLBREEZE_RLS.sql` - Verify CoolBreeze RLS
10. `VERIFY_RLS_COMPLETE.sql` - Verify RLS complete

**Why Kept:**
- Useful for troubleshooting current system
- Help diagnose issues with RLS policies
- Check data flow from ESP32
- Verify system status

---

## 📋 Summary

- **Archived:** 25 obsolete SQL files
- **Kept:** 10 diagnostic/check scripts
- **Result:** Clean root directory with only useful troubleshooting scripts

---

## 🎯 Next Steps

All obsolete SQL files have been archived. The root directory now only contains:
- Diagnostic scripts (useful for troubleshooting)
- The new complete schema file in `supabase/migrations/`

**Status:** ✅ **CLEANUP COMPLETE**

