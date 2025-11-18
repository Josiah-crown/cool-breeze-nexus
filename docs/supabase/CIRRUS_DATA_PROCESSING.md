# 🔄 CIRRUS Data Processing Flow

## Overview

This document explains how Cirrus evaporative cooler data is processed from raw sensor readings to processed status information.

---

## Data Flow

```
ESP32 Device
    ↓ (sends every 2 minutes)
Edge Function (esp32-data-receiver)
    ↓ (validates & inserts)
readings_raw table
    ↓ (database trigger fires)
process_cirrus_reading() function
    ↓ (processes & calculates)
CIRRUS table
    ↓ (raw data deleted)
✅ Processed data stored
```

---

## What Gets Processed

### **Input Data (from readings_raw):**

**Temperatures:**
- `motor_temp` or `temp_machine` - Motor/compressor temperature (°C)
- `outside_temp` or `temp_outside` - Ambient/exterior temperature (°C)
- `inside_temp` or `temp_inside` - Interior/duct temperature (°C)

**Voltage Readings (12V Logic - >6V = Active):**
- `fan_voltage` - Fan motor control voltage (V)
- `pump_voltage` - Water pump control voltage (V)
- `drain_voltage` - Drain valve control voltage (V)
- `exhaust_voltage` - Exhaust damper control voltage (V)

**Electrical:**
- `voltage` - Line voltage (V)
- `current` or `ct_current` - Current draw (A)
- `power` - Power consumption (W) - calculated if not provided

**Water Management:**
- `has_water` - Boolean from float switch
- `water_level` - Water level percentage (0-100)

---

## Processing Logic

### **1. Status Calculation**

The `calculate_cirrus_status()` function determines:

**Water Status:**
- `empty`: No water or level < 10%
- `low`: Water level 10-30%
- `ok`: Water level > 30%

**Motor Status:**
- `normal`: Motor temp < 70°C
- `warning`: Motor temp 70-80°C
- `critical`: Motor temp > 80°C

**Cooling Status:**
- `idle`: Fan and pump both off
- `inefficient`: Delta T < 2°C (cooling but not effective)
- `active`: Delta T > 5°C (good cooling)

**Overall Status:**
- `error`: Water empty OR motor critical
- `warning`: Water low OR motor warning OR inefficient cooling
- `operational`: All systems normal
- `offline`: No active components
- `unknown`: Missing critical data

### **2. Voltage-to-State Conversion**

For Cirrus 12V logic:
- **> 6.0V = Active/ON**
- **≤ 6.0V = Inactive/OFF**

Applied to:
- `fan_active`: `fan_voltage > 6.0`
- `pump_active`: `pump_voltage > 6.0`
- `drain_active`: `drain_voltage > 6.0`
- `exhaust_active`: `exhaust_voltage > 6.0`
- `is_on`: `pump_voltage > 6.0` (pump indicates system is on)
- `is_cooling`: `pump_voltage > 6.0 OR drain_voltage > 6.0`

### **3. Delta T Calculation**

```
delta_t = ABS(ambient_temp - duct_temp)
```

Used to determine cooling efficiency:
- **> 5°C**: Excellent cooling
- **3-5°C**: Good cooling
- **1-3°C**: Fair cooling
- **< 1°C**: Poor/no cooling

### **4. Power Calculation**

If power not provided:
```
power = voltage × current
```

---

## Output Data (CIRRUS table)

### **Stored Fields:**

**Temperatures:**
- `ambient_temp` - Outside temperature
- `duct_temp` - Inside/duct temperature
- `motor_temp` - Motor temperature
- `delta_t` - Temperature difference

**States:**
- `fan_active` - Fan running
- `pump_active` - Pump running
- `drain_active` - Drain valve open
- `exhaust_active` - Exhaust damper open
- `is_cooling` - System actively cooling
- `is_on` - System powered on

**Water:**
- `has_water` - Water present
- `water_level` - Water level percentage

**Electrical:**
- `voltage` - Line voltage
- `current` - Current draw
- `power` - Power consumption

**Status:**
- `overall_status` - operational/warning/error/offline/unknown
- `motor_status` - normal/warning/critical
- `water_status` - ok/low/empty
- `cooling_status` - idle/active/inefficient

**Details:**
- `status_details` - JSON with additional calculated metrics

---

## Automatic Actions

### **1. Immediate Processing**
- Trigger fires immediately after `readings_raw` insert
- Data processed and inserted into `CIRRUS`
- Raw data deleted from `readings_raw` immediately after

### **2. Data Retention**
- Only 1 year of processed data kept in `CIRRUS` table
- Older data automatically deleted via cleanup function
- Run `auto_cleanup_cirrus_data()` daily

### **3. Duplicate Handling**
- Uses `ON CONFLICT (machine_id, timestamp)` to handle duplicates
- Updates existing record if same machine + timestamp

---

## Example Processing

### **Input (readings_raw):**
```json
{
  "machine_id": "uuid-here",
  "motor_temp": 45.5,
  "outside_temp": 28.0,
  "inside_temp": 22.0,
  "fan_voltage": 8.7,
  "pump_voltage": 9.2,
  "drain_voltage": 0.2,
  "exhaust_voltage": 0.1,
  "voltage": 230.0,
  "current": 2.5,
  "has_water": true,
  "water_level": 85.0
}
```

### **Output (CIRRUS):**
```json
{
  "machine_id": "uuid-here",
  "timestamp": "2025-01-08T12:00:00Z",
  "ambient_temp": 28.0,
  "duct_temp": 22.0,
  "motor_temp": 45.5,
  "delta_t": 6.0,
  "fan_active": true,
  "pump_active": true,
  "drain_active": false,
  "exhaust_active": false,
  "is_cooling": true,
  "is_on": true,
  "has_water": true,
  "water_level": 85.0,
  "voltage": 230.0,
  "current": 2.5,
  "power": 575.0,
  "overall_status": "operational",
  "motor_status": "normal",
  "water_status": "ok",
  "cooling_status": "active",
  "status_details": {
    "delta_t": 6.0,
    "cooling_efficiency": "excellent",
    "motor_temp_category": "normal",
    "operational_mode": "full_cooling"
  }
}
```

---

## Troubleshooting

### **Data not processing?**
1. Check machine `type` is 'evaporative'
2. Verify trigger exists: `trigger_process_cirrus_reading`
3. Check function exists: `process_cirrus_reading()`
4. Verify raw data has required fields

### **Raw data not deleting?**
1. Check if processing succeeded (check CIRRUS table)
2. Verify trigger is firing
3. Check for errors in Supabase logs

### **Status calculations wrong?**
1. Verify voltage readings are correct (12V logic)
2. Check temperature sensor readings
3. Verify water level/float switch data

---

## Key Points

✅ **Raw data is deleted immediately after processing**  
✅ **Only processed data is kept (1 year retention)**  
✅ **Status calculated automatically from sensor readings**  
✅ **12V logic: >6V = Active**  
✅ **Delta T determines cooling efficiency**


