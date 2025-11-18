# ✅ Cirrus Setup Checklist

## Current Status

- [x] **Migration 1:** CIRRUS table created (`20250108000000_create_cirrus_table.sql`)
- [ ] **Manual:** Delete `water_level` column from `cirrus` table
- [ ] **Migration 2:** Create processor function and trigger
- [ ] **Migration 3:** Rate limiting setup
- [ ] **Migration 4:** Manufacturer column
- [ ] **Migration 5:** Clean readings_raw table
- [ ] **Migration 6:** Machine voltage config
- [ ] **Migration 7:** Connection status calculation
- [ ] **Migration 8:** Temperature validation
- [ ] **Migration 9:** Sensor read count
- [ ] **Migration 10:** Data cleanup functions
- [ ] **Migration 11:** Automated cleanup schedule
- [ ] **Edge Function:** Deploy updated esp32-data-receiver
- [ ] **Testing:** Verify data flow end-to-end

---

## ⚠️ Critical: Column Check

**Before running Migration 2, verify:**

1. **Delete `water_level` column:**
   ```sql
   ALTER TABLE public.cirrus DROP COLUMN IF EXISTS water_level;
   ```

2. **Verify deletion:**
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'cirrus' AND column_name = 'water_level';
   -- Should return 0 rows
   ```

3. **Verify `has_water` exists:**
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'cirrus' AND column_name = 'has_water';
   -- Should return: has_water | boolean
   ```

---

## Migration Order

### **1. Delete water_level Column** (Manual)
```sql
ALTER TABLE public.cirrus DROP COLUMN IF EXISTS water_level;
```

### **2. Run Migration 2** ⚠️ CRITICAL
**File:** `20250108000001_create_cirrus_processor.sql`
- Creates processor function
- Creates trigger
- **Will fail if `water_level` column still exists!**

### **3. Run Migration 3**
**File:** `20250108000002_optimize_edge_function_rate_limit.sql`

### **4. Run Migration 4** (Recommended)
**File:** `20250108000003_add_manufacturer_column.sql`

### **5. Run Migration 5** ⚠️ Check First
**File:** `20250108000006_create_clean_readings_raw.sql`
- Check if `readings_raw` table exists
- Check its current structure
- May need manual updates if structure differs

### **6. Run Migration 6**
**File:** `20250108000007_create_machine_voltage_config.sql`

### **7. Run Migration 7**
**File:** `20250108000008_add_connection_status_calculation.sql`

### **8. Run Migration 8**
**File:** `20250108000009_add_temperature_validation.sql`

### **9. Run Migration 9** ⚠️ Check First
**File:** `20250108000010_add_sensor_read_count.sql`
- Check if `sensor_read_count` column already exists in `readings_raw`

### **10. Run Migration 10**
**File:** `20250108000004_add_cirrus_cleanup.sql`

### **11. Run Migration 11**
**File:** `20250108000005_setup_cirrus_cleanup_schedule.sql`

---

## Pre-Flight SQL Queries

Run these before starting:

```sql
-- 1. Check if readings_raw exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'readings_raw'
) AS readings_raw_exists;

-- 2. Check readings_raw structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'readings_raw'
ORDER BY ordinal_position;

-- 3. Check if sensor_read_count exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'readings_raw' 
AND column_name = 'sensor_read_count';

-- 4. Check cirrus table structure
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'cirrus'
ORDER BY ordinal_position;
```

---

## Verification After Migrations

### **After Migration 2:**
```sql
-- Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('calculate_cirrus_status', 'process_cirrus_reading');

-- Check trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name = 'trigger_process_cirrus_reading';
```

### **After Migration 3:**
```sql
-- Check rate limit table
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'edge_function_rate_limit';

-- Check function
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'check_rate_limit';
```

### **After Migration 5:**
```sql
-- Verify readings_raw structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'readings_raw'
ORDER BY ordinal_position;

-- Should have:
-- id, machine_id, created_at, motor_temp, inside_temp, outside_temp,
-- current, voltage, power, has_water, voltage_input_1, voltage_input_2,
-- voltage_input_3, voltage_input_4, sensor_read_count, api_key_used
```

---

## Expected Table Structures

### **cirrus table:**
- ✅ `has_water` (boolean) - **CORRECT**
- ❌ `water_level` (numeric) - **SHOULD BE DELETED**

### **readings_raw table:**
- ✅ `motor_temp`, `inside_temp`, `outside_temp`
- ✅ `current`, `voltage`, `power`
- ✅ `has_water` (boolean)
- ✅ `voltage_input_1`, `voltage_input_2`, `voltage_input_3`, `voltage_input_4`
- ✅ `sensor_read_count`
- ✅ `api_key_used`

---

## Next Steps After Migrations

1. **Deploy Edge Function:**
   ```bash
   supabase functions deploy esp32-data-receiver
   ```

2. **Test with ESP32:**
   - Upload `ESP32_Cirrus_Optimized_2Min.ino`
   - Monitor serial output
   - Check `readings_raw` table (should see entries briefly)
   - Check `cirrus` table (should see processed data)
   - Verify `readings_raw` entries are deleted after processing

3. **Verify Website:**
   - Check Connected LED uses `isConnected`
   - Check Fan LED checks `fan_active` in last 10 min
   - Check Cooling LED checks `is_cooling` (pump_active) in last 10 min
   - Check Motor Status LED shows red for warning/critical

---

## Troubleshooting

### **Migration 2 Fails:**
- Error: "column water_level does not exist"
- **Solution:** This is expected! The migration was updated to not use `water_level`. If you see this error, the migration file may need updating.

### **Trigger Not Processing:**
- Check machine type: `SELECT type, manufacturer FROM machines WHERE id = '...';`
- Should be `type='evaporative'` OR `manufacturer='Cirrus'`
- Check trigger exists and is enabled
- Check Supabase logs for errors

### **Data Not Appearing in cirrus:**
- Verify trigger is attached: `SELECT * FROM information_schema.triggers WHERE trigger_name = 'trigger_process_cirrus_reading';`
- Check if data is being rejected (temperature validation)
- Check Supabase logs for trigger errors

