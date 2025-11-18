# ✅ Complete Raw Data Implementation

## 🎯 Summary

We've completely restructured the system to:
1. **ESP32 sends ONLY raw sensor data** (no calculations)
2. **Edge function inserts ONLY raw data** (no calculations)
3. **All calculations done in Supabase** (using machine parameters)
4. **Machine parameters stored in database** (configurable per machine)
5. **Connection status calculated** (10 minute timeout)
6. **Parameter compliance checked** (against machine thresholds)

---

## 📊 Complete Data Flow

```
ESP32 Device
  ↓ (sends every 2 minutes)
  RAW DATA ONLY:
    - motor_temp
    - inside_temp
    - outside_temp
    - current
    - voltage (optional)
    - has_water
    - voltage_input_1-4

Edge Function (esp32-data-receiver)
  ↓ (validates API key, rate limits)
  Inserts RAW DATA ONLY to readings_raw

readings_raw Table
  ↓ (database trigger fires)
  process_cirrus_reading() function

Calculations Using:
  - machine_voltage_config (maps voltage inputs)
  - machine_alert_config (thresholds)
  ↓
  Calculates:
    - delta_t = ABS(outside_temp - inside_temp)
    - fan_active (from voltage_input mapping)
    - pump_active (from voltage_input mapping)
    - drain_active (from voltage_input mapping)
    - exhaust_active (from voltage_input mapping)
    - is_on = pump_active
    - is_cooling = pump_active OR drain_active
    - power = voltage × current
    - overall_status (using thresholds)
    - motor_status (using thresholds)
    - water_status
    - cooling_status
    - motor_temp_within_parameters
    - current_within_parameters
    - voltage_within_parameters
    - power_within_parameters
    - water_within_parameters
    - is_connected = true (just received data)

CIRRUS Table
  ↓ (raw data deleted)
  ✅ Processed data stored
```

---

## 📋 readings_raw Schema (FINAL)

```sql
CREATE TABLE readings_raw (
  id UUID PRIMARY KEY,
  machine_id UUID REFERENCES machines(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- RAW Temperature Readings
  motor_temp NUMERIC(5,2),
  inside_temp NUMERIC(5,2),
  outside_temp NUMERIC(5,2),
  
  -- RAW Electrical Readings
  current NUMERIC(6,2),
  voltage NUMERIC(6,2),  -- Optional
  power NUMERIC(7,2),    -- Optional (calculated if not provided)
  
  -- RAW Water Status
  has_water BOOLEAN,
  
  -- RAW Voltage Inputs (12V logic)
  voltage_input_1 NUMERIC(5,2),
  voltage_input_2 NUMERIC(5,2),
  voltage_input_3 NUMERIC(5,2),
  voltage_input_4 NUMERIC(5,2),
  
  -- Metadata
  api_key_used TEXT
);
```

**NO CALCULATED FIELDS!**

---

## 🔧 All Calculations in Supabase

### **1. Delta T**
```sql
delta_t = ABS(outside_temp - inside_temp)
```

### **2. Voltage Input Mapping**
Uses `machine_voltage_config`:
- Maps `voltage_input_1-4` to functions (fan, pump, drain, exhaust)
- Active if: `voltage > voltage_active_threshold` (default 6.0V)

### **3. Power**
```sql
power = voltage × current  (if power not provided)
```

### **4. Connection Status**
- Function: `calculate_machine_connection_status(machine_id, 10)`
- Connected = last reading within 10 minutes
- View: `machine_connection_status`

### **5. Status Calculations**
Uses `machine_alert_config` thresholds:
- **Motor Status:**
  - Normal: < motor_temp_warning
  - Warning: >= motor_temp_warning, < motor_temp_critical
  - Critical: >= motor_temp_critical

- **Overall Status:**
  - Error: water empty OR motor critical
  - Warning: water low OR motor warning OR high current OR inefficient cooling
  - Operational: all systems normal
  - Offline: no active components

### **6. Parameter Compliance**
- `motor_temp_within_parameters`: motor_temp < motor_temp_critical
- `current_within_parameters`: current < motor_amps_warning
- `voltage_within_parameters`: voltage between 200-250V
- `power_within_parameters`: power < (motor_amps_warning × 230V)
- `water_within_parameters`: has_water = true

---

## 📁 Machine Parameters System

### **Database Tables:**

1. **`machine_alert_config`** (already exists)
   - `motor_temp_warning` (default 60.0°C)
   - `motor_temp_critical` (default 70.0°C)
   - `motor_amps_warning` (default 15.0A)
   - `delta_t_min_cooling` (default 2.0°C)
   - Duration thresholds

2. **`machine_voltage_config`** (NEW)
   - `voltage_input_1_function` (fan, pump, drain, exhaust, unused)
   - `voltage_input_2_function`
   - `voltage_input_3_function`
   - `voltage_input_4_function`
   - `voltage_active_threshold` (default 6.0V)

### **Documentation Files:**
- `docs/machine_parameters/README.md`
- `docs/machine_parameters/cirrus/default_parameters.json`
- `docs/machine_parameters/cirrus/README.md`

---

## 🗂️ All Files Created/Updated

### **Migrations (Run in Order):**
1. ✅ `20250108000006_create_clean_readings_raw.sql` - Clean raw data table
2. ✅ `20250108000007_create_machine_voltage_config.sql` - Voltage input mapping
3. ✅ `20250108000008_add_connection_status_calculation.sql` - Connection status
4. ✅ `20250108000000_create_cirrus_table.sql` - Updated with parameter columns
5. ✅ `20250108000001_create_cirrus_processor.sql` - Updated to use parameters

### **Code:**
1. ✅ `supabase/functions/esp32-data-receiver/index.ts` - Raw data only
2. ✅ `hardware/esp32/ESP32_Cirrus_Optimized_2Min/ESP32_Cirrus_Optimized_2Min.ino` - Raw data only

### **Documentation:**
1. ✅ `docs/machine_parameters/README.md`
2. ✅ `docs/machine_parameters/cirrus/default_parameters.json`
3. ✅ `docs/machine_parameters/cirrus/README.md`
4. ✅ `docs/RAW_DATA_MIGRATION_GUIDE.md`
5. ✅ `docs/COMPLETE_RAW_DATA_SETUP.md`
6. ✅ `docs/MIGRATION_CHECKLIST.md`
7. ✅ `docs/FINAL_SETUP_SUMMARY.md`
8. ✅ `docs/QUICK_START_RAW_DATA.md`
9. ✅ `docs/COMPLETE_RAW_DATA_IMPLEMENTATION.md` (this file)

---

## ✅ What's Included

### **Raw Data (readings_raw):**
- ✅ Only sensor readings
- ✅ No calculations
- ✅ Deleted immediately after processing

### **Calculations (in Supabase):**
- ✅ Delta T
- ✅ Voltage input mapping (per machine)
- ✅ Fan/Pump/Drain/Exhaust active states
- ✅ Power calculation
- ✅ Connection status (10 min timeout)
- ✅ All status calculations
- ✅ Parameter compliance checks

### **Machine Parameters:**
- ✅ Alert thresholds (per machine)
- ✅ Voltage input mappings (per machine)
- ✅ Stored in database
- ✅ Default values in JSON files

### **Data Retention:**
- ✅ Raw data: Deleted after processing
- ✅ Processed data: 1 year in CIRRUS table

---

## 🚀 Ready to Deploy!

All files are ready. Follow `docs/MIGRATION_CHECKLIST.md` for step-by-step instructions.

**Key Points:**
1. Backup existing data first!
2. Run migrations in order
3. Deploy updated edge function
4. Upload updated ESP32 code
5. Configure voltage mappings per machine
6. Test end-to-end

---

## 📚 Documentation Index

- **Quick Start:** `docs/QUICK_START_RAW_DATA.md`
- **Complete Setup:** `docs/FINAL_SETUP_SUMMARY.md`
- **Migration Guide:** `docs/RAW_DATA_MIGRATION_GUIDE.md`
- **Checklist:** `docs/MIGRATION_CHECKLIST.md`
- **Machine Parameters:** `docs/machine_parameters/README.md`
- **Data Processing:** `docs/CIRRUS_DATA_PROCESSING.md`


