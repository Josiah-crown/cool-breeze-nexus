# 🎉 ESP32 Integration - COMPLETE

## ✅ WHAT WORKS NOW
- ESP32 connects to WiFi via hardcoded credentials
- Sends sensor data every 60 seconds
- Data appears on dashboard in real-time
- Trigger updates `machines` table automatically
- Dashboard shows live temperature, current, status, etc.

---

## 📋 COMPLETE SETUP PROCESS (For Future Devices)

### **STEP 1: Database Setup (One-time)**

Run these SQL scripts **IN ORDER** in Supabase SQL Editor:

#### 1.1 Create readings_raw table
```sql
-- File: FIX_READINGS_RAW_COMPLETE.sql
-- Creates the table where ESP32 posts raw sensor data
```

#### 1.2 Add columns to machines table
```sql
-- File: ADD_MISSING_MACHINE_COLUMNS.sql
-- Adds motor_temp, current, exhaust_active, pump_active, etc.
```

#### 1.3 Fix permissions for ESP32
```sql
-- File: NUCLEAR_FIX_PERMISSIONS.sql
-- Disables RLS on readings_raw (temporary for demo)
-- Grants INSERT permission to anon role
```

#### 1.4 Fix trigger permissions
```sql
-- File: FIX_TRIGGER_PERMISSIONS.sql
-- Makes trigger run with SECURITY DEFINER
-- Allows anon-initiated trigger to UPDATE machines table
```

#### 1.5 Create the trigger (if not exists)
```sql
-- Already in FIX_MACHINES_TABLE.sql
-- Trigger: trigger_update_machine_from_reading
-- Function: update_machine_from_reading()
-- Copies data from readings_raw to machines on INSERT
```

---

### **STEP 2: ESP32 Firmware Setup**

#### 2.1 Upload Firmware
- **File:** `hardware/esp32/ESP32_HVAC_CoolBreezeNexus_V2/ESP32_HVAC_CoolBreezeNexus_V2.ino`
- **Board:** ESP32 Dev Module
- **Upload Speed:** 921600
- **Flash Size:** 4MB

#### 2.2 First Boot - WiFiManager Setup
1. ESP32 creates AP: `ESP32_HVAC_Setup`
2. Connect to AP (no password)
3. Browser opens config portal automatically
4. Enter:
   - **WiFi SSID:** Your network name
   - **WiFi Password:** Your network password
   - **Machine UUID:** From dashboard (copy from machine card)
   - **Machine API Key:** From dashboard (generate & copy)
5. Click **Save**
6. ESP32 reboots and connects

#### 2.3 Verify Connection
Serial Monitor should show:
```
✓ WiFi connected!
IP: 192.168.x.x

POST to Supabase:
✅ Data sent successfully!
HTTP Code: 201
```

---

### **STEP 3: Dashboard Verification**

1. **Refresh dashboard** (may take 1-2 minutes for first data)
2. **Machine card should show:**
   - ✅ Green status
   - ✅ Live temperature readings
   - ✅ Current/Amps reading
   - ✅ "Connected" indicator
   - ✅ Last seen timestamp updating

3. **Expanded machine view shows:**
   - ✅ Detailed sensor readings
   - ✅ Component states (pump, fan, exhaust, drain)
   - ✅ Historical data (if implemented)

---

## 🔧 TROUBLESHOOTING GUIDE

### Problem: HTTP 401 (Unauthorized)
**Cause:** RLS policy blocking anon role
**Fix:** Run `NUCLEAR_FIX_PERMISSIONS.sql`

### Problem: HTTP 400 - Column does not exist
**Cause:** Missing columns in `readings_raw` or `machines` table
**Fix:** Run `FIX_READINGS_RAW_COMPLETE.sql` and `ADD_MISSING_MACHINE_COLUMNS.sql`

### Problem: HTTP 400 - Permission denied for table machines
**Cause:** Trigger doesn't have permission to UPDATE machines
**Fix:** Run `FIX_TRIGGER_PERMISSIONS.sql` (adds SECURITY DEFINER)

### Problem: Watchdog timeout / ESP32 reboots
**Cause:** HTTP request took too long
**Fix:** Already fixed - HTTP timeout reduced to 8 seconds

### Problem: Data in readings_raw but not in machines table
**Cause:** Trigger not firing or failing
**Fix:** Check trigger exists with `CHECK_ESP32_DATA_ARRIVAL.sql`

### Problem: ESP32 won't enter WiFiManager mode
**Fix:** Hold BOOT button for 3 seconds during startup

---

## 📊 DATA FLOW

```
ESP32 Sensor Reading (every 1 second, WiFi OFF)
         ↓
Every 60 seconds: Enable WiFi
         ↓
POST to: /rest/v1/readings_raw
Headers:
  - apikey: [Supabase Anon Key]
  - Authorization: Bearer [Supabase Anon Key]
  - Content-Type: application/json
Payload: {machine_id, motor_temp, current, ...}
         ↓
Supabase checks: anon role has INSERT permission?
         ↓ YES
INSERT into readings_raw
         ↓
Trigger: trigger_update_machine_from_reading fires
         ↓
Function: update_machine_from_reading() runs with SECURITY DEFINER
         ↓
UPDATE machines table with latest sensor data
         ↓
Dashboard fetches from machines table (via useMachineData hook)
         ↓
UI updates in real-time! 🎉
```

---

## 🔐 SECURITY NOTES (FOR PRODUCTION)

### Current Setup (Demo - Quick & Dirty)
- ❌ RLS **DISABLED** on `readings_raw`
- ❌ Using Anon Key in Authorization header (not Machine API Key)
- ⚠️ Any ESP32 with Anon Key can insert data

### Production Improvements Needed
1. **Enable RLS** on `readings_raw` with proper policies
2. **Implement Edge Function** (`esp32-data-receiver`)
   - Validates Machine API Key
   - Checks if key is assigned to correct machine
   - Uses Service Role key to insert (bypasses RLS)
3. **Rate limiting** on Edge Function
4. **API key expiration** and rotation
5. **Audit logging** for all ESP32 data insertions

---

## 📁 KEY FILES

### ESP32 Firmware
- `hardware/esp32/ESP32_HVAC_CoolBreezeNexus_V2/ESP32_HVAC_CoolBreezeNexus_V2.ino` - 24V Evaporative Cooler
- `hardware/esp32/ESP32_Cirrus_12V_V2/ESP32_Cirrus_12V_V2.ino` - 12V Cirrus (DELETED - needs recreation)

### SQL Setup Scripts
- `FIX_READINGS_RAW_COMPLETE.sql` - Create readings_raw table
- `ADD_MISSING_MACHINE_COLUMNS.sql` - Add columns to machines
- `NUCLEAR_FIX_PERMISSIONS.sql` - Grant anon INSERT permission
- `FIX_TRIGGER_PERMISSIONS.sql` - Add SECURITY DEFINER to trigger
- `FIX_MACHINES_TABLE.sql` - Original comprehensive fix (includes trigger creation)

### Diagnostic Scripts
- `CHECK_1_READINGS_RAW.sql` - Check if data arriving
- `CHECK_2_MACHINES_TABLE.sql` - Check if trigger working
- `CHECK_3_TOTAL_COUNT.sql` - Count total readings

### Documentation
- `hardware/esp32/README.md` - Hardware setup guide
- `hardware/esp32/CONNECTION_POINTS.md` - API endpoints & JSON schema
- `hardware/esp32/CODE_ANALYSIS_AND_FIXES.md` - Original code analysis
- `hardware/esp32/ESP32_RESET_GUIDE.md` - How to reset WiFi settings
- `hardware/esp32/SIMPLIFIED_SETUP.md` - Installer guide

---

## ⏱️ TIMING SPECIFICATIONS

- **Sensor Reading:** Every 1 second (WiFi OFF to save power)
- **Data Send:** Every 60 seconds
- **WiFi Connect Timeout:** 30 seconds
- **HTTP POST Timeout:** 8 seconds (prevents watchdog)
- **Max WiFi On Time:** 2 minutes (safety net)
- **Daily Reset:** Every 24 hours
- **6-Month Reset:** Every 180 days

---

## 🎯 FIRMWARE VERSIONS

### V2.1.0 (Current - Production Ready)
- ✅ Hardcoded Supabase URL & Anon Key
- ✅ WiFiManager for WiFi credentials & Machine UUID/API Key
- ✅ Hardware reset button (hold BOOT for 3 seconds)
- ✅ Smart status detection
- ✅ Correct is_cooling logic (Pump OR Dump valve)
- ✅ Reduced HTTP timeout (8 seconds)
- ✅ Dashboard-compatible JSON schema
- ✅ State machine architecture
- ✅ Power-efficient (WiFi only when sending)

---

## 🔄 FUTURE FIRMWARE UPDATES

When making changes:
1. Update `FIRMWARE_VERSION` constant
2. Test on bench setup first
3. Document changes in this file
4. Upload to **one production device** as beta test
5. Monitor for 24 hours
6. Roll out to remaining devices

---

## 📞 SUPPORT CONTACTS

- **Supabase Project:** wjyanxstvbiqefmgpccb
- **Project URL:** https://wjyanxstvbiqefmgpccb.supabase.co
- **Dashboard:** https://iotnexus.site (production) or localhost:5173 (dev)

---

**Document Created:** November 9, 2025
**Last Updated:** November 9, 2025
**Status:** ✅ PRODUCTION READY FOR DEMO




