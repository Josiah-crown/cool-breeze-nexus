# Migration Analysis & Recommendations

## 🚀 Migration Timing: VPS Setup vs. Current Work

### Recommendation: **Continue with migrations now, migrate to VPS later**

**Why:**
- ✅ Supabase migrations are **database-agnostic** - they work the same on hosted or self-hosted
- ✅ Migration to VPS is **straightforward** - just export/import database dump
- ✅ Running migrations now **won't create extra work** - they'll transfer cleanly
- ✅ You'll have a **fully functional system** before migration, making testing easier

**Migration Process (when ready):**
1. Export database from Supabase (pg_dump)
2. Export storage buckets (if any)
3. Set up VPS with Supabase
4. Import database dump
5. Update environment variables in GitHub Secrets
6. Done!

**Conclusion:** Continue with migrations now. The VPS migration is simple enough to do later.

---

## 📋 Migration File Analysis

### 1. `20250108000000_create_cirrus_table.sql`

**What it does:**
- Creates the `cirrus` table for **processed/historical data** for Cirrus evaporative coolers
- Stores calculated status, temperatures, operational states
- **Different from `readings_raw`** - this is the processed/cleaned data

**Should you run it?**
- ✅ **YES** - If you don't have a `cirrus` table yet
- ❌ **NO** - If the table already exists (check first)

**How to check:**
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'cirrus'
);
```

**Note:** `readings_raw` = raw sensor data, `cirrus` = processed/calculated data for charts

---

### 2. `20250108000001_create_cirrus_processor.sql` ⚠️ **CRITICAL**

**What it does:**
- Creates **trigger function** that automatically processes `readings_raw` → `cirrus`
- When ESP32 sends data to `readings_raw`, this **automatically**:
  - Calculates status (operational/warning/error)
  - Processes temperatures
  - Maps voltage inputs to functions (fan/pump/drain/exhaust)
  - Inserts into `cirrus` table
  - Deletes from `readings_raw` (after processing)

**Should you run it?**
- ✅ **YES - CRITICAL** - This is what makes your data pipeline work!
- Without this, data goes into `readings_raw` but never gets processed into `cirrus`
- This is **NOT improving** the table - it's creating the **processing engine**

**Impact:**
- Enables automatic data processing
- Makes historical data available for charts
- Required for the system to work correctly

---

### 3. `20250108000005_setup_cirrus_cleanup_schedule.sql`

**What it does:**
- Creates a **cleanup function** to delete old `cirrus` data (older than 1 year)
- Does **NOT** touch `readings_raw` table
- Creates function `auto_cleanup_cirrus_data()` that can be called manually or scheduled

**Should you run it?**
- ✅ **YES** - Safe to run, just creates a cleanup function
- This does **NOT** give you a fresh `readings_raw` table
- It only cleans up old `cirrus` data (processed data)

**Note:** If you want to clean `readings_raw`, you'd need to do that separately:
```sql
-- Manual cleanup of readings_raw (if needed)
DELETE FROM readings_raw WHERE created_at < NOW() - INTERVAL '30 days';
```

---

### 4. `20250108000007_create_machine_voltage_config.sql`

**What it does:**
- Creates `machine_voltage_config` table
- Maps which voltage input (1-4) corresponds to which function per machine
- Allows different machines to have different GPIO mappings
- Auto-creates default config for new machines

**Should you run it?**
- ⚠️ **CHECK FIRST** - If table already exists, this will:
  - Add missing columns if any
  - Create default configs for machines that don't have one
  - **Safe to run** - uses `IF NOT EXISTS` and `ON CONFLICT DO NOTHING`

**How to check:**
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'machine_voltage_config'
);
```

**Recommendation:** Run it - it's safe and will backfill missing configs

---

### 5. `20250108000008_add_connection_status_calculation.sql`

**What it does:**
- Creates **functions and views** for calculating connection status
- Does **NOT** create a table - creates:
  - `calculate_machine_connection_status()` function
  - `update_all_machine_connection_status()` function  
  - `machine_connection_status` view

**Should you run it?**
- ✅ **YES** - Safe to run
- These are **helper functions/views**, not tables
- Won't conflict with existing connection status logic
- Provides additional ways to calculate connection status

**Note:** Your existing connection status might use different logic - this adds more options

---

### 6. `20250108000009_add_temperature_validation.sql`

**What it does:**
- Creates a **function** (not a table) called `validate_temperature_reading()`
- Validates temperature readings to reject DS18B20 error codes (-127°C, -999°C)
- **Note:** The processor function already includes this validation, but this makes it reusable

**Should you run it?**
- ✅ **YES** - Safe to run, just creates a utility function
- Won't conflict with anything
- Useful for future validation needs

---

### 7. `20250108000010_add_sensor_read_count.sql`

**What it does:**
- Adds `sensor_read_count` **column** to `readings_raw` table (not a new table)
- Tracks how many sensor readings were averaged before sending
- Updates existing rows to have default value of 1

**Should you run it?**
- ✅ **YES** - Safe to run
- Just adds a column to existing table
- Won't delete any data
- Updates existing rows with default value

---

### 8. `20250108000004_add_cirrus_cleanup.sql`

**What it does:**
- Creates `cleanup_old_cirrus_data()` function
- Creates `cirrus_data_retention_info` view
- Deletes `cirrus` records older than 1 year
- **Does NOT** clean `readings_raw` - only cleans processed `cirrus` data

**Should you run it?**
- ✅ **YES** - Safe to run
- Just creates cleanup function and view
- Doesn't delete anything automatically - you call the function when needed
- Helps manage data retention

**Note:** This is similar to migration 5, but provides a different interface

---

### 9. `20250108000005_setup_cirrus_cleanup_schedule.sql`

**What it does:**
- Creates `auto_cleanup_cirrus_data()` function
- Similar to migration 4, but with different function name
- Returns JSON with deletion count
- Can be called manually or scheduled

**Should you run it?**
- ✅ **YES** - Safe to run
- Creates another cleanup function (different from migration 4)
- Both can coexist - they do the same thing with different interfaces

**Note:** You have two cleanup functions now - both do the same thing, just different names

---

## 🎯 Recommended Migration Order

### **Phase 1: Critical (Run These First)**
1. ✅ `20250108000000_create_cirrus_table.sql` - **IF table doesn't exist**
2. ✅ `20250108000001_create_cirrus_processor.sql` - **CRITICAL - Run this!**
3. ✅ `20250108000007_create_machine_voltage_config.sql` - **Safe, run it**

### **Phase 2: Enhancements (Run These Next)**
4. ✅ `20250108000006_create_clean_readings_raw.sql` - Adds missing columns
5. ✅ `20250108000010_add_sensor_read_count.sql` - Adds column
6. ✅ `20250108000008_add_connection_status_calculation.sql` - Adds functions/views
7. ✅ `20250108000009_add_temperature_validation.sql` - Adds function

### **Phase 3: Cleanup (Optional, Run When Needed)**
8. ✅ `20250108000004_add_cirrus_cleanup.sql` - Cleanup function
9. ✅ `20250108000005_setup_cirrus_cleanup_schedule.sql` - Another cleanup function
10. ✅ `20250108000002_optimize_edge_function_rate_limit.sql` - Rate limiting

---

## ⚠️ Important Notes

### About `readings_raw` Table:
- **Migration 6** (`create_clean_readings_raw.sql`) does **NOT** delete old data
- It only adds missing columns if they don't exist
- If you want to clean old data, do it manually:
  ```sql
  -- Example: Delete data older than 30 days
  DELETE FROM readings_raw WHERE created_at < NOW() - INTERVAL '30 days';
  ```

### About Data Flow:
1. ESP32 → `readings_raw` (raw sensor data)
2. Trigger → `process_cirrus_reading()` function (Migration 2)
3. Function → Processes and inserts into `cirrus` (processed data)
4. Function → Deletes from `readings_raw` (after processing)
5. Website → Reads from `cirrus` for charts/history

### About Tables vs Functions:
- **Tables:** `cirrus`, `machine_voltage_config`, `readings_raw`
- **Functions:** `process_cirrus_reading()`, `calculate_cirrus_status()`, cleanup functions
- **Views:** `machine_connection_status`, `cirrus_data_retention_info`

---

## ✅ Quick Checklist

Before running migrations:
- [ ] Check if `cirrus` table exists
- [ ] Check if `machine_voltage_config` table exists
- [ ] Backup database (just in case)
- [ ] Run migrations in order (they're numbered)
- [ ] Test that data flows: ESP32 → readings_raw → cirrus

After running migrations:
- [ ] Verify `cirrus` table has data
- [ ] Verify triggers are working
- [ ] Test connection status
- [ ] Check that old `readings_raw` data gets processed (if any)

---

**Last Updated:** November 20, 2025  
**Status:** Ready for migration execution

