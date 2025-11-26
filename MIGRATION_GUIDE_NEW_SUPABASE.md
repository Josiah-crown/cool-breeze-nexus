# 🚀 Migration Guide: Moving to New Supabase Instance

**Date:** 2025-01-23  
**Purpose:** Step-by-step guide for migrating to the new database architecture

---

## 📋 Pre-Migration Checklist

- [ ] New Supabase instance created
- [ ] Backup of current database taken
- [ ] All code changes reviewed
- [ ] Test environment set up

---

## 🔧 Step 1: Create Database Schema

1. **Open Supabase Dashboard** → SQL Editor
2. **Run the complete schema:**
   - File: `supabase/migrations/000_COMPLETE_DATABASE_SCHEMA.sql`
   - This creates all tables, indexes, RLS policies, and triggers

3. **Verify tables created:**
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```

   Should see:
   - `profiles`, `user_roles`, `machines`, etc. (shared tables)
   - `cirrus_raw`, `cirrus_calculated`, `cirrus_notifications`, `cirrus_voltage_config`
   - `coolbreeze_raw`, `coolbreeze_calculated`, `coolbreeze_notifications`, `coolbreeze_voltage_config`
   - `machine_connection_status`

---

## 📦 Step 2: Migrate Data (If Applicable)

If you have existing data to migrate:

### **2.1 Migrate User Data**
```sql
-- Copy profiles
INSERT INTO profiles SELECT * FROM old_database.profiles;

-- Copy user_roles
INSERT INTO user_roles SELECT * FROM old_database.user_roles;

-- Copy assignments
INSERT INTO installer_company_assignments SELECT * FROM old_database.installer_company_assignments;
INSERT INTO client_admin_assignments SELECT * FROM old_database.client_admin_assignments;
```

### **2.2 Migrate Machine Data**
```sql
-- Copy machines (only basic info, no status columns)
INSERT INTO machines (id, name, type, manufacturer, owner_id, location, api_key, api_endpoint, temperature_setpoint, created_at, updated_at)
SELECT id, name, type, manufacturer, owner_id, location, api_key, api_endpoint, temperature_setpoint, created_at, updated_at
FROM old_database.machines;
```

### **2.3 Migrate Historical Data**
```sql
-- Copy Cirrus data
INSERT INTO cirrus_calculated 
SELECT * FROM old_database.cirrus;

-- Copy CoolBreeze data
INSERT INTO coolbreeze_calculated 
SELECT * FROM old_database.coolbreeze;
```

### **2.4 Migrate Configuration**
```sql
-- Migrate voltage config
INSERT INTO cirrus_voltage_config (machine_id, voltage_input_1_function, voltage_input_2_function, voltage_input_3_function, voltage_input_4_function, voltage_active_threshold)
SELECT machine_id, 
  CASE voltage_input_1_function WHEN 'fan' THEN 'Custom_1' WHEN 'pump' THEN 'Custom_2' WHEN 'drain' THEN 'Custom_3' WHEN 'exhaust' THEN 'Custom_4' ELSE 'unused' END,
  CASE voltage_input_2_function WHEN 'fan' THEN 'Custom_1' WHEN 'pump' THEN 'Custom_2' WHEN 'drain' THEN 'Custom_3' WHEN 'exhaust' THEN 'Custom_4' ELSE 'unused' END,
  CASE voltage_input_3_function WHEN 'fan' THEN 'Custom_1' WHEN 'pump' THEN 'Custom_2' WHEN 'drain' THEN 'Custom_3' WHEN 'exhaust' THEN 'Custom_4' ELSE 'unused' END,
  CASE voltage_input_4_function WHEN 'fan' THEN 'Custom_1' WHEN 'pump' THEN 'Custom_2' WHEN 'drain' THEN 'Custom_3' WHEN 'exhaust' THEN 'Custom_4' ELSE 'unused' END,
  voltage_active_threshold
FROM old_database.machine_voltage_config
WHERE machine_id IN (SELECT id FROM machines WHERE manufacturer = 'Cirrus');

-- Similar for CoolBreeze
INSERT INTO coolbreeze_voltage_config (machine_id, voltage_input_1_function, voltage_input_2_function, voltage_input_3_function, voltage_input_4_function, voltage_input_5_function, voltage_input_6_function, voltage_active_threshold)
SELECT machine_id, 
  CASE voltage_input_1_function WHEN 'fan' THEN 'Custom_1' WHEN 'pump' THEN 'Custom_2' WHEN 'drain' THEN 'Custom_3' WHEN 'exhaust' THEN 'Custom_4' ELSE 'unused' END,
  CASE voltage_input_2_function WHEN 'fan' THEN 'Custom_1' WHEN 'pump' THEN 'Custom_2' WHEN 'drain' THEN 'Custom_3' WHEN 'exhaust' THEN 'Custom_4' ELSE 'unused' END,
  CASE voltage_input_3_function WHEN 'fan' THEN 'Custom_1' WHEN 'pump' THEN 'Custom_2' WHEN 'drain' THEN 'Custom_3' WHEN 'exhaust' THEN 'Custom_4' ELSE 'unused' END,
  CASE voltage_input_4_function WHEN 'fan' THEN 'Custom_1' WHEN 'pump' THEN 'Custom_2' WHEN 'drain' THEN 'Custom_3' WHEN 'exhaust' THEN 'Custom_4' ELSE 'unused' END,
  'unused', 'unused',  -- voltage_input_5 and 6 default to unused
  voltage_active_threshold
FROM old_database.machine_voltage_config
WHERE machine_id IN (SELECT id FROM machines WHERE manufacturer = 'CoolBreeze');
```

### **2.5 Migrate Notifications**
```sql
-- Migrate alert config to manufacturer-specific notifications
INSERT INTO cirrus_notifications (machine_id, motor_temp_warning, motor_temp_critical, motor_amps_warning, voltage_min, voltage_max, pickup_voltage_min, delta_t_min_cooling, duration_motor_temp_critical, duration_fan_failure, reminder_interval_hours, send_recovery_emails)
SELECT machine_id, motor_temp_warning, motor_temp_critical, motor_amps_warning, 200.0, 250.0, 6.0, delta_t_min_cooling, duration_motor_temp_critical, duration_fan_failure, reminder_interval_hours, send_recovery_emails
FROM old_database.machine_alert_config
WHERE machine_id IN (SELECT id FROM machines WHERE manufacturer = 'Cirrus');

-- Similar for CoolBreeze (with additional fields)
INSERT INTO coolbreeze_notifications (machine_id, motor_temp_warning, motor_temp_critical, compressor_temp_critical, motor_amps_warning, compressor_amps_warning, voltage_min, voltage_max, pickup_voltage_min, delta_t_min_cooling, delta_t_min_heating, delta_t_max_heating, setpoint_tolerance, duration_motor_temp_critical, duration_fan_failure, duration_pump_failure, duration_cooling_ineffective, duration_heating_failure, duration_heating_excessive, duration_setpoint_deviation, duration_low_water, reminder_interval_hours, send_recovery_emails)
SELECT machine_id, motor_temp_warning, motor_temp_critical, compressor_temp_critical, motor_amps_warning, compressor_amps_warning, 200.0, 250.0, 6.0, delta_t_min_cooling, delta_t_min_heating, delta_t_max_heating, setpoint_tolerance, duration_motor_temp_critical, duration_fan_failure, duration_pump_failure, duration_cooling_ineffective, duration_heating_failure, duration_heating_excessive, duration_setpoint_deviation, duration_low_water, reminder_interval_hours, send_recovery_emails
FROM old_database.machine_alert_config
WHERE machine_id IN (SELECT id FROM machines WHERE manufacturer = 'CoolBreeze');
```

---

## 🔄 Step 3: Update Frontend Code

### **3.1 Update `src/lib/machineConfig.ts`**

Change:
```typescript
export const PROCESSING_TABLE_MAP: Record<Manufacturer | string, 'cirrus' | 'coolbreeze' | null> = {
  'Cirrus': 'cirrus',
  'CoolBreeze': 'coolbreeze',
};
```

To:
```typescript
export const PROCESSING_TABLE_MAP: Record<Manufacturer | string, 'cirrus_calculated' | 'coolbreeze_calculated' | null> = {
  'Cirrus': 'cirrus_calculated',
  'CoolBreeze': 'coolbreeze_calculated',
};
```

### **3.2 Update `src/lib/historicalData.ts`**

Change return type:
```typescript
async function getMachineProcessingTable(machineId: string): Promise<'cirrus' | 'coolbreeze' | null>
```

To:
```typescript
async function getMachineProcessingTable(machineId: string): Promise<'cirrus_calculated' | 'coolbreeze_calculated' | null>
```

### **3.3 Update `src/components/MachineDetailView.tsx`**

Change:
```typescript
.from('cirrus')
```

To:
```typescript
.from('cirrus_calculated')
```

### **3.4 Update `src/components/MachineCard.tsx`**

Change:
```typescript
.from('cirrus')
```

To:
```typescript
.from('cirrus_calculated')
```

### **3.5 Update `src/hooks/useMachineData.tsx`**

Change:
```typescript
.from('cirrus')
.from('coolbreeze')
```

To:
```typescript
.from('cirrus_calculated')
.from('coolbreeze_calculated')
```

---

## 🔌 Step 4: Update ESP32 Code

### **4.1 Update API Endpoint**

Change ESP32 to POST to `{manufacturer}_raw` instead of `readings_raw`:

```cpp
// OLD:
String url = String(supabaseUrl) + "/rest/v1/readings_raw";

// NEW (determine manufacturer first, then use appropriate table):
String manufacturer = "Cirrus";  // Get from machine config
String url = String(supabaseUrl) + "/rest/v1/" + manufacturer.toLowerCase() + "_raw";
```

### **4.2 Update Payload**

Ensure ESP32 sends:
- `voltage_input_1` through `voltage_input_6` (all 6 voltage pickups)
- `voltage` (main line voltage from CT)
- `current` (from CT)
- `motor_temp`, `inside_temp`, `outside_temp`
- `has_water`

---

## ✅ Step 5: Create Processing Triggers

After schema is created, you need to create the processing functions and triggers:

### **5.1 Create Cirrus Processing Function**

```sql
CREATE OR REPLACE FUNCTION process_cirrus_reading()
RETURNS TRIGGER AS $$
DECLARE
  v_voltage_config RECORD;
  v_voltage_1 NUMERIC;
  v_voltage_2 NUMERIC;
  v_voltage_3 NUMERIC;
  v_voltage_4 NUMERIC;
  v_voltage_5 NUMERIC;
  v_voltage_6 NUMERIC;
  v_fan_active BOOLEAN;
  v_pump_active BOOLEAN;
  v_drain_active BOOLEAN;
  v_exhaust_active BOOLEAN;
BEGIN
  -- Get voltage config for this machine
  SELECT * INTO v_voltage_config
  FROM cirrus_voltage_config
  WHERE machine_id = NEW.machine_id;
  
  -- Map voltage inputs to voltage_1-6 based on config
  -- (Implementation depends on your mapping logic)
  
  -- Calculate operational states from pickup voltages
  -- (Implementation depends on your logic)
  
  -- Insert into cirrus_calculated
  INSERT INTO cirrus_calculated (
    machine_id, timestamp,
    ambient_temp, duct_temp, motor_temp, delta_t,
    voltage, current, power,
    voltage_1, voltage_2, voltage_3, voltage_4, voltage_5, voltage_6,
    fan_active, pump_active, drain_active, exhaust_active,
    is_cooling, is_on, has_water,
    overall_status, motor_status, water_status, cooling_status
  ) VALUES (
    -- Your calculated values here
  );
  
  -- Update machines table with latest status
  UPDATE machines SET
    -- Update from calculated table
  WHERE id = NEW.machine_id;
  
  -- Update connection status
  UPDATE machine_connection_status SET
    last_seen_at = NEW.timestamp,
    is_connected = true,
    last_reading_timestamp = NEW.timestamp
  WHERE machine_id = NEW.machine_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER trigger_process_cirrus_reading
  AFTER INSERT ON cirrus_raw
  FOR EACH ROW
  EXECUTE FUNCTION process_cirrus_reading();
```

### **5.2 Create CoolBreeze Processing Function**

Similar pattern for CoolBreeze.

---

## 🧹 Step 6: Create Cleanup Jobs

### **6.1 Cleanup Raw Data (2 weeks)**

```sql
-- Create cleanup function for cirrus_raw
CREATE OR REPLACE FUNCTION cleanup_cirrus_raw()
RETURNS void AS $$
BEGIN
  DELETE FROM cirrus_raw
  WHERE created_at < NOW() - INTERVAL '14 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule with pg_cron (if available)
SELECT cron.schedule('cleanup-cirrus-raw', '0 2 * * *', 'SELECT cleanup_cirrus_raw()');
```

### **6.2 Cleanup Calculated Data (1 year)**

```sql
-- Create cleanup function for cirrus_calculated
CREATE OR REPLACE FUNCTION cleanup_cirrus_calculated()
RETURNS void AS $$
BEGIN
  DELETE FROM cirrus_calculated
  WHERE timestamp < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- Schedule with pg_cron
SELECT cron.schedule('cleanup-cirrus-calculated', '0 3 * * *', 'SELECT cleanup_cirrus_calculated()');
```

---

## ✅ Step 7: Verification

1. **Test data insertion:**
   - Insert test data into `cirrus_raw`
   - Verify it appears in `cirrus_calculated`
   - Verify `machines` table updates
   - Verify `machine_connection_status` updates

2. **Test frontend:**
   - Verify historical data loads
   - Verify real-time updates work
   - Verify fan/LED status displays correctly

3. **Test ESP32:**
   - Send test reading
   - Verify it appears in `{manufacturer}_raw`
   - Verify processing trigger fires
   - Verify data appears in `{manufacturer}_calculated`

---

## 📝 Files That Need Updates

### **Code Files:**
- ✅ `src/lib/machineConfig.ts` - Update PROCESSING_TABLE_MAP
- ✅ `src/lib/historicalData.ts` - Update table names
- ✅ `src/components/MachineDetailView.tsx` - Update table references
- ✅ `src/components/MachineCard.tsx` - Update table references
- ✅ `src/hooks/useMachineData.tsx` - Update table references

### **Documentation:**
- ✅ `DATABASE_SCHEMA.md` - Complete schema documentation
- ✅ `PROPOSED_DATABASE_ARCHITECTURE.md` - Architecture details
- ✅ `MIGRATION_GUIDE_NEW_SUPABASE.md` - This file

### **ESP32 Code:**
- Update API endpoint to use `{manufacturer}_raw` tables
- Update payload to include all 6 voltage inputs

---

## 🗑️ Old Tables to Remove (After Migration Verified)

Once the new system is working:

1. **Drop old tables:**
   ```sql
   DROP TABLE IF EXISTS readings_raw;
   DROP TABLE IF EXISTS cirrus;  -- Old table
   DROP TABLE IF EXISTS coolbreeze;  -- Old table
   DROP TABLE IF EXISTS machine_alert_config;  -- Replaced by {manufacturer}_notifications
   DROP TABLE IF EXISTS machine_voltage_config;  -- Replaced by {manufacturer}_voltage_config
   DROP TABLE IF EXISTS alert_states;  -- If not needed
   DROP TABLE IF EXISTS alert_history;  -- If not needed
   DROP TABLE IF EXISTS edge_function_rate_limit;  -- If not used
   ```

2. **Archive old migration files:**
   - Move old migration files to `supabase/migrations/archive/` folder
   - Keep only `000_COMPLETE_DATABASE_SCHEMA.sql` for new instances

---

## 🎯 Summary

**New Architecture:**
- ✅ Manufacturer-specific tables: `{manufacturer}_raw`, `{manufacturer}_calculated`, `{manufacturer}_notifications`, `{manufacturer}_voltage_config`
- ✅ Shared tables: `machine_connection_status`, user management, `machines` (basic info only)
- ✅ Expansion-friendly: Add new manufacturer = add 4 tables
- ✅ Historical data: 2 weeks raw + 1 year calculated

**Key Changes:**
- `cirrus` → `cirrus_calculated`
- `coolbreeze` → `coolbreeze_calculated`
- `readings_raw` → `{manufacturer}_raw`
- `machine_alert_config` → `{manufacturer}_notifications`
- `machine_voltage_config` → `{manufacturer}_voltage_config`

---

**Ready for migration when you set up the new Supabase instance!** 🚀

