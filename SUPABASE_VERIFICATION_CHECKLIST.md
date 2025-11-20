# Supabase Setup Verification Checklist

## ✅ Tables Verified (From Screenshot)
- [x] `cirrus` - Processed data table
- [x] `machine_voltage_config` - Voltage input mapping
- [x] `readings_raw` - Raw sensor data
- [x] `machines` - Machine definitions
- [x] `coolbreeze` - CoolBreeze processed data
- [x] `edge_function_rate_limit` - Rate limiting
- [x] `machine_connection_status` - Connection status view
- [x] `cirrus_data_retention_info` - Data retention view

## 🔍 Additional Verification Needed

### 1. **Functions & Triggers** (Critical)

**Check in Supabase Dashboard:**
- Go to **Database** → **Functions** (or **SQL Editor** → run query below)

**Required Functions:**
- [ ] `process_cirrus_reading()` - Main processor function
- [ ] `calculate_cirrus_status()` - Status calculation
- [ ] `calculate_machine_connection_status()` - Connection status
- [ ] `validate_temperature_reading()` - Temperature validation
- [ ] `cleanup_old_cirrus_data()` - Cleanup function
- [ ] `auto_cleanup_cirrus_data()` - Alternative cleanup
- [ ] `check_rate_limit()` - Rate limiting

**Required Triggers:**
- [ ] `trigger_process_cirrus_reading` on `readings_raw` table
- [ ] `trigger_create_default_voltage_config` on `machines` table

**SQL to Check Functions:**
```sql
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'process_cirrus_reading',
  'calculate_cirrus_status',
  'calculate_machine_connection_status',
  'validate_temperature_reading',
  'cleanup_old_cirrus_data',
  'auto_cleanup_cirrus_data',
  'check_rate_limit'
)
ORDER BY routine_name;
```

**SQL to Check Triggers:**
```sql
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name IN (
  'trigger_process_cirrus_reading',
  'trigger_create_default_voltage_config'
)
ORDER BY trigger_name;
```

---

### 2. **Table Structures** (Verify Columns)

**Check `cirrus` table columns:**
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'cirrus'
ORDER BY ordinal_position;
```

**Expected columns in `cirrus`:**
- `id`, `machine_id`, `timestamp`
- `ambient_temp`, `duct_temp`, `motor_temp`, `delta_t`
- `fan_active`, `pump_active`, `drain_active`, `exhaust_active`
- `is_cooling`, `is_on`, `is_connected`, `has_water`
- `voltage`, `current`, `power`
- `overall_status`, `motor_status`, `water_status`, `cooling_status`
- `status_details` (JSONB)
- `motor_temp_within_parameters`, `current_within_parameters`, etc.

**Check `readings_raw` table columns:**
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'readings_raw'
ORDER BY ordinal_position;
```

**Expected columns in `readings_raw`:**
- `id`, `machine_id`, `created_at`
- `motor_temp`, `inside_temp`, `outside_temp`
- `current`, `voltage`, `power`
- `has_water`
- `voltage_input_1`, `voltage_input_2`, `voltage_input_3`, `voltage_input_4`
- `sensor_read_count`, `api_key_used`

**Check `machine_voltage_config` table columns:**
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'machine_voltage_config'
ORDER BY ordinal_position;
```

**Expected columns:**
- `id`, `machine_id`
- `voltage_input_1_function`, `voltage_input_2_function`, etc.
- `voltage_active_threshold`
- `created_at`, `updated_at`

---

### 3. **Data Flow Test** (Critical)

**Test if trigger is working:**

1. **Insert test data into `readings_raw`:**
```sql
-- Get a machine_id first (replace with actual machine ID)
INSERT INTO public.readings_raw (
  machine_id,
  motor_temp,
  outside_temp,
  inside_temp,
  current,
  voltage,
  has_water,
  voltage_input_1,
  voltage_input_2
) VALUES (
  'YOUR_MACHINE_ID_HERE',  -- Replace with actual UUID
  45.5,  -- motor_temp
  30.0,  -- outside_temp
  25.0,  -- inside_temp
  12.5,  -- current
  230.0, -- voltage
  true,  -- has_water
  12.0,  -- voltage_input_1 (fan active)
  12.0   -- voltage_input_2 (pump active)
);
```

2. **Check if data was processed:**
```sql
-- Should see data in cirrus table
SELECT * FROM public.cirrus
WHERE machine_id = 'YOUR_MACHINE_ID_HERE'
ORDER BY timestamp DESC
LIMIT 1;
```

3. **Check if data was deleted from readings_raw:**
```sql
-- Should be empty (data was processed and deleted)
SELECT * FROM public.readings_raw
WHERE machine_id = 'YOUR_MACHINE_ID_HERE'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected Result:**
- ✅ Data appears in `cirrus` table
- ✅ Data is removed from `readings_raw` (after processing)
- ✅ Status fields are calculated correctly

---

### 4. **Views Verification**

**Check if views exist:**
```sql
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'VIEW'
AND table_name IN (
  'machine_connection_status',
  'cirrus_data_retention_info'
)
ORDER BY table_name;
```

---

### 5. **RLS Policies** (Security)

**Check RLS is enabled:**
```sql
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('cirrus', 'readings_raw', 'machine_voltage_config')
ORDER BY tablename;
```

**Expected:** All should have `rls_enabled = true`

---

## 🎯 Quick Verification Queries

**Run this comprehensive check:**
```sql
-- 1. Check all required tables exist
SELECT 'Tables' as check_type, COUNT(*) as count
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'cirrus', 'readings_raw', 'machine_voltage_config',
  'machines', 'coolbreeze', 'edge_function_rate_limit'
)

UNION ALL

-- 2. Check all required functions exist
SELECT 'Functions' as check_type, COUNT(*) as count
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'process_cirrus_reading',
  'calculate_cirrus_status',
  'calculate_machine_connection_status',
  'validate_temperature_reading'
)

UNION ALL

-- 3. Check all required triggers exist
SELECT 'Triggers' as check_type, COUNT(*) as count
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name IN (
  'trigger_process_cirrus_reading',
  'trigger_create_default_voltage_config'
)

UNION ALL

-- 4. Check views exist
SELECT 'Views' as check_type, COUNT(*) as count
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN (
  'machine_connection_status',
  'cirrus_data_retention_info'
);
```

**Expected Results:**
- Tables: 6
- Functions: 4+ (at least the critical ones)
- Triggers: 2
- Views: 2

---

## ⚠️ Common Issues to Check

### Issue 1: Trigger Not Firing
**Symptom:** Data stays in `readings_raw`, never appears in `cirrus`

**Check:**
```sql
-- Check if trigger exists and is enabled
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_process_cirrus_reading';
```

**Fix:** If missing, run migration 2 again

---

### Issue 2: Missing Voltage Config
**Symptom:** Voltage inputs not mapping correctly

**Check:**
```sql
-- Check if all machines have voltage config
SELECT 
  m.id,
  m.name,
  CASE WHEN mvc.machine_id IS NULL THEN 'MISSING' ELSE 'OK' END as config_status
FROM public.machines m
LEFT JOIN public.machine_voltage_config mvc ON mvc.machine_id = m.id
WHERE m.type = 'evaporative';
```

**Fix:** If missing, the trigger should auto-create, but you can manually run:
```sql
-- Backfill missing configs
INSERT INTO public.machine_voltage_config (machine_id, voltage_input_1_function, voltage_input_2_function, voltage_input_3_function, voltage_input_4_function)
SELECT id, 'fan', 'pump', 'drain', 'exhaust'
FROM public.machines
WHERE id NOT IN (SELECT machine_id FROM public.machine_voltage_config)
ON CONFLICT (machine_id) DO NOTHING;
```

---

### Issue 3: Function Errors
**Symptom:** Processing fails silently

**Check Supabase Logs:**
- Go to **Logs** → **Postgres Logs**
- Look for errors related to `process_cirrus_reading`

**Common Errors:**
- Missing columns in `readings_raw`
- Missing `machine_voltage_config` for a machine
- Invalid temperature values

---

## ✅ Final Verification Steps

1. [ ] All tables exist (verified from screenshot)
2. [ ] All functions exist (run SQL check)
3. [ ] All triggers exist and are enabled (run SQL check)
4. [ ] Test data flow (insert test data, verify processing)
5. [ ] Check views exist
6. [ ] Verify RLS is enabled on all tables
7. [ ] Test with real ESP32 data (if available)

---

**Next Steps:**
1. Run the verification queries above
2. Share results if anything is missing
3. Test data flow with sample data
4. Verify everything works end-to-end

---

**Last Updated:** November 20, 2025  
**Status:** Verification checklist ready

