# 📊 Data Flow Architecture

## Overview

All ESP32 devices send raw data to `readings_raw` table, then device-specific triggers process the data into dedicated processing tables.

---

## Data Flow Diagram

```
ESP32 Device (Cirrus or CoolBreeze)
    ↓
Edge Function (esp32-data-receiver)
    ↓
readings_raw Table (RAW DATA ONLY)
    ↓
Database Trigger (process_cirrus_reading OR process_coolbreeze_reading)
    ↓
Device-Specific Table (cirrus OR coolbreeze)
    ↓
Website Historical Charts
```

---

## Tables

### **1. readings_raw** (Universal Raw Data Table)

**Purpose:** Stores raw sensor readings from ALL device types

**Columns:**
- `id` - UUID primary key
- `machine_id` - References machines table
- `created_at` - Timestamp
- `motor_temp`, `inside_temp`, `outside_temp` - Temperature readings
- `current`, `voltage`, `power` - Electrical readings
- `has_water` - Water status
- `voltage_input_1`, `voltage_input_2`, `voltage_input_3`, `voltage_input_4` - Configurable voltage inputs
- `sensor_read_count` - Number of readings averaged
- `api_key_used` - Tracking

**Key Points:**
- ✅ Contains ONLY raw sensor data (no calculations)
- ✅ Universal format for all device types
- ✅ Data is deleted immediately after processing
- ✅ Edge function maps different field names to standard columns

---

### **2. cirrus** (Cirrus Processing Table)

**Purpose:** Processed data for Cirrus evaporative coolers

**Populated by:** `process_cirrus_reading()` trigger

**Processes:** Machines where `type = 'evaporative'` OR `manufacturer = 'Cirrus'`

**Contains:**
- Calculated values (delta_t, status, etc.)
- Processed operational states
- Parameter compliance flags
- Historical data (1 year retention)

---

### **3. coolbreeze** (CoolBreeze Processing Table)

**Purpose:** Processed data for CoolBreeze HVAC systems

**Populated by:** `process_coolbreeze_reading()` trigger

**Processes:** Machines where `type IN ('airconditioner', 'heatpump')` OR `manufacturer = 'CoolBreeze'`

**Contains:**
- Calculated values (delta_t, status, fan_speed, etc.)
- Processed operational states
- Pickup statuses (ON/OFF/DISCONNECTED)
- Parameter compliance flags
- Historical data (1 year retention)

---

## Edge Function Mapping

The edge function (`esp32-data-receiver`) handles different field name formats:

### **Cirrus Format:**
```json
{
  "voltage_input_1": 12.5,
  "voltage_input_2": 11.8,
  "voltage_input_3": 0.0,
  "voltage_input_4": 0.0
}
```

### **CoolBreeze Format:**
```json
{
  "exhaust_voltage": 2.1,
  "fan_voltage": 1.5,
  "pump_voltage": 2.8,
  "drain_voltage": 0.0
}
```

**Edge Function Maps Both To:**
```sql
voltage_input_1 = exhaust_voltage (or voltage_input_1)
voltage_input_2 = fan_voltage (or voltage_input_2)
voltage_input_3 = pump_voltage (or voltage_input_3)
voltage_input_4 = drain_voltage (or voltage_input_4)
```

---

## Processing Triggers

### **Cirrus Trigger:**
- **Function:** `process_cirrus_reading()`
- **Trigger:** `trigger_process_cirrus_reading`
- **Fires:** AFTER INSERT on `readings_raw`
- **Checks:** `type = 'evaporative'` OR `manufacturer = 'Cirrus'`
- **Output:** Inserts into `cirrus` table
- **Action:** Deletes raw data after processing

### **CoolBreeze Trigger:**
- **Function:** `process_coolbreeze_reading()`
- **Trigger:** `trigger_process_coolbreeze_reading`
- **Fires:** AFTER INSERT on `readings_raw`
- **Checks:** `type IN ('airconditioner', 'heatpump')` OR `manufacturer = 'CoolBreeze'`
- **Output:** Inserts into `coolbreeze` table
- **Action:** Deletes raw data after processing

---

## Adding New Device Types

### **Step 1: Add Columns to readings_raw (if needed)**
```sql
ALTER TABLE public.readings_raw 
ADD COLUMN new_sensor_field NUMERIC(5,2);
```

### **Step 2: Create Processing Table**
```sql
CREATE TABLE public.new_device_type (
  -- Device-specific processed fields
);
```

### **Step 3: Create Processing Function**
```sql
CREATE OR REPLACE FUNCTION public.process_new_device_reading()
RETURNS TRIGGER AS $$
BEGIN
  -- Check machine type
  -- Process data
  -- Insert into new_device_type table
  -- Delete from readings_raw
END;
$$ LANGUAGE plpgsql;
```

### **Step 4: Create Trigger**
```sql
CREATE TRIGGER trigger_process_new_device_reading
  AFTER INSERT ON public.readings_raw
  FOR EACH ROW
  EXECUTE FUNCTION public.process_new_device_reading();
```

### **Step 5: Update Edge Function (if needed)**
- Add field mapping for new device format
- Support both named and numbered voltage inputs

---

## Data Retention

### **readings_raw:**
- ✅ Deleted immediately after processing
- ✅ No retention (raw data only)

### **cirrus & coolbreeze:**
- ✅ 1 year retention
- ✅ Automatic cleanup via `auto_cleanup_cirrus_data()` and `auto_cleanup_coolbreeze_data()`
- ✅ Can be scheduled daily

---

## Field Name Mapping

### **Temperature:**
- Both devices: `motor_temp`, `inside_temp`, `outside_temp`
- Mapped directly to `readings_raw`

### **Electrical:**
- Both devices: `current`, `voltage`, `power`
- Mapped directly to `readings_raw`

### **Voltage Inputs:**
- **Cirrus:** `voltage_input_1`, `voltage_input_2`, `voltage_input_3`, `voltage_input_4`
- **CoolBreeze:** `exhaust_voltage`, `fan_voltage`, `pump_voltage`, `drain_voltage`
- **Edge Function:** Maps both formats to `voltage_input_1-4` in `readings_raw`
- **Processor:** Uses `voltage_input_1-4` and maps based on `machine_voltage_config`

---

## Key Principles

1. ✅ **All devices → readings_raw** (single entry point)
2. ✅ **readings_raw → device-specific table** (via triggers)
3. ✅ **Raw data deleted after processing** (immediate cleanup)
4. ✅ **Processed data retained 1 year** (for historical charts)
5. ✅ **Edge function handles field name differences** (universal format)
6. ✅ **New devices = new processing table + trigger** (scalable)

---

## Verification Checklist

- [x] Edge function inserts into `readings_raw`
- [x] Cirrus trigger processes `evaporative` machines
- [x] CoolBreeze trigger processes `airconditioner`/`heatpump` machines
- [x] Raw data deleted after processing
- [x] Edge function maps both voltage input formats
- [x] Both devices send `sensor_read_count`
- [x] Temperature validation in place
- [x] 1-year data retention configured

---

## Files

### **Migrations:**
- `20250108000006_create_clean_readings_raw.sql` - Universal raw data table
- `20250108000000_create_cirrus_table.sql` - Cirrus processing table
- `20250108000001_create_cirrus_processor.sql` - Cirrus trigger
- `20250108000011_create_coolbreeze_table.sql` - CoolBreeze processing table
- `20250108000012_create_coolbreeze_processor.sql` - CoolBreeze trigger
- `20250108000010_add_sensor_read_count.sql` - Sensor read count column

### **Edge Function:**
- `supabase/functions/esp32-data-receiver/index.ts` - Handles all device types

---

## Next Steps

1. ✅ Verify data flow architecture
2. ✅ Create CoolBreeze processing table and trigger
3. ✅ Update edge function to handle both formats
4. ⏭️ **Implement historical data tracking on website**


