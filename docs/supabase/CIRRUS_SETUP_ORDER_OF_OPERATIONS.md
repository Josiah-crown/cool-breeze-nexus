# 📋 Cirrus Setup - Order of Operations

## ✅ Already Completed

- [x] **Migration 1:** `20250108000000_create_cirrus_table.sql` - CIRRUS table created
- [ ] **Manual:** Delete `water_level` column from `cirrus` table (you'll do this manually)

---

## 🔄 Next Steps (In Order)

### **STEP 1: Manual Column Cleanup** ⚠️

**Delete `water_level` column:**
```sql
ALTER TABLE public.cirrus DROP COLUMN IF EXISTS water_level;
```

**Verify:**
- Check that `water_level` column is gone
- Confirm `has_water` column exists (boolean)

---

### **STEP 2: Run Remaining Migrations** (In Order)

#### **Migration 2: Create Processor Function** ⚠️ CRITICAL
**File:** `20250108000001_create_cirrus_processor.sql`

**What it does:**
- Creates `calculate_cirrus_status()` function
- Creates `process_cirrus_reading()` trigger function
- Automatically processes `readings_raw` → `cirrus`
- **IMPORTANT:** This trigger will fail if `water_level` column still exists!

**Run this AFTER deleting `water_level` column.**

---

#### **Migration 3: Rate Limiting**
**File:** `20250108000002_optimize_edge_function_rate_limit.sql`

**What it does:**
- Creates `edge_function_rate_limit` table
- Creates `check_rate_limit()` RPC function
- Prevents duplicate calls within 2 minutes

---

#### **Migration 4: Manufacturer Column** (Recommended)
**File:** `20250108000003_add_manufacturer_column.sql`

**What it does:**
- Adds `manufacturer` column to `machines` table
- Allows filtering by manufacturer (e.g., 'Cirrus')

**Why recommended:**
- Needed for subcategory selection on website
- Allows multiple evaporative cooler types

---

#### **Migration 5: Clean readings_raw Table** ⚠️ IMPORTANT
**File:** `20250108000006_create_clean_readings_raw.sql`

**What it does:**
- Creates/updates `readings_raw` table with correct structure
- **WARNING:** If `readings_raw` already exists, this uses `CREATE TABLE IF NOT EXISTS`
- May need to manually update existing table if structure differs

**Check first:**
```sql
-- Check if readings_raw exists and its structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'readings_raw';
```

**If table exists with wrong structure:**
- You may need to manually alter columns
- Or drop and recreate (backup data first!)

---

#### **Migration 6: Machine Voltage Config**
**File:** `20250108000007_create_machine_voltage_config.sql`

**What it does:**
- Creates `machine_voltage_config` table
- Allows configuring which voltage input maps to which function (fan, pump, etc.)
- Auto-creates default config for new machines

---

#### **Migration 7: Connection Status Calculation**
**File:** `20250108000008_add_connection_status_calculation.sql`

**What it does:**
- Creates `get_machine_connection_status()` function
- Calculates if machine is connected (last reading within 10 min)

---

#### **Migration 8: Temperature Validation**
**File:** `20250108000009_add_temperature_validation.sql`

**What it does:**
- Creates `validate_temperature_reading()` function
- Validates temperature readings (rejects -127°C, -999°C, out-of-range)

---

#### **Migration 9: Sensor Read Count**
**File:** `20250108000010_add_sensor_read_count.sql`

**What it does:**
- Adds `sensor_read_count` column to `readings_raw`
- Tracks number of readings averaged before sending

**Check first:**
```sql
-- Check if column already exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'readings_raw' AND column_name = 'sensor_read_count';
```

---

#### **Migration 10: Data Cleanup Functions**
**File:** `20250108000004_add_cirrus_cleanup.sql`

**What it does:**
- Creates `cleanup_old_cirrus_data()` function
- Creates `auto_cleanup_cirrus_data()` function
- Deletes data older than 1 year

---

#### **Migration 11: Automated Cleanup Schedule**
**File:** `20250108000005_setup_cirrus_cleanup_schedule.sql`

**What it does:**
- Sets up automated daily cleanup (optional)
- Can also be called manually

---

### **STEP 3: Update Edge Function**

**File:** `supabase/functions/esp32-data-receiver/index.ts`

**Already updated:**
- ✅ Handles both Cirrus and CoolBreeze field formats
- ✅ Maps voltage inputs correctly
- ✅ Includes `sensor_read_count`
- ✅ Only inserts raw data

**Deploy:**
```bash
supabase functions deploy esp32-data-receiver
```

---

### **STEP 4: Verify Setup**

1. **Check tables exist:**
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('cirrus', 'readings_raw', 'machine_voltage_config', 'edge_function_rate_limit');
   ```

2. **Check functions exist:**
   ```sql
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_schema = 'public' 
   AND routine_name IN ('calculate_cirrus_status', 'process_cirrus_reading', 'check_rate_limit');
   ```

3. **Check triggers exist:**
   ```sql
   SELECT trigger_name FROM information_schema.triggers 
   WHERE trigger_schema = 'public' 
   AND trigger_name = 'trigger_process_cirrus_reading';
   ```

---

## ⚠️ Critical Order

**MUST DO IN THIS ORDER:**

1. ✅ Delete `water_level` column manually
2. ⚠️ **Run Migration 2** (processor) - **WILL FAIL if water_level still exists!**
3. Run Migration 3 (rate limiting)
4. Run Migration 4 (manufacturer column)
5. Run Migration 5 (readings_raw) - **Check structure first!**
6. Run Migration 6 (voltage config)
7. Run Migration 7 (connection status)
8. Run Migration 8 (temperature validation)
9. Run Migration 9 (sensor read count) - **Check if column exists first!**
10. Run Migration 10 (cleanup functions)
11. Run Migration 11 (cleanup schedule)

---

## 🔍 Pre-Flight Checks

Before running migrations, check:

1. **Does `readings_raw` table exist?**
   ```sql
   SELECT EXISTS (
     SELECT FROM information_schema.tables 
     WHERE table_schema = 'public' 
     AND table_name = 'readings_raw'
   );
   ```

2. **What columns does `readings_raw` have?**
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'readings_raw'
   ORDER BY ordinal_position;
   ```

3. **Does `sensor_read_count` column exist?**
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'readings_raw' 
   AND column_name = 'sensor_read_count';
   ```

---

## 📝 Quick Reference

**Files to run (in order):**
1. Manual: Delete `water_level` column
2. `20250108000001_create_cirrus_processor.sql` ⚠️
3. `20250108000002_optimize_edge_function_rate_limit.sql`
4. `20250108000003_add_manufacturer_column.sql`
5. `20250108000006_create_clean_readings_raw.sql` ⚠️ (check first)
6. `20250108000007_create_machine_voltage_config.sql`
7. `20250108000008_add_connection_status_calculation.sql`
8. `20250108000009_add_temperature_validation.sql`
9. `20250108000010_add_sensor_read_count.sql` ⚠️ (check first)
10. `20250108000004_add_cirrus_cleanup.sql`
11. `20250108000005_setup_cirrus_cleanup_schedule.sql`

---

## ✅ Verification After Each Step

After running each migration, verify:

1. **Migration 2 (Processor):**
   - Functions created: `calculate_cirrus_status`, `process_cirrus_reading`
   - Trigger created: `trigger_process_cirrus_reading`
   - No errors in Supabase logs

2. **Migration 3 (Rate Limiting):**
   - Table created: `edge_function_rate_limit`
   - Function created: `check_rate_limit`

3. **Migration 5 (readings_raw):**
   - Table structure matches expected columns
   - All required columns present

4. **Migration 6 (Voltage Config):**
   - Table created: `machine_voltage_config`
   - Default configs created for existing machines

---

## 🚨 Common Issues

### **Issue 1: Processor Migration Fails**
**Error:** Column `water_level` does not exist
**Solution:** You already deleted it manually - this is correct!

### **Issue 2: readings_raw Structure Mismatch**
**Error:** Column already exists or wrong type
**Solution:** Check existing structure, manually alter if needed

### **Issue 3: Trigger Not Firing**
**Error:** Data not processing into `cirrus` table
**Solution:** 
- Check trigger exists: `SELECT * FROM information_schema.triggers WHERE trigger_name = 'trigger_process_cirrus_reading';`
- Check machine type: `SELECT type, manufacturer FROM machines WHERE id = 'your-machine-id';`
- Check logs: Supabase Dashboard → Logs

---

## 📋 Summary

**Current Status:**
- ✅ CIRRUS table created
- ⏭️ Delete `water_level` column manually
- ⏭️ Run remaining migrations in order
- ⏭️ Deploy edge function
- ⏭️ Test with ESP32

**Next Action:**
1. Delete `water_level` column
2. Run Migration 2 (processor) - **CRITICAL!**

