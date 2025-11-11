# 🔍 ESP32 Code Analysis & Required Changes

**File:** `ESP32_HVAC_Enhanced (1).ino`  
**Current Status:** ✅ Working code for Evaporative Cooler  
**Target:** Integrate with Cool Breeze Nexus Dashboard

---

## 📊 **ANALYSIS SUMMARY**

### **✅ What's Already Perfect:**
1. ✅ WiFiManager for easy setup - Great UX!
2. ✅ Robust state machine (WiFi ON/OFF cycling)
3. ✅ 1-minute averaging (60 samples)
4. ✅ Comprehensive sensor reading (temps, CT, pickups, float)
5. ✅ Watchdog timer for reliability
6. ✅ Daily/6-month reset mechanisms
7. ✅ Debug mode for troubleshooting
8. ✅ Endpoint: `/rest/v1/readings_raw` - Correct!

### **⚠️ What Needs Changing:**
1. ⚠️ JSON field names don't match database schema
2. ⚠️ Missing required fields for dashboard
3. ⚠️ Authorization header uses anon key (should use machine API key)
4. ⚠️ Custom `state_inputs` array (dashboard doesn't expect this)
5. ⚠️ Some field data types don't match (water_level: number vs has_water: boolean)

---

## 🔧 **REQUIRED CHANGES (Line-by-Line)**

### **CHANGE #1: JSON Field Names (Lines 910-919)**

**❌ CURRENT:**
```cpp
doc["temp_inside"] = tInterior;
doc["temp_outside"] = tExterior;
doc["temp_machine"] = tMotor;
doc["ct_current"] = ctCurrent;
doc["water_level"] = tankFull ? 100.0 : 0.0;
doc["derived_state"] = (bStatus == "ON") ? "on" : "off";
doc["delta_t"] = tExterior - tInterior;
```

**✅ SHOULD BE:**
```cpp
// Core temperature fields (REQUIRED)
doc["motor_temp"] = tMotor;           // Changed from temp_machine
doc["outside_temp"] = tExterior;      // Changed from temp_outside
doc["inside_temp"] = tInterior;       // Changed from temp_inside

// Electrical fields (REQUIRED)
doc["current"] = ctCurrent;           // Changed from ct_current
doc["voltage"] = LINE_VOLTAGE;        // NEW - add voltage (230V)
doc["power"] = appPower;              // NEW - add power (was missing)

// State fields (REQUIRED)
doc["is_on"] = (bStatus == "ON");     // Changed from derived_state, now boolean
doc["fan_active"] = (gStatus == "ON"); // NEW - fan status
doc["overall_status"] = "good";       // NEW - overall machine status
doc["delta_t"] = abs(tExterior - tInterior); // Keep, add abs()

// Evaporative Cooler specific (OPTIONAL but recommended)
// Cooling cycle: Dump valve → Pump → Fan
// If pump OR dump valve active = cooling cycle happening
doc["is_cooling"] = (bStatus == "ON" || blStatus == "ON"); // NEW - cooling mode
doc["has_water"] = tankFull;          // Changed from water_level, now boolean
doc["is_connected"] = true;           // NEW - connectivity status
```

---

### **CHANGE #2: Remove state_inputs Array (Lines 922-947)**

**❌ REMOVE THIS ENTIRE SECTION:**
```cpp
// State inputs array
JsonArray inputs = doc.createNestedArray("state_inputs");

JsonObject p1 = inputs.createNestedObject();
p1["input"] = 1;
p1["label"] = "exhaust";
// ... etc
```

**✅ REPLACE WITH:** Nothing - dashboard doesn't use this array

**Why?** The `state_inputs` array is custom and not part of the dashboard schema. The dashboard gets all the info it needs from the main fields.

**Alternative (Optional):** If you want to keep this data for debugging, store it in a separate logging table, but don't send it to `readings_raw`.

---

### **CHANGE #3: Authorization Header (Line 960)**

**❌ CURRENT:**
```cpp
http.addHeader("Authorization", "Bearer " + supabaseAnonKey);
```

**✅ SHOULD BE:**
```cpp
http.addHeader("Authorization", "Bearer " + machineAPIKey);
```

**Plus, add new variable at top (line 133):**
```cpp
String supabaseUrl = "";
String supabaseAnonKey = "";
String machineUUID = "";
String machineAPIKey = "";  // NEW - separate API key for machine auth
```

**Update WiFiManager parameter (line 288):**
```cpp
WiFiManagerParameter customMachineUUID("machine_uuid", "Machine UUID", "", 40);
WiFiManagerParameter customMachineAPIKey("api_key", "Machine API Key", "", 100); // NEW
```

**Update config save (line 1040):**
```cpp
machineAPIKey = wifiManager.server->arg("api_key");
preferences.putString("api_key", machineAPIKey);
```

**Update config load (line 301):**
```cpp
machineAPIKey = preferences.getString("api_key", "");
```

**Why?** The `supabaseAnonKey` is public and doesn't authenticate the machine. You need a separate machine-specific API key generated from the dashboard.

---

### **CHANGE #4: Add Missing Optional Fields (After line 919)**

**✅ ADD THESE EVAPORATIVE COOLER SPECIFIC FIELDS:**
```cpp
// Evaporative cooler control states (mapped from pickups)
doc["exhaust_active"] = (yStatus == "ON");  // Yellow pickup - exhaust valve
doc["pump_active"] = (bStatus == "ON");      // Brown pickup - water pump
doc["drain_active"] = (blStatus == "ON");    // Black pickup - drain valve
doc["fan_speed"] = fanSpeed;                 // Fan speed percentage (0-100)

// Diagnostic voltages (optional, for debugging)
doc["exhaust_voltage"] = yVolt;
doc["fan_voltage"] = gVolt;
doc["pump_voltage"] = bVolt;
doc["drain_voltage"] = blVolt;
```

**Why?** These give the dashboard more detail about the evaporative cooler's operation.

---

### **CHANGE #5: Fix Delta T Calculation (Line 919)**

**❌ CURRENT:**
```cpp
doc["delta_t"] = tExterior - tInterior;  // Can be negative
```

**✅ SHOULD BE:**
```cpp
doc["delta_t"] = abs(tExterior - tInterior);  // Always positive
```

**Why?** Dashboard displays delta T as efficiency metric - should always be positive.

---

## 📋 **COMPLETE CORRECTED sendToSupabase() FUNCTION**

Here's the full corrected version (lines 892-990):

```cpp
bool sendToSupabase(float tMotor, float tExterior, float tInterior,
                    float ctCurrent, float ctVoltage, float appPower,
                    float yVolt, float gVolt, float bVolt, float blVolt,
                    bool tankFull,
                    String yStatus, String gStatus, String bStatus, String blStatus,
                    int fanSpeed) {
  
  if(WiFi.status() != WL_CONNECTED) {
    Serial.println("✗ WiFi not connected");
    return false;
  }
  
  HTTPClient http;
  http.setTimeout(HTTP_POST_TIMEOUT);
  
  String endpoint = supabaseUrl + "/rest/v1/readings_raw";
  
  // Build JSON payload - DASHBOARD COMPATIBLE
  StaticJsonDocument<1024> doc;
  
  // Required fields
  doc["machine_id"] = machineUUID;
  doc["motor_temp"] = tMotor;
  doc["outside_temp"] = tExterior;
  doc["inside_temp"] = tInterior;
  doc["current"] = ctCurrent;
  doc["voltage"] = LINE_VOLTAGE;  // 230V constant
  doc["power"] = appPower;
  doc["delta_t"] = abs(tExterior - tInterior);
  doc["is_on"] = (bStatus == "ON");  // Pump running = cooler ON
  doc["fan_active"] = (gStatus == "ON");
  doc["overall_status"] = "good";  // TODO: Add logic for warnings/errors
  doc["is_connected"] = true;
  
  // Evaporative cooler specific
  doc["is_cooling"] = (bStatus == "ON" && gStatus == "ON");
  doc["has_water"] = tankFull;
  doc["exhaust_active"] = (yStatus == "ON");
  doc["pump_active"] = (bStatus == "ON");
  doc["drain_active"] = (blStatus == "ON");
  doc["fan_speed"] = fanSpeed;
  
  // Optional diagnostic voltages
  doc["exhaust_voltage"] = yVolt;
  doc["fan_voltage"] = gVolt;
  doc["pump_voltage"] = bVolt;
  doc["drain_voltage"] = blVolt;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  Serial.println("\nPOST to Supabase:");
  Serial.println("  URL: " + endpoint);
  Serial.println("  Payload: " + jsonString);
  
  // Send HTTP POST with correct authentication
  http.begin(endpoint);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabaseAnonKey);  // Public key
  http.addHeader("Authorization", "Bearer " + machineAPIKey);  // MACHINE KEY
  http.addHeader("Prefer", "return=minimal");
  
  unsigned long postStart = millis();
  int httpCode = http.POST(jsonString);
  unsigned long postDuration = millis() - postStart;
  
  Serial.print("  HTTP Code: ");
  Serial.print(httpCode);
  Serial.print("  (took ");
  Serial.print(postDuration / 1000.0, 1);
  Serial.println(" seconds)");
  
  bool success = false;
  
  if(httpCode == 201 || httpCode == 200) {
    success = true;
    Serial.println("  ✓ Success!");
  } else {
    Serial.println("  ✗ Error: " + http.getString());
  }
  
  http.end();
  
  // Safety check: Disconnect if POST took too long
  if(postDuration > HTTP_POST_TIMEOUT) {
    Serial.println("⚠ POST took longer than expected - forcing disconnect");
  }
  
  return success;
}
```

---

## 🔐 **AUTHENTICATION SETUP PROCESS**

### **Step 1: Generate Machine API Key (Dashboard)**
1. Go to http://iotnexus.site (after deployment)
2. Login as Super Admin
3. Right sidebar → "ESP32 API Key Management"
4. Click "Generate New API Key"
5. **COPY IT IMMEDIATELY** (can't view again!)
6. Example: `sk_live_placeholder_only_do_not_use`

### **Step 2: Get Machine UUID (Dashboard)**
1. In dashboard, create new machine
2. Name: "R32 Evaporative Cooler Demo"
3. Type: "evaporative_cooler"
4. Owner: Assign to a client
5. Copy machine UUID from URL or detail view
6. Example: `550e8400-e29b-41d4-a716-446655440000`

### **Step 3: Configure ESP32 (WiFiManager Portal)**
When ESP32 boots for first time:
1. Connect to WiFi network: `ESP32_HVAC_Setup`
2. Navigate to: `192.168.4.1`
3. Fill in form:
   - **SSID:** Your WiFi network
   - **Password:** Your WiFi password
   - **Supabase URL:** `https://wjyanxstvbiqefmgpccb.supabase.co`
   - **Supabase Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqeWFueHN0dmJpcWVmbWdwY2NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMzI4NDUsImV4cCI6MjA3NzgwODg0NX0.r1xQG8HYHioH8_ALGQTRO2wM5F2tAOhM-xe_eh3VxhY`
   - **Machine UUID:** [from Step 2]
   - **Machine API Key:** [from Step 1]
4. Click "Save"
5. ESP32 reboots and connects automatically

---

## 📊 **DATABASE FIELD MAPPING**

| ESP32 Sensor | Variable | JSON Field | Database Column | Type | Note |
|-------------|----------|------------|-----------------|------|------|
| Motor Temp | `tMotor` | `motor_temp` | `motor_temp` | float | ✅ Required |
| Outside Temp | `tExterior` | `outside_temp` | `outside_temp` | float | ✅ Required |
| Inside Temp | `tInterior` | `inside_temp` | `inside_temp` | float | ✅ Required |
| CT Current | `ctCurrent` | `current` | `current` | float | ✅ Required |
| Constant | `LINE_VOLTAGE` | `voltage` | `voltage` | float | ✅ Required (230V) |
| Calculated | `appPower` | `power` | `power` | float | ✅ Required |
| Calculated | `abs(tExterior - tInterior)` | `delta_t` | `delta_t` | float | ✅ Required |
| Pump Status | `bStatus == "ON"` | `is_on` | `is_on` | boolean | ✅ Required |
| Fan Status | `gStatus == "ON"` | `fan_active` | `fan_active` | boolean | ✅ Required |
| Float Switch | `tankFull` | `has_water` | `has_water` | boolean | ⭕ Evap specific |
| Fan Speed | `fanSpeed` | `fan_speed` | N/A | int | ⭕ Display only |
| Exhaust | `yStatus == "ON"` | `exhaust_active` | N/A | boolean | ⭕ Debug |
| Drain | `blStatus == "ON"` | `drain_active` | N/A | boolean | ⭕ Debug |

---

## ⚠️ **POTENTIAL ISSUES & SOLUTIONS**

### **Issue #1: Missing Timestamp**
**Current:** Line 912 has `doc["timestamp"] = getISOTimestamp();`  
**Problem:** Dashboard doesn't use this field (Supabase auto-generates `created_at`)  
**Solution:** Remove it or keep it for debugging (won't hurt)

### **Issue #2: overall_status Logic**
**Current:** Hardcoded as `"good"`  
**Recommendation:** Add logic based on sensor readings:

```cpp
String determineOverallStatus(float tMotor, float ctCurrent, bool tankFull, 
                              String yStatus, String gStatus, String bStatus) {
  // Critical errors
  if(tMotor > 70.0) return "error";  // Motor overheating
  if(gStatus == "ON" && ctCurrent < 0.5) return "error";  // Fan on but no current
  if(bStatus == "ON" && !tankFull) return "error";  // Pump on but no water
  
  // Warnings
  if(tMotor > 60.0) return "warning";  // Motor running hot
  if(tMotor < -50.0) return "warning";  // Sensor disconnected
  
  // All good
  return "good";
}

// Then use in JSON:
doc["overall_status"] = determineOverallStatus(tMotor, ctCurrent, tankFull, yStatus, gStatus, bStatus);
```

### **Issue #3: Pickup Status "DISCONNECTED"**
**Current:** Pickups can be "DISCONNECTED", "ON", "OFF", "UNKNOWN"  
**Problem:** If wires are disconnected, ESP32 won't know  
**Solution:** Already handled! Your voltage thresholds detect this. ✅

---

## 🎯 **IMPLEMENTATION PLAN**

### **Phase 1: Minimal Changes (Quick Demo)** - 30 minutes
Just change field names and auth header. Keep everything else.

1. Update JSON field names (lines 910-919)
2. Remove `state_inputs` array (lines 922-947)
3. Add `machineAPIKey` variable and WiFiManager parameter
4. Update authorization header (line 960)
5. Test with Serial Monitor

### **Phase 2: Full Integration (Complete)** - 1 hour
Add all optional fields and status logic.

1. Add all evaporative cooler specific fields
2. Implement `determineOverallStatus()` function
3. Add diagnostic voltages
4. Test all alert conditions
5. Verify dashboard displays correctly

---

## ✅ **TESTING CHECKLIST**

### **Pre-Upload:**
- [ ] Code compiles without errors
- [ ] API key and machine UUID configured
- [ ] WiFi credentials set

### **After Upload:**
- [ ] Serial Monitor shows "✓ Data sent successfully!"
- [ ] HTTP code is 201 or 200
- [ ] Dashboard shows machine with "Connected" status
- [ ] Temperature readings display correctly
- [ ] Current reading shows (when fan running)
- [ ] Delta T calculates correctly
- [ ] "has_water" shows tank status
- [ ] Fan speed displays (0-100%)

### **Alert Testing (After Alert System Implemented):**
- [ ] Motor temp > 70°C triggers alert
- [ ] Cool ON + Tank empty triggers alert
- [ ] Delta T < 2°C after 30 min triggers alert
- [ ] Fan ON + 0A triggers alert

---

## 🚀 **NEXT STEPS**

1. **You:** Let me know if you want Phase 1 (quick) or Phase 2 (complete)
2. **Me:** I'll create the corrected `.ino` file
3. **You:** Upload to ESP32
4. **Me:** Guide you through dashboard verification
5. **Demo:** Show live data tomorrow! 🎉

---

## 📝 **NOTES**

### **Good Design Decisions in Your Code:**
- ✅ State machine prevents WiFi/ADC conflicts
- ✅ Averaging over 60 samples = stable readings
- ✅ Watchdog timer = automatic recovery
- ✅ WiFiManager = easy deployment
- ✅ Voltage thresholds for pickup detection = clever!

### **Minor Improvements (Future):**
- Add OTA updates for firmware
- Log errors to separate Supabase table
- Add MQTT as backup to HTTP
- Add visual LED status indicator

---

**Ready to implement!** Let me know if you want the quick fix (Phase 1) or the complete version (Phase 2)! 🚀

