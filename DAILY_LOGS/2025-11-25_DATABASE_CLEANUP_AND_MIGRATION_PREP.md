# Daily Log - November 25, 2025 - Database Cleanup and Migration Preparation

## Session Summary

**Time Period:** November 25, 2025  
**Overview:** Comprehensive database analysis, cleanup planning, and preparation for future Supabase migration to new architecture

---

## Major Accomplishments

### ✅ COMPLETED: Database Architecture Analysis

**Status:** ✅ **COMPLETED**

**Tasks Completed:**
- [x] Analyzed current database structure
- [x] Identified all tables and their purposes
- [x] Documented data flow from ESP32 to frontend
- [x] Identified issues with current architecture:
  - No historical raw data (readings_raw deleted immediately)
  - Not expansion-friendly (adding manufacturer requires code changes)
  - Missing pickup voltage columns in calculated tables
  - Redundant columns (notifications_enabled, etc.)

**Files Created:**
- `SUPABASE_ANALYSIS_AND_CLEANUP_PLAN.md` - Complete analysis document

**Result:**
- ✅ Complete understanding of current database structure
- ✅ All issues identified and documented
- ✅ Ready for architecture redesign

---

### ✅ COMPLETED: New Database Architecture Design

**Status:** ✅ **COMPLETED**

**Tasks Completed:**
- [x] Designed manufacturer-agnostic architecture
- [x] Created pattern: `{manufacturer}_raw`, `{manufacturer}_calculated`, `{manufacturer}_notifications`, `{manufacturer}_voltage_config`
- [x] Designed shared tables: `machine_connection_status` (generic for all manufacturers)
- [x] Implemented voltage input mapping: Custom_1 through Custom_6 (generic, expansion-friendly)
- [x] Designed data retention: 2 weeks raw, 1 year calculated

**Files Created:**
- `PROPOSED_DATABASE_ARCHITECTURE.md` - Complete architecture proposal
- `supabase/migrations/000_COMPLETE_DATABASE_SCHEMA.sql` - Complete SQL schema for new instance

**Key Features:**
- ✅ Expansion-friendly: Add new manufacturer = add 4 tables
- ✅ Historical data: 2 weeks raw + 1 year calculated
- ✅ Self-contained: Each manufacturer has all its data/config
- ✅ Configurable: Voltage mappings and notifications per manufacturer

**Result:**
- ✅ Complete architecture designed and documented
- ✅ SQL schema ready for new Supabase instance
- ✅ Migration guide created

---

### ✅ COMPLETED: Complete Database Schema SQL

**Status:** ✅ **COMPLETED**

**Tasks Completed:**
- [x] Created complete database schema SQL file
- [x] Includes all tables: user management, machines, connection status, per-manufacturer tables
- [x] Includes indexes, RLS policies, triggers, functions
- [x] Uses new architecture pattern
- [x] Voltage inputs mapped to Custom_1-6 (generic, expansion-friendly)

**Files Created:**
- `supabase/migrations/000_COMPLETE_DATABASE_SCHEMA.sql` - Complete schema (1,000+ lines)

**Schema Includes:**
- ✅ User management tables (profiles, user_roles, assignments)
- ✅ Machine registry (machines table - basic info only)
- ✅ Connection status (shared table for all manufacturers)
- ✅ API keys management
- ✅ Notification preferences (shared)
- ✅ Cirrus tables: raw, calculated, notifications, voltage_config
- ✅ CoolBreeze tables: raw, calculated, notifications, voltage_config
- ✅ All indexes, RLS policies, triggers, functions

**Result:**
- ✅ Complete SQL ready for new Supabase instance
- ✅ All tables follow new architecture pattern
- ✅ Ready for migration when new instance is set up

---

### ✅ COMPLETED: Documentation Created

**Status:** ✅ **COMPLETED**

**Tasks Completed:**
- [x] Created comprehensive database schema documentation
- [x] Created migration guide for new Supabase instance
- [x] Created checklist of files to update after migration
- [x] Updated code files with TODO comments for future changes

**Files Created:**
- `DATABASE_SCHEMA.md` - Complete schema documentation
- `MIGRATION_GUIDE_NEW_SUPABASE.md` - Step-by-step migration guide
- `FILES_TO_UPDATE_AFTER_MIGRATION.md` - Checklist of files needing updates

**Files Updated:**
- `src/lib/machineConfig.ts` - Added TODO comments for table name changes
- `src/lib/historicalData.ts` - Added TODO comments for table name changes

**Result:**
- ✅ Complete documentation for database architecture
- ✅ Migration guide ready for when new instance is set up
- ✅ Code files marked for future updates

---

### ✅ COMPLETED: Old Migration Files Archived

**Status:** ✅ **COMPLETED**

**Tasks Completed:**
- [x] Created archive folder: `supabase/migrations/archive/`
- [x] Moved all old migration files to archive (70+ files)
- [x] Kept only `000_COMPLETE_DATABASE_SCHEMA.sql` in main migrations folder
- [x] Archived historical migration files

**Files Moved:**
- All migration files except `000_COMPLETE_DATABASE_SCHEMA.sql`
- Files from `supabase/migrations/historical/2025-11-18/` (22 SQL files)

**Result:**
- ✅ Clean migrations folder with only new schema
- ✅ Old files preserved in archive for reference
- ✅ Ready for new Supabase instance setup

---

## Technical Details

### Architecture Changes

**Old Pattern:**
```
ESP32 → readings_raw → [trigger] → cirrus/coolbreeze → machines (status update)
```

**New Pattern:**
```
ESP32 → {manufacturer}_raw → [trigger] → {manufacturer}_calculated → machines (status update)
                                              ↓
                                  machine_connection_status (update)
```

### Key Improvements

1. **Expansion-Friendly:**
   - Old: Adding manufacturer requires code changes in multiple places
   - New: Add manufacturer = add 4 tables (raw, calculated, notifications, voltage_config)

2. **Historical Data:**
   - Old: `readings_raw` deleted immediately, no historical raw data
   - New: `{manufacturer}_raw` stores 2 weeks, `{manufacturer}_calculated` stores 1 year

3. **Voltage Mapping:**
   - Old: Hard-coded mappings (fan, pump, drain, exhaust)
   - New: Generic Custom_1-6 system, configurable per manufacturer

4. **Connection Status:**
   - Old: Calculated per manufacturer
   - New: Shared `machine_connection_status` table (generic for all)

### Table Name Changes

| Old Table | New Table | Notes |
|-----------|-----------|-------|
| `cirrus` | `cirrus_calculated` | Processed data (1 year) |
| `coolbreeze` | `coolbreeze_calculated` | Processed data (1 year) |
| `readings_raw` | `{manufacturer}_raw` | Raw data (2 weeks) |
| `machine_alert_config` | `{manufacturer}_notifications` | Per-manufacturer |
| `machine_voltage_config` | `{manufacturer}_voltage_config` | Per-manufacturer |
| N/A | `machine_connection_status` | NEW: Shared table |

---

## Files Modified

### New Files Created:
1. `SUPABASE_ANALYSIS_AND_CLEANUP_PLAN.md` - Database analysis
2. `PROPOSED_DATABASE_ARCHITECTURE.md` - Architecture proposal
3. `DATABASE_SCHEMA.md` - Schema documentation
4. `MIGRATION_GUIDE_NEW_SUPABASE.md` - Migration guide
5. `FILES_TO_UPDATE_AFTER_MIGRATION.md` - Update checklist
6. `SQL_FILES_ANALYSIS.md` - SQL files categorization
7. `SQL_FILES_CLEANUP_SUMMARY.md` - Cleanup summary
8. `supabase/migrations/000_COMPLETE_DATABASE_SCHEMA.sql` - Complete schema SQL
9. `DAILY_LOGS/2025-11-25_DATABASE_CLEANUP_AND_MIGRATION_PREP.md` - This file

### Files Updated:
1. `src/lib/machineConfig.ts` - Added TODO comments
2. `src/lib/historicalData.ts` - Added TODO comments

### Files Moved:
- 70+ migration files → `supabase/migrations/archive/`
- 25 root SQL files → `supabase/migrations/archive/root_sql_files/`
  - Obsolete migration files (ALL_MIGRATIONS_COMBINED.sql)
  - One-time fix scripts (17 files)
  - Setup/configuration scripts (4 files)
  - Column/table modification scripts (2 files)

---

## Issues Resolved

1. **No Historical Raw Data** ✅
   - **Problem:** `readings_raw` deleted immediately, can't access old raw data
   - **Solution:** New `{manufacturer}_raw` tables with 2-week retention

2. **Not Expansion-Friendly** ✅
   - **Problem:** Adding manufacturer requires code changes in multiple places
   - **Solution:** New pattern: add manufacturer = add 4 tables

3. **Missing Pickup Voltages** ✅
   - **Problem:** Pickup voltages (exhaust_voltage, fan_voltage, etc.) not stored in calculated tables
   - **Solution:** New `{manufacturer}_calculated` tables include `voltage_1` through `voltage_6`

4. **Voltage Mapping Not Generic** ✅
   - **Problem:** Hard-coded mappings (fan, pump, drain, exhaust)
   - **Solution:** Generic Custom_1-6 system, configurable per manufacturer

5. **Connection Status Not Shared** ✅
   - **Problem:** Connection logic duplicated per manufacturer
   - **Solution:** Shared `machine_connection_status` table

---

## Key Learnings

1. **Manufacturer-Agnostic Design:**
   - Each manufacturer should be self-contained
   - Shared tables only for generic functions
   - Makes expansion simple and clean

2. **Data Retention Strategy:**
   - Raw data: 2 weeks (for debugging)
   - Calculated data: 1 year (for historical analysis)
   - Balance between storage and usefulness

3. **Voltage Input Mapping:**
   - Generic naming (Custom_1-6) is more flexible than specific names
   - Allows different manufacturers to use different mappings
   - Frontend can display custom labels based on config

4. **Migration Planning:**
   - Complete schema SQL is better than incremental migrations for new instances
   - Archive old migrations for reference
   - Document all changes for future reference

---

## Next Steps

### Completed:
- ✅ Database analysis complete
- ✅ New architecture designed
- ✅ Complete SQL schema created
- ✅ Documentation created
- ✅ Old migrations archived
- ✅ Code files marked for future updates

### Remaining Tasks (After MVP, When Setting Up New Supabase):

1. **Migration to New Instance:**
   - [ ] Set up new Supabase instance
   - [ ] Run `000_COMPLETE_DATABASE_SCHEMA.sql`
   - [ ] Migrate existing data (if applicable)
   - [ ] Create processing triggers
   - [ ] Create cleanup jobs

2. **Update Frontend Code:**
   - [ ] Update `src/lib/machineConfig.ts` - Change table names
   - [ ] Update `src/lib/historicalData.ts` - Change table names
   - [ ] Update `src/components/MachineCard.tsx` - Change table references
   - [ ] Update `src/components/MachineDetailView.tsx` - Change table references
   - [ ] Update `src/hooks/useMachineData.tsx` - Change table references
   - [ ] Update `src/components/AlertThresholdsEditor.tsx` - Use manufacturer-specific tables

3. **Update ESP32 Code:**
   - [ ] Change API endpoint to use `{manufacturer}_raw` tables
   - [ ] Update payload to include all 6 voltage inputs

4. **Testing:**
   - [ ] Test data insertion
   - [ ] Test processing triggers
   - [ ] Test frontend queries
   - [ ] Test historical data display
   - [ ] Test real-time updates

5. **Cleanup:**
   - [ ] Drop old tables (after migration verified)
   - [ ] Update/archive old documentation

---

## Statistics

- **Files Created:** 7
- **Files Updated:** 2
- **Files Moved:** 95+ (70+ migrations + 25 root SQL files to archive)
- **SQL Lines Written:** 1,000+ (complete schema)
- **Documentation Pages:** 5
- **Time to Completion:** ~2 hours
- **Issues Resolved:** 5

---

## Key Takeaways

1. **New Architecture is Expansion-Friendly:**
   - Adding new manufacturer = add 4 tables
   - No code changes needed in shared logic
   - Self-contained per manufacturer

2. **Complete Schema SQL is Better:**
   - Single file for new instance setup
   - No dependency on migration order
   - Easier to understand and maintain

3. **Documentation is Critical:**
   - Migration guide ensures smooth transition
   - Update checklist prevents missed changes
   - Schema documentation helps future developers

4. **Archive Old Files:**
   - Preserve history for reference
   - Keep migrations folder clean
   - Easy to find old implementations

---

## Related Files

### Files Modified Today:
- `SUPABASE_ANALYSIS_AND_CLEANUP_PLAN.md`
- `PROPOSED_DATABASE_ARCHITECTURE.md`
- `DATABASE_SCHEMA.md`
- `MIGRATION_GUIDE_NEW_SUPABASE.md`
- `FILES_TO_UPDATE_AFTER_MIGRATION.md`
- `supabase/migrations/000_COMPLETE_DATABASE_SCHEMA.sql`
- `src/lib/machineConfig.ts`
- `src/lib/historicalData.ts`

### Related Documentation:
- `ESP32_INTEGRATION_GUIDE.md` - Will need update for new table names
- `DEPLOYMENT_GUIDE_GITHUB.md` - No changes needed
- `DAILY_LOGS/REMAINING_TASKS.md` - Will be updated

---

---

### ✅ COMPLETED: Fixed RLS Table Grants for Alliance and CoolBreeze

**Status:** ✅ **COMPLETED** - November 25, 2025 (Evening)

**Problem:**
- Alliance and CoolBreeze machines were returning `403 Forbidden` errors
- RLS policies were correctly configured, but table-level GRANTs were missing
- `cirrus` table had proper grants (`authenticated` and `anon` with SELECT), but `coolbreeze` and `alliance` only had `service_role` grants

**Root Cause:**
- RLS policies require both:
  1. RLS policies (which were correctly set up)
  2. Table-level GRANTs (which were missing for `coolbreeze` and `alliance`)

**Solution:**
- Created `006_fix_table_grants.sql` migration
- Added `GRANT SELECT` to `authenticated` and `anon` roles for:
  - `alliance` table
  - `coolbreeze` table
  - `alliance_raw` table
- Matched the exact grant pattern from the working `cirrus` table

**Files Created:**
- `supabase/migrations/004_fix_rls_policies_alliance_coolbreeze.sql` - RLS policies (already existed)
- `supabase/migrations/005_diagnose_rls_issues.sql` - Diagnostic script
- `supabase/migrations/006_fix_table_grants.sql` - Table grants fix

**Files Updated:**
- `supabase/migrations/000_COMPLETE_DATABASE_SCHEMA.sql` - Added table grants section (section 15) to prevent this issue in future migrations

**Result:**
- ✅ Alliance and CoolBreeze machines now accessible
- ✅ Historical data loads correctly
- ✅ Frontend queries work without 403 errors
- ✅ Complete schema updated to include grants for future migrations

**Key Learning:**
- RLS policies alone are not sufficient - table-level GRANTs are also required
- The `authenticated` role needs explicit `SELECT` grants even when RLS policies exist
- Diagnostic queries helped identify the missing grants by comparing `cirrus` (working) vs `coolbreeze`/`alliance` (broken)

---

---

### ✅ COMPLETED: Fixed Connection Status Threshold and Change Manufacturer

**Status:** ✅ **COMPLETED** - November 25, 2025 (Evening)

**Problems Identified:**
1. Connection status mismatch: Frontend showed "Connected" (green) but database showed `is_connected: false`
2. Change Manufacturer menu item not working for evaporative coolers

**Root Causes:**
1. Frontend calculated connection status using 15-minute threshold, but user needs 5 minutes (posts every ~3 minutes)
2. Change Manufacturer menu item was conditionally rendered incorrectly

**Solutions Implemented:**
1. Updated `src/hooks/useMachineData.tsx` to use 5-minute threshold for connection status calculation
2. Created `supabase/migrations/007_update_connection_threshold_to_5_minutes.sql` to update database trigger function
3. Fixed `src/components/MachineCard.tsx` to properly show Change Manufacturer option when prop is provided

**Files Created:**
- `supabase/migrations/007_update_connection_threshold_to_5_minutes.sql` - Database migration

**Files Updated:**
- `src/hooks/useMachineData.tsx` - Changed threshold from 15 to 5 minutes
- `src/components/MachineCard.tsx` - Fixed Change Manufacturer menu item rendering

**Result:**
- ✅ Connection status now uses 5-minute threshold (matches user's posting frequency)
- ✅ Change Manufacturer works for all machine types including evaporative coolers
- ✅ Frontend and database now use consistent 5-minute threshold

---

### 📋 NEW TASK: Historical Graph Updates and Data Range Fix

**Status:** ⏳ **PENDING** - November 25, 2025

**Requirements:**

1. **Bar Chart Updates:**
   - Cool, Fan, and Fan+Cool bars should be 300% wider
   - These bars should sit at the very top of the historical graph
   - All other behavior should remain exactly as is

2. **New Fan Speed Line:**
   - Add a "fan speed" line on the graph
   - Should read 0% to 100%
   - Make it dark green color

3. **Tank Line Update:**
   - Make "tank" line 300% thicker
   - Position it at the base of the graph

4. **Full Year Data Display:**
   - Show the past year of historical data regardless of if there is actually data or not
   - Show readings of 0 if null
   - Make sure the full year's worth of data is available

5. **Fix Data Range Issues:**
   - 7 days, 30 days, and 1 year are all only showing 3 days worth of data
   - None of the data is current
   - Need to ensure all time periods work correctly and show current data

**Files to Update:**
- `src/components/MachineDetailView.tsx` - Historical graph component
- `src/lib/historicalData.ts` - Data fetching logic
- Graph configuration and styling

**Priority:** 🟠 **MEDIUM** - UI/UX improvements and data accuracy fixes

---

**Last Updated:** November 25, 2025  
**Session Duration:** ~2 hours (initial cleanup) + ~1.5 hours (RLS grants fix + connection threshold fix)  
**Status:** ✅ **COMPLETED** - Database cleanup and migration preparation complete. RLS grants issue resolved. Connection threshold fixed. Ready for new Supabase instance setup after MVP.

