# Supabase Data Flow Guide

**Last Updated:** November 17, 2025

## Overview

This guide explains how data flows through the Supabase system, from ESP32 devices to the website display.

---

## Data Flow Architecture

```
ESP32 Device
    ↓
Edge Function (esp32-data-receiver)
    ↓
readings_raw table (temporary storage)
    ↓
Database Trigger (process_cirrus_reading or process_coolbreeze_reading)
    ↓
Processing Table (cirrus or coolbreeze)
    ↓
machines table (current status display)
    ↓
Website Frontend
```

---

## Step-by-Step Data Flow

### 1. ESP32 Sends Data
- ESP32 device reads sensors every 2 minutes
- Sends **RAW** sensor data to Supabase Edge Function
- Data includes: temperatures, current, voltage, water status, voltage inputs

### 2. Edge Function Receives Data
- **File:** `supabase/functions/esp32-data-receiver/index.ts`
- Validates API key
- Checks rate limiting (2-minute minimum)
- Inserts data into `readings_raw` table

### 3. Database Trigger Processes Data
- **Trigger:** `trigger_process_cirrus_reading` or `trigger_process_coolbreeze_reading`
- Automatically fires when data is inserted into `readings_raw`
- Determines which processing table to use based on machine type/manufacturer:
  - **Cirrus** machines → `cirrus` table
  - **CoolBreeze** machines → `coolbreeze` table
- Calculates:
  - Delta T (temperature difference)
  - Operational states (fan on, pump on, etc.)
  - Status indicators (operational, warning, error)
  - Parameter compliance flags

### 4. Raw Data Deleted
- **Immediately after processing**, the raw data is deleted from `readings_raw`
- This is why `readings_raw` appears empty - it's working as designed!
- Raw data is only kept temporarily during processing

### 5. Processed Data Stored
- Processed data is stored in `cirrus` or `coolbreeze` tables
- These tables contain:
  - Historical data (last 1 year)
  - Calculated status values
  - Operational states
  - All sensor readings with timestamps

### 6. Machines Table Updated
- The `machines` table shows **current status** for website display
- Updated by function `update_machines_from_latest_readings()`
- If machine is **disconnected** (no reading in last 15 minutes):
  - All readings set to **0**
  - `is_connected` = `false`
  - `overall_status` = `'offline'`

### 7. Website Displays Data
- Frontend queries `machines` table for current status
- Frontend queries `cirrus`/`coolbreeze` tables for historical charts
- Connection status based on last reading within **15 minutes**

---

## Why is `readings_raw` Empty?

**This is expected behavior!**

The `readings_raw` table is designed to be a **temporary staging area**:
1. ESP32 sends data → inserted into `readings_raw`
2. Database trigger immediately processes it
3. Processed data goes to `cirrus` or `coolbreeze` table
4. Raw data is **deleted immediately** after successful processing

**You should see data in:**
- ✅ `cirrus` table (for Cirrus machines)
- ✅ `coolbreeze` table (for CoolBreeze machines)
- ✅ `machines` table (current status)

**You should NOT see data in:**
- ❌ `readings_raw` table (empty is correct - data is processed and deleted)

---

## Connection Status

### How It Works
- Machine is **connected** if last reading was within **15 minutes**
- Machine is **disconnected** if no reading in last **15 minutes**

### When Disconnected
- All sensor readings set to **0**:
  - `motor_temp` = 0
  - `outside_temp` = 0
  - `inside_temp` = 0
  - `delta_t` = 0
  - `current` = 0
  - `voltage` = 0
  - `power` = 0
- `is_connected` = `false`
- `overall_status` = `'offline'`
- `is_on` = `false`
- `is_cooling` = `false`
- `fan_active` = `false`
- `has_water` = `false`

### Updating Connection Status
Run this function to update all machines:
```sql
SELECT public.update_machines_from_latest_readings();
```

Or set up a scheduled job to run it every minute (recommended).

---

## Tables Overview

### `readings_raw`
- **Purpose:** Temporary staging for raw sensor data
- **Lifespan:** Data deleted immediately after processing
- **Expected State:** Usually empty (this is correct!)

### `cirrus`
- **Purpose:** Processed historical data for Cirrus machines
- **Lifespan:** 1 year (auto-cleanup)
- **Contains:** All calculated values, status indicators, timestamps

### `coolbreeze`
- **Purpose:** Processed historical data for CoolBreeze machines
- **Lifespan:** 1 year (auto-cleanup)
- **Contains:** All calculated values, status indicators, timestamps

### `machines`
- **Purpose:** Current status display for website
- **Updated:** From latest reading in processing tables
- **Contains:** Current sensor values, connection status, operational states

---

## Troubleshooting

### "readings_raw is empty - is data being received?"
**Answer:** Yes! This is expected. Data is processed and deleted immediately.

### "How do I check if data is being received?"
1. Check `cirrus` or `coolbreeze` tables - they should have recent data
2. Check Edge Function logs for insert errors
3. Check `machines` table - `is_connected` should be `true` if receiving data

### "Machine shows old readings after disconnecting"
**Solution:** Run `update_machines_from_latest_readings()` function. This will:
- Check if machine is connected (last reading within 15 minutes)
- If disconnected, set all readings to 0
- If connected, update with latest readings

### "Connection status not updating"
**Solution:** 
1. Check that `update_machines_from_latest_readings()` is being called
2. Verify timeout is set to 15 minutes (not 10)
3. Check that processing tables (`cirrus`/`coolbreeze`) have recent data

---

## Key Functions

### `process_cirrus_reading()`
- Trigger function for Cirrus machines
- Processes raw data into `cirrus` table
- Deletes raw data after processing

### `process_coolbreeze_reading()`
- Trigger function for CoolBreeze machines
- Processes raw data into `coolbreeze` table
- Deletes raw data after processing

### `update_machines_from_latest_readings()`
- Updates `machines` table with latest readings
- Sets readings to 0 if disconnected
- Should be called regularly (every minute recommended)

### `calculate_machine_connection_status()`
- Calculates if machine is connected
- Uses 15-minute timeout
- Checks both `cirrus` and `coolbreeze` tables

---

## Data Retention

- **Raw Data:** Deleted immediately after processing
- **Processed Data:** Kept for 1 year, then auto-deleted
- **Machines Table:** Always shows current status (no historical data)

---

## Summary

1. ✅ ESP32 sends raw data → `readings_raw` (temporary)
2. ✅ Trigger processes data → `cirrus`/`coolbreeze` (permanent, 1 year)
3. ✅ Raw data deleted immediately
4. ✅ `machines` table updated with latest readings
5. ✅ If disconnected > 15 minutes, readings set to 0
6. ✅ Website displays from `machines` table (current) and processing tables (historical)

**Empty `readings_raw` table = System working correctly!** 🎉

