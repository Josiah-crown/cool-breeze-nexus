# ✅ Cirrus Setup - Your Next Steps

## Current Status

- [x] **Migration 1:** CIRRUS table created
- [ ] **Manual:** Delete `water_level` column ⚠️ DO THIS FIRST

---

## ⚠️ Column Check

### **Delete This Column:**
- ❌ `water_level` (NUMERIC) - We can't read actual level, only FULL/EMPTY

### **Keep This Column:**
- ✅ `has_water` (BOOLEAN) - This is correct (true = full, false = empty)

**No other columns need to be deleted or added.**

---

## 📋 Order of Operations

### **STEP 1: Delete water_level Column** (Manual)

```sql
ALTER TABLE public.cirrus DROP COLUMN IF EXISTS water_level;
```

**Verify:**
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'cirrus' AND column_name = 'water_level';
-- Should return 0 rows
```

---

### **STEP 2: Run Remaining Migrations** (In Order)

1. **`20250108000001_create_cirrus_processor.sql`** ⚠️ CRITICAL
   - Creates trigger that processes data
   - **MUST run after deleting `water_level`!**

2. **`20250108000002_optimize_edge_function_rate_limit.sql`**
   - Rate limiting setup

3. **`20250108000003_add_manufacturer_column.sql`** (Recommended)
   - Needed for subcategory selection

4. **`20250108000006_create_clean_readings_raw.sql`** ⚠️ Check First
   - Check if `readings_raw` exists and its structure

5. **`20250108000007_create_machine_voltage_config.sql`**
   - Voltage input configuration

6. **`20250108000008_add_connection_status_calculation.sql`**
   - Connection status function

7. **`20250108000009_add_temperature_validation.sql`**
   - Temperature validation function

8. **`20250108000010_add_sensor_read_count.sql`** ⚠️ Check First
   - Check if `sensor_read_count` column exists

9. **`20250108000004_add_cirrus_cleanup.sql`**
   - Cleanup functions

10. **`20250108000005_setup_cirrus_cleanup_schedule.sql`**
    - Automated cleanup

---

## ✅ Setup Guide Verification

**The `CIRRUS_SETUP_GUIDE.md` has been updated and is correct!**

**Key Updates:**
- ✅ Notes that Migration 1 is already completed
- ✅ Warns about deleting `water_level` column first
- ✅ Lists all 11 remaining migrations in correct order
- ✅ Includes check steps for `readings_raw` and `sensor_read_count`
- ✅ Updated with all new migrations

**You can follow the guide from Step 2 onwards!**

---

## 🔍 Pre-Flight Checks

Before running migrations, check:

```sql
-- 1. Verify water_level is deleted
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'cirrus' AND column_name = 'water_level';
-- Should return 0 rows

-- 2. Check readings_raw structure (if exists)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'readings_raw'
ORDER BY ordinal_position;

-- 3. Check sensor_read_count (if readings_raw exists)
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'readings_raw' 
AND column_name = 'sensor_read_count';
```

---

## 📝 Quick Reference

**Files Created:**
- `CIRRUS_SETUP_ORDER_OF_OPERATIONS.md` - Detailed order of operations
- `CIRRUS_SETUP_CHECKLIST.md` - Complete checklist
- `CIRRUS_QUICK_START.md` - Quick reference
- `CIRRUS_COLUMN_CHECK.md` - Column verification

**Main Guide:**
- `CIRRUS_SETUP_GUIDE.md` - Complete setup guide (updated and verified)

---

## 🚀 Ready to Continue!

1. Delete `water_level` column manually
2. Follow `CIRRUS_SETUP_GUIDE.md` from Step 2
3. Run migrations in order
4. Deploy edge function
5. Test with ESP32

**Everything is ready! The setup guide is correct and up-to-date.**

