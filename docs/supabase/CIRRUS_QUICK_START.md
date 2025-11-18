# 🚀 Cirrus Setup - Quick Start Guide

## ✅ Current Status

- [x] **CIRRUS table created** (`20250108000000_create_cirrus_table.sql`)
- [ ] **Delete `water_level` column manually** ⚠️ DO THIS FIRST!

---

## ⚠️ CRITICAL: Delete water_level Column

**Before running any other migrations, delete the `water_level` column:**

```sql
ALTER TABLE public.cirrus DROP COLUMN IF EXISTS water_level;
```

**Verify it's gone:**
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'cirrus' AND column_name = 'water_level';
-- Should return 0 rows
```

---

## 📋 Migration Order (Run These Next)

### **1. Processor Function** ⚠️ CRITICAL
**File:** `20250108000001_create_cirrus_processor.sql`
- **MUST run after deleting `water_level` column!**
- Creates trigger that processes `readings_raw` → `cirrus`

### **2. Rate Limiting**
**File:** `20250108000002_optimize_edge_function_rate_limit.sql`

### **3. Manufacturer Column** (Recommended)
**File:** `20250108000003_add_manufacturer_column.sql`

### **4. Clean readings_raw** ⚠️ Check First
**File:** `20250108000006_create_clean_readings_raw.sql`
- Check if `readings_raw` table exists first
- Check its structure

### **5. Voltage Config**
**File:** `20250108000007_create_machine_voltage_config.sql`

### **6. Connection Status**
**File:** `20250108000008_add_connection_status_calculation.sql`

### **7. Temperature Validation**
**File:** `20250108000009_add_temperature_validation.sql`

### **8. Sensor Read Count** ⚠️ Check First
**File:** `20250108000010_add_sensor_read_count.sql`
- Check if column exists first

### **9. Cleanup Functions**
**File:** `20250108000004_add_cirrus_cleanup.sql`

### **10. Cleanup Schedule**
**File:** `20250108000005_setup_cirrus_cleanup_schedule.sql`

---

## 🔍 Pre-Flight Checks

Run these SQL queries before starting:

```sql
-- 1. Verify water_level is deleted
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'cirrus' AND column_name = 'water_level';
-- Should return 0 rows

-- 2. Check readings_raw exists and structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'readings_raw'
ORDER BY ordinal_position;

-- 3. Check sensor_read_count exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'readings_raw' 
AND column_name = 'sensor_read_count';
```

---

## ✅ Verification After Migration 2

After running the processor migration, verify:

```sql
-- Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('calculate_cirrus_status', 'process_cirrus_reading');

-- Check trigger exists
SELECT trigger_name, event_manipulation 
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name = 'trigger_process_cirrus_reading';
```

---

## 📝 Summary

**What to do now:**
1. ✅ Delete `water_level` column manually
2. ⚠️ Run Migration 2 (processor) - **CRITICAL!**
3. Run remaining migrations in order
4. Deploy edge function
5. Test with ESP32

**See `CIRRUS_SETUP_ORDER_OF_OPERATIONS.md` for detailed steps.**

