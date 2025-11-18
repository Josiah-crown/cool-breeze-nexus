# ⚡ Quick Start - Raw Data Setup

## 🎯 What We Fixed

1. ✅ **Removed all calculations from ESP32** - Only sends raw sensor data
2. ✅ **Removed calculations from edge function** - Only inserts raw data
3. ✅ **All calculations in Supabase** - Database does all processing
4. ✅ **Machine parameters system** - Configurable per machine
5. ✅ **Connection status** - 10 minute timeout
6. ✅ **Parameter compliance** - Checks against thresholds

---

## 📋 readings_raw Table (RAW DATA ONLY)

### **Fields:**
- `id` - UUID
- `machine_id` - UUID
- `created_at` - Timestamp
- `motor_temp` - RAW motor temperature (°C)
- `inside_temp` - RAW inside temperature (°C)
- `outside_temp` - RAW outside temperature (°C)
- `current` - RAW current (Amps)
- `voltage` - RAW voltage (Volts) - optional
- `power` - RAW power (Watts) - optional
- `has_water` - RAW water status (boolean)
- `voltage_input_1` - RAW voltage input 1 (Volts)
- `voltage_input_2` - RAW voltage input 2 (Volts)
- `voltage_input_3` - RAW voltage input 3 (Volts)
- `voltage_input_4` - RAW voltage input 4 (Volts)
- `api_key_used` - Partial API key

### **NO CALCULATED FIELDS:**
- ❌ No `delta_t`
- ❌ No `fan_active`
- ❌ No `pump_active`
- ❌ No `is_on`
- ❌ No `is_cooling`
- ❌ No `overall_status`

---

## 🔧 Calculations in Supabase

### **1. Delta T**
```sql
delta_t = ABS(outside_temp - inside_temp)
```

### **2. Voltage Input Mapping**
- Uses `machine_voltage_config` table
- Maps `voltage_input_1-4` to: fan, pump, drain, exhaust
- Active if: `voltage > threshold` (default 6.0V)

### **3. Power**
```sql
power = voltage × current  (if power not provided)
```

### **4. Connection Status**
- Connected = last reading within 10 minutes
- Function: `calculate_machine_connection_status(machine_id, 10)`

### **5. Status Calculations**
- Uses `machine_alert_config` for thresholds
- Calculates: overall_status, motor_status, water_status, cooling_status

### **6. Parameter Compliance**
- `motor_temp_within_parameters`: < motor_temp_critical
- `current_within_parameters`: < motor_amps_warning
- `voltage_within_parameters`: 200-250V
- `power_within_parameters`: < (motor_amps_warning × 230V)
- `water_within_parameters`: has_water = true

---

## 📁 Machine Parameters

### **Location:**
- **Database:** `machine_alert_config` table (thresholds)
- **Database:** `machine_voltage_config` table (voltage mapping)
- **Files:** `docs/machine_parameters/` folder (defaults)

### **Voltage Input Configuration:**
Each machine can map voltage inputs differently:
- Input 1 → fan, pump, drain, exhaust, or unused
- Input 2 → fan, pump, drain, exhaust, or unused
- Input 3 → fan, pump, drain, exhaust, or unused
- Input 4 → fan, pump, drain, exhaust, or unused

**Default for Cirrus:**
- Input 1 = Fan (GPIO 35)
- Input 2 = Pump (GPIO 32)
- Input 3 = Drain (GPIO 33)
- Input 4 = Exhaust (GPIO 34)

---

## 🚀 Migration Order

1. **Backup existing data**
2. Run: `20250108000006_create_clean_readings_raw.sql`
3. Run: `20250108000007_create_machine_voltage_config.sql`
4. Run: `20250108000008_add_connection_status_calculation.sql`
5. Update: `20250108000000_create_cirrus_table.sql` (add parameter columns)
6. Update: `20250108000001_create_cirrus_processor.sql` (use parameters)
7. Deploy: Updated edge function
8. Upload: Updated ESP32 code
9. Configure: Voltage mappings per machine

---

## ✅ Verification

### **Check Raw Data:**
```sql
SELECT * FROM readings_raw ORDER BY created_at DESC LIMIT 5;
-- Should see ONLY raw sensor readings
```

### **Check Processed Data:**
```sql
SELECT * FROM cirrus ORDER BY timestamp DESC LIMIT 5;
-- Should see processed data with all calculations
```

### **Check Connection Status:**
```sql
SELECT * FROM machine_connection_status;
-- Should show connection status for all machines
```

### **Check Parameters:**
```sql
SELECT * FROM machine_voltage_config;
SELECT * FROM machine_alert_config;
```

---

## 📚 Full Documentation

- **Complete Setup:** `docs/FINAL_SETUP_SUMMARY.md`
- **Migration Guide:** `docs/RAW_DATA_MIGRATION_GUIDE.md`
- **Checklist:** `docs/MIGRATION_CHECKLIST.md`
- **Machine Parameters:** `docs/machine_parameters/README.md`


