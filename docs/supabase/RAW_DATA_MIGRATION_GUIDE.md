# 🔄 Raw Data Migration Guide

## Overview

This guide explains the migration from calculated ESP32 data to pure raw data with all calculations done in Supabase.

---

## What Changed

### **Before:**
- ESP32 calculated: `delta_t`, `fan_active`, `pump_active`, `is_on`, `is_cooling`, `power`
- Edge function added derived fields
- Mixed raw and calculated data in `readings_raw`

### **After:**
- ESP32 sends ONLY raw sensor readings
- All calculations done in Supabase database
- Clean separation: raw data → processed data

---

## New readings_raw Schema

### **Fields (RAW DATA ONLY):**
- `id` - UUID
- `machine_id` - UUID (references machines)
- `created_at` - Timestamp
- `motor_temp` - RAW motor temperature (°C)
- `inside_temp` - RAW inside temperature (°C)
- `outside_temp` - RAW outside temperature (°C)
- `current` - RAW current (Amps)
- `voltage` - RAW voltage (Volts) - optional
- `power` - RAW power (Watts) - optional (calculated if not provided)
- `has_water` - RAW water status (boolean from float switch)
- `voltage_input_1` - RAW voltage input 1 (Volts)
- `voltage_input_2` - RAW voltage input 2 (Volts)
- `voltage_input_3` - RAW voltage input 3 (Volts)
- `voltage_input_4` - RAW voltage input 4 (Volts)
- `api_key_used` - Partial API key for tracking

### **Removed Fields:**
- ❌ `delta_t` (calculated in Supabase)
- ❌ `fan_active` (calculated in Supabase)
- ❌ `pump_active` (calculated in Supabase)
- ❌ `drain_active` (calculated in Supabase)
- ❌ `exhaust_active` (calculated in Supabase)
- ❌ `is_on` (calculated in Supabase)
- ❌ `is_cooling` (calculated in Supabase)
- ❌ `overall_status` (calculated in Supabase)
- ❌ `is_connected` (calculated in Supabase)

---

## Calculations Done in Supabase

### **1. Delta T**
```sql
delta_t = ABS(outside_temp - inside_temp)
```

### **2. Voltage Input Mapping**
- Uses `machine_voltage_config` table
- Maps `voltage_input_1-4` to functions (fan, pump, drain, exhaust)
- Determines active state: `voltage > threshold` (default 6.0V)

### **3. Power Calculation**
```sql
power = voltage × current  (if power not provided)
```

### **4. Connection Status**
- Connected = last reading within 10 minutes
- Calculated via `calculate_machine_connection_status()` function

### **5. Status Calculations**
- Uses `machine_alert_config` for thresholds
- Calculates: overall_status, motor_status, water_status, cooling_status

---

## Migration Steps

### **Step 1: Backup Existing Data**
```sql
-- Backup existing readings_raw (if it exists)
CREATE TABLE readings_raw_backup AS SELECT * FROM readings_raw;
```

### **Step 2: Run New Migrations**
1. `20250108000006_create_clean_readings_raw.sql` - Creates clean schema
2. `20250108000007_create_machine_voltage_config.sql` - Voltage input mapping
3. `20250108000008_add_connection_status_calculation.sql` - Connection status

### **Step 3: Update ESP32 Code**
- Upload new ESP32 code that sends only raw data
- Remove all calculations from ESP32

### **Step 4: Update Edge Function**
- Deploy updated edge function (removes calculations)
- Only inserts raw data

### **Step 5: Verify**
- Check `readings_raw` table has only raw data
- Check `cirrus` table has processed data
- Verify calculations are correct

---

## Machine Parameters

### **Location:**
- Database: `machine_alert_config` table (alert thresholds)
- Database: `machine_voltage_config` table (voltage input mapping)
- Files: `docs/machine_parameters/` folder (default parameters)

### **Voltage Input Configuration:**
Each machine can have different GPIO mappings:
- Input 1 → fan, pump, drain, exhaust, or unused
- Input 2 → fan, pump, drain, exhaust, or unused
- Input 3 → fan, pump, drain, exhaust, or unused
- Input 4 → fan, pump, drain, exhaust, or unused

Configured per machine in `machine_voltage_config` table.

---

## Benefits

✅ **Clean Separation:** Raw data vs processed data  
✅ **Flexible:** Can change calculations without updating ESP32  
✅ **Configurable:** Per-machine voltage mappings and thresholds  
✅ **Maintainable:** All logic in one place (Supabase)  
✅ **Scalable:** Easy to add new machine types

---

## Testing Checklist

- [ ] ESP32 sends only raw data (no calculations)
- [ ] Edge function inserts raw data only
- [ ] Database trigger processes data correctly
- [ ] Voltage inputs mapped correctly per machine
- [ ] Delta T calculated correctly
- [ ] Power calculated correctly
- [ ] Connection status calculated correctly
- [ ] Status calculations use machine thresholds
- [ ] Raw data deleted after processing


