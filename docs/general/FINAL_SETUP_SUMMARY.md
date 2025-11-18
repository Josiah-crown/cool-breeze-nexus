# 🎯 Final Setup Summary - Raw Data + Machine Parameters

## ✅ Complete Solution

### **What We've Built:**

1. **Clean readings_raw Table** - Only raw sensor data
2. **Machine Parameters System** - Configurable per machine
3. **All Calculations in Supabase** - No ESP32 calculations
4. **Connection Status** - 10-minute timeout
5. **Parameter Compliance** - Checks against machine thresholds

---

## 📊 Data Flow

```
ESP32 (Raw Sensors Only)
    ↓
Edge Function (Validates & Inserts Raw Data)
    ↓
readings_raw (RAW DATA ONLY)
    ↓
Database Trigger (process_cirrus_reading)
    ↓
Calculations Using:
  - machine_voltage_config (voltage input mapping)
  - machine_alert_config (thresholds)
    ↓
CIRRUS Table (Processed Data)
    ↓
Raw Data Deleted
```

---

## 📋 readings_raw Schema (RAW DATA ONLY)

```sql
- id (UUID)
- machine_id (UUID)
- created_at (TIMESTAMP)
- motor_temp (NUMERIC) - RAW sensor reading
- inside_temp (NUMERIC) - RAW sensor reading
- outside_temp (NUMERIC) - RAW sensor reading
- current (NUMERIC) - RAW sensor reading
- voltage (NUMERIC) - RAW sensor reading (optional)
- power (NUMERIC) - RAW sensor reading (optional, calculated if not provided)
- has_water (BOOLEAN) - RAW from float switch
- voltage_input_1 (NUMERIC) - RAW voltage input 1
- voltage_input_2 (NUMERIC) - RAW voltage input 2
- voltage_input_3 (NUMERIC) - RAW voltage input 3
- voltage_input_4 (NUMERIC) - RAW voltage input 4
- api_key_used (TEXT) - Partial key for tracking
```

---

## 🔧 Calculations Done in Supabase

### **1. Delta T**
```sql
delta_t = ABS(outside_temp - inside_temp)
```

### **2. Voltage Input Mapping**
- Uses `machine_voltage_config` table
- Maps `voltage_input_1-4` to functions (fan, pump, drain, exhaust)
- Active if: `voltage > voltage_active_threshold` (default 6.0V)

### **3. Power**
```sql
power = voltage × current  (if power not provided)
```

### **4. Connection Status**
- Connected = last reading within 10 minutes
- Calculated via `calculate_machine_connection_status()`

### **5. Status Calculations**
- Uses `machine_alert_config` for thresholds
- Calculates: overall_status, motor_status, water_status, cooling_status

### **6. Parameter Compliance**
- `motor_temp_within_parameters`: Motor temp < motor_temp_critical
- `current_within_parameters`: Current < motor_amps_warning
- `voltage_within_parameters`: Voltage between 200-250V
- `power_within_parameters`: Power < (motor_amps_warning × 230V)
- `water_within_parameters`: has_water = true

---

## 📁 Machine Parameters Location

### **Database Tables:**
1. **`machine_alert_config`** - Alert thresholds (temperature, current, etc.)
2. **`machine_voltage_config`** - Voltage input mappings

### **Documentation Files:**
- `docs/machine_parameters/README.md`
- `docs/machine_parameters/cirrus/default_parameters.json`
- `docs/machine_parameters/cirrus/README.md`

---

## 🗂️ Files Created

### **Migrations:**
1. `20250108000006_create_clean_readings_raw.sql` - Clean raw data table
2. `20250108000007_create_machine_voltage_config.sql` - Voltage input mapping
3. `20250108000008_add_connection_status_calculation.sql` - Connection status
4. Updated: `20250108000000_create_cirrus_table.sql` - Added parameter columns
5. Updated: `20250108000001_create_cirrus_processor.sql` - Uses machine parameters

### **Code:**
1. Updated: `supabase/functions/esp32-data-receiver/index.ts` - Raw data only
2. Updated: `hardware/esp32/ESP32_Cirrus_Optimized_2Min/ESP32_Cirrus_Optimized_2Min.ino` - Raw data only

### **Documentation:**
1. `docs/machine_parameters/README.md`
2. `docs/machine_parameters/cirrus/default_parameters.json`
3. `docs/machine_parameters/cirrus/README.md`
4. `docs/RAW_DATA_MIGRATION_GUIDE.md`
5. `docs/COMPLETE_RAW_DATA_SETUP.md`
6. `docs/MIGRATION_CHECKLIST.md`
7. `docs/FINAL_SETUP_SUMMARY.md` (this file)

---

## ✅ What's Included

### **Raw Data:**
- ✅ Only sensor readings
- ✅ No calculations
- ✅ Deleted after processing

### **Calculations:**
- ✅ Delta T (ambient - duct)
- ✅ Voltage input mapping (per machine)
- ✅ Fan/Pump/Drain/Exhaust active states
- ✅ Power (voltage × current)
- ✅ Connection status (10 min timeout)
- ✅ All status calculations
- ✅ Parameter compliance checks

### **Machine Parameters:**
- ✅ Alert thresholds (temperature, current)
- ✅ Voltage input mappings (configurable per machine)
- ✅ Voltage active threshold (default 6.0V)
- ✅ Stored in database (per machine)
- ✅ Default values in JSON files

### **Data Retention:**
- ✅ Raw data: Deleted immediately after processing
- ✅ Processed data: 1 year retention in CIRRUS table

---

## 🚀 Next Steps

1. **Review all migrations** (especially the new ones)
2. **Backup existing data** (if any)
3. **Run migrations in order**
4. **Deploy updated edge function**
5. **Upload updated ESP32 code**
6. **Configure voltage mappings** per machine
7. **Test end-to-end**

See `docs/MIGRATION_CHECKLIST.md` for detailed steps!

---

## 📚 Documentation

- **Setup Guide:** `docs/CIRRUS_SETUP_GUIDE.md`
- **Migration Guide:** `docs/RAW_DATA_MIGRATION_GUIDE.md`
- **Migration Checklist:** `docs/MIGRATION_CHECKLIST.md`
- **Machine Parameters:** `docs/machine_parameters/README.md`
- **Data Processing:** `docs/CIRRUS_DATA_PROCESSING.md`

---

## ✨ Key Features

✅ **Raw data only** in readings_raw  
✅ **All calculations** in Supabase  
✅ **Per-machine configuration** (voltage mapping, thresholds)  
✅ **Parameter compliance** checks  
✅ **Connection status** (10 min timeout)  
✅ **1 year data retention**  
✅ **Automatic cleanup**  
✅ **75% bandwidth reduction** (2 min updates)


