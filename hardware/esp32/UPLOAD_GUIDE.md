# 🚀 ESP32 Upload Guide - Quick Start

**New File:** `ESP32_HVAC_CoolBreezeNexus_V2.ino`  
**Status:** Production-ready, dashboard compatible ✅

---

## ⚡ **QUICK START (5 Steps)**

### **Step 1: Arduino IDE Setup** (2 min)
1. Open Arduino IDE
2. Open: `ESP32_HVAC_CoolBreezeNexus_V2.ino`
3. Select Board: **ESP32 Dev Module**
4. Select Port: Your COM port
5. Set Upload Speed: **115200**

### **Step 2: Upload Firmware** (2 min)
1. Click **Upload** button (→)
2. Wait for compilation
3. Wait for upload (progress bar)
4. See "Done uploading" ✅

### **Step 3: First Boot - WiFiManager** (3 min)
ESP32 will create WiFi access point:

1. **Connect phone/laptop to WiFi:** `ESP32_HVAC_Setup`
2. **Browser opens automatically** (or go to `192.168.4.1`)
3. **Fill in form:**
   - **SSID:** Your WiFi name (2.4GHz only!)
   - **Password:** Your WiFi password
   - **Supabase URL:** `https://wjyanxstvbiqefmgpccb.supabase.co`
   - **Supabase Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqeWFueHN0dmJpcWVmbWdwY2NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMzI4NDUsImV4cCI6MjA3NzgwODg0NX0.r1xQG8HYHioH8_ALGQTRO2wM5F2tAOhM-xe_eh3VxhY`
   - **Machine UUID:** [Get from dashboard - see Step 4]
   - **Machine API Key:** [Generate from dashboard - see Step 4]
4. **Click Save**
5. ESP32 reboots and connects automatically

### **Step 4: Dashboard Setup** (2 min)

**A. Create Machine:**
1. Go to http://localhost:8080 (or iotnexus.site after deployment)
2. Login as Super Admin
3. Click "Add Machine"
4. Fill in:
   - **Name:** "R32 Demo Evaporative Cooler"
   - **Type:** "Evaporative Cooler"
   - **Owner:** Select a client
5. Click "Create"
6. **COPY MACHINE UUID** from URL or machine detail

**B. Generate API Key:**
1. Right sidebar → "ESP32 API Key Management"
2. Click "Generate New API Key"
3. (Optional) Description: "R32 Demo Device"
4. **COPY KEY IMMEDIATELY** (can't view again!)
5. Format: `sk_live_...` (long string)

**C. Go Back to Step 3** if you haven't configured WiFi yet

### **Step 5: Test & Verify** (3 min)
1. Open Serial Monitor (115200 baud)
2. Watch for:
   ```
   ✓ WiFi connected!
   ✓ Data sent successfully!
   ```
3. Check dashboard - machine should show:
   - ✅ Connected
   - ✅ Temperature readings
   - ✅ Current reading
   - ✅ Delta T
   - ✅ Tank status

---

## 📊 **What Changed From Your Old Code**

### **✅ Fixed:**
1. ✅ JSON field names match dashboard (`motor_temp` not `temp_machine`)
2. ✅ Removed custom `state_inputs` array
3. ✅ Added machine API key authentication
4. ✅ Added smart `overall_status` logic (good/warning/error)
5. ✅ Added evaporative cooler specific fields
6. ✅ Fixed `delta_t` to always be positive
7. ✅ Changed `water_level` to `has_water` (boolean)
8. ✅ Changed `derived_state` to `is_on` (boolean)

### **✅ Added:**
1. ✅ `determineOverallStatus()` function - detects errors automatically
2. ✅ `exhaust_active`, `pump_active`, `drain_active` fields
3. ✅ `fan_speed` field (0-100%)
4. ✅ Diagnostic voltages for debugging
5. ✅ Better error messages (401, 404, 422)
6. ✅ Machine API Key configuration in WiFiManager

---

## 🔍 **Serial Monitor Output**

### **Normal Operation:**
```
========================================
  ESP32 R32 - Cool Breeze Nexus
  Firmware: 2.1.0
========================================

✓ WiFi connected!
  IP: 192.168.1.123
  
POST to Supabase:
  URL: https://...
  Machine ID: 550e8400-e29b-41d4-a716-446655440000
  Status: good
  HTTP Code: 201  (took 0.8 seconds)
  ✓ Success!
```

### **If You See Errors:**

**Error 401 (Unauthorized):**
```
✗ Error:
  HTTP Code: 401
  → Check Machine API Key - may be invalid or expired
```
**Solution:** Generate new API key in dashboard, update ESP32 config

**Error 404 (Not Found):**
```
✗ Error:
  HTTP Code: 404
  → Check Machine UUID - may not exist in database
```
**Solution:** Verify machine UUID in dashboard, update ESP32 config

**Error 422 (Invalid Data):**
```
✗ Error:
  HTTP Code: 422
  → Invalid JSON format or missing required fields
```
**Solution:** Check Serial Monitor for full error message, may be a code issue

---

## 🎯 **Testing Checklist**

### **Basic Connectivity:**
- [ ] Serial Monitor shows "✓ WiFi connected!"
- [ ] IP address displayed
- [ ] HTTP Code: 201 or 200
- [ ] "✓ Success!" message

### **Dashboard Display:**
- [ ] Machine shows "Connected" (green)
- [ ] Motor temp displays (e.g., 45.5°C)
- [ ] Outside temp displays
- [ ] Inside temp displays
- [ ] Current displays (when fan running)
- [ ] Delta T calculates correctly
- [ ] Tank status shows (Full/Empty)
- [ ] Overall status: Good/Warning/Error

### **Evaporative Cooler Features:**
- [ ] Fan speed shows (0-100%)
- [ ] Pump status updates
- [ ] Exhaust status updates
- [ ] Drain status updates

---

## ⚙️ **Configuration Reference**

### **WiFiManager Portal Fields:**

| Field | Value | Where to Get |
|-------|-------|--------------|
| **SSID** | Your WiFi name | Your router (2.4GHz only!) |
| **Password** | Your WiFi password | Your router |
| **Supabase URL** | `https://wjyanxstvbiqefmgpccb.supabase.co` | Fixed (copy exactly) |
| **Supabase Anon Key** | `eyJhbGci...` | Fixed (see above, copy all) |
| **Machine UUID** | `550e8400-...` | Dashboard → Machine detail |
| **Machine API Key** | `sk_live_...` | Dashboard → API Key Management |

---

## 🚨 **Common Issues & Solutions**

### **Issue 1: Can't Connect to ESP32_HVAC_Setup**
- Make sure ESP32 is powered on
- Look for WiFi network `ESP32_HVAC_Setup`
- Try restarting ESP32 (press reset button)
- ESP32 only broadcasts for 3 minutes - may timeout

### **Issue 2: WiFi won't connect (after config)**
- ESP32 only supports 2.4GHz WiFi (NOT 5GHz!)
- Check SSID/password are correct
- Check WiFi signal strength
- Try mobile hotspot as test

### **Issue 3: HTTP 401 Unauthorized**
- API key is wrong or expired
- Generate new key in dashboard
- Reconfigure ESP32 (hold button to enter config mode)

### **Issue 4: HTTP 404 Not Found**
- Machine UUID doesn't exist
- Create machine in dashboard first
- Copy exact UUID (with hyphens)

### **Issue 5: No data in dashboard**
- Check Serial Monitor for errors
- Verify HTTP Code is 201 or 200
- Wait 60 seconds for first transmission
- Check machine is assigned to correct owner

---

## 🔄 **How to Reconfigure ESP32**

If you need to change WiFi or Supabase settings:

### **Method 1: Clear Config (Reset Button)**
1. Power off ESP32
2. Hold "BOOT" button
3. Power on while holding
4. Release after 3 seconds
5. ESP32 will start config portal

### **Method 2: Clear via Code**
Add this to `setup()` (temporary):
```cpp
preferences.begin("iot-nexus", false);
preferences.clear();
preferences.end();
wifiManager.resetSettings();
```
Upload, then remove these lines and upload again.

---

## 📈 **Performance Stats**

**Normal Operation:**
- Sensor readings: Every 1 second
- Data transmission: Every 60 seconds
- WiFi ON time: ~2-5 seconds per transmission
- Power consumption: Low (WiFi off 95% of time)
- Memory usage: ~50KB RAM
- Flash usage: ~800KB

**Reliability:**
- Watchdog timer: 10 seconds
- Daily reset: Automatic (prevents memory leaks)
- 6-month full reset: Automatic
- Connection timeout: 30 seconds
- POST timeout: 60 seconds

---

## ✅ **Success Criteria**

Your ESP32 is working correctly when:
1. ✅ Serial Monitor shows "✓ Success!" every 60 seconds
2. ✅ Dashboard machine is "Connected" (green dot)
3. ✅ Temperature values update in dashboard
4. ✅ Current reading shows when fan is running
5. ✅ Overall status shows correct state (good/warning/error)

---

## 🎉 **You're Ready for Demo!**

Once you see "✓ Success!" in Serial Monitor and data in dashboard:
- ESP32 is fully integrated ✅
- Real sensor data is flowing ✅
- Dashboard displays correctly ✅
- Ready to show live demo! ✅

---

**Need help?** Check `CODE_ANALYSIS_AND_FIXES.md` for detailed technical info!

