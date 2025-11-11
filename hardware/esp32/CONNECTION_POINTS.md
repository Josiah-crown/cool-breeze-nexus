# ESP32 Connection Points Reference

## 🔌 Critical Connection Points to Verify

When analyzing your `.ino` file, ensure these connection points match exactly:

---

## 1️⃣ **Supabase API Endpoint**

### **URL**
```cpp
const char* supabaseUrl = "https://wjyanxstvbiqefmgpccb.supabase.co";
```

### **Full REST Endpoint**
```cpp
String endpoint = String(supabaseUrl) + "/rest/v1/readings_raw";
```

✅ **Correct:** `/rest/v1/readings_raw`  
❌ **Wrong:** `/readings_raw`, `/api/readings_raw`, `/rest/readings_raw`

---

## 2️⃣ **HTTP Headers (Critical!)**

### **Required Headers**
```cpp
http.addHeader("Content-Type", "application/json");
http.addHeader("apikey", supabaseAnonKey);
http.addHeader("Authorization", "Bearer " + String(apiKey));
```

### **Header Values**

**Supabase Anon Key (Public):**
```cpp
const char* supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqeWFueHN0dmJpcWVmbWdwY2NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMzI4NDUsImV4cCI6MjA3NzgwODg0NX0.r1xQG8HYHioH8_ALGQTRO2wM5F2tAOhM-xe_eh3VxhY";
```

**Machine API Key (Private - Generate from Dashboard):**
```cpp
const char* apiKey = "GENERATE_FROM_DASHBOARD";
```

⚠️ **Important:** The `Authorization` header MUST have `Bearer ` prefix (with space after)

---

## 3️⃣ **JSON Payload Structure**

### **Required Fields**
```json
{
  "machine_id": "string (UUID)",
  "motor_temp": number,
  "outside_temp": number,
  "inside_temp": number,
  "current": number,
  "voltage": number,
  "power": number,
  "delta_t": number,
  "is_on": boolean,
  "fan_active": boolean,
  "overall_status": "string"
}
```

### **Example Arduino Code**
```cpp
StaticJsonDocument<512> doc;

// Required fields
doc["machine_id"] = machineId;
doc["motor_temp"] = motorTemp;
doc["outside_temp"] = outsideTemp;
doc["inside_temp"] = insideTemp;
doc["current"] = current;
doc["voltage"] = voltage;
doc["power"] = power;
doc["delta_t"] = deltaT;
doc["is_on"] = isOn;
doc["fan_active"] = fanActive;
doc["overall_status"] = "good";  // or "warning", "error"

// Optional fields (machine type specific)
doc["is_cooling"] = isCooling;        // AC/Evap Cooler
doc["has_water"] = hasWater;          // Evap Cooler
doc["has_pump"] = hasPump;            // Heat Pump
doc["has_heat"] = hasHeat;            // Heat Pump
doc["setpoint"] = setpoint;           // Heat Pump
doc["compressor_temp"] = compTemp;    // Heat Pump/AC

String payload;
serializeJson(doc, payload);
```

---

## 4️⃣ **Database Field Mapping**

| ESP32 Variable | JSON Key | Database Column | Type | Required |
|---------------|----------|-----------------|------|----------|
| `motorTemp` | `motor_temp` | `motor_temp` | float | ✅ Yes |
| `outsideTemp` | `outside_temp` | `outside_temp` | float | ✅ Yes |
| `insideTemp` | `inside_temp` | `inside_temp` | float | ✅ Yes |
| `current` | `current` | `current` | float | ✅ Yes |
| `voltage` | `voltage` | `voltage` | float | ✅ Yes |
| `power` | `power` | `power` | float | ✅ Yes |
| `deltaT` | `delta_t` | `delta_t` | float | ✅ Yes |
| `isOn` | `is_on` | `is_on` | boolean | ✅ Yes |
| `fanActive` | `fan_active` | `fan_active` | boolean | ✅ Yes |
| `overallStatus` | `overall_status` | `overall_status` | string | ✅ Yes |
| `isCooling` | `is_cooling` | `is_cooling` | boolean | ⭕ Optional |
| `hasWater` | `has_water` | `has_water` | boolean | ⭕ Optional |
| `hasPump` | `has_pump` | `has_pump` | boolean | ⭕ Optional |
| `hasHeat` | `has_heat` | `has_heat` | boolean | ⭕ Optional |
| `setpoint` | `setpoint` | `setpoint` | float | ⭕ Optional |
| `compressorTemp` | `compressor_temp` | `compressor_temp` | float | ⭕ Optional |

---

## 5️⃣ **HTTP Method**

### **Must Use POST**
```cpp
int httpCode = http.POST(payload);
```

✅ **Correct:** `http.POST(payload)`  
❌ **Wrong:** `http.GET()`, `http.PUT()`, `http.PATCH()`

---

## 6️⃣ **Expected Response Codes**

### **Success**
```cpp
if (httpCode == 201) {
  Serial.println("✅ Data sent successfully!");
  return true;
}
```

### **Common Error Codes**
- `401` - Unauthorized (bad API key)
- `403` - Forbidden (permissions issue)
- `404` - Not Found (wrong endpoint or machine_id)
- `422` - Unprocessable Entity (invalid JSON or missing required fields)
- `500` - Server Error (Supabase issue)

---

## 7️⃣ **WiFi Configuration**

### **2.4GHz Only!**
```cpp
const char* ssid = "YOUR_WIFI_SSID";      // Must be 2.4GHz network
const char* password = "YOUR_WIFI_PASSWORD";
```

⚠️ **ESP32 does NOT support 5GHz WiFi!**

### **Connection Check**
```cpp
WiFi.begin(ssid, password);
while (WiFi.status() != WL_CONNECTED) {
  delay(500);
  Serial.print(".");
}
Serial.println("\nWiFi Connected!");
Serial.println("IP: " + WiFi.localIP().toString());
```

---

## 8️⃣ **Machine ID Format**

### **Must be Valid UUID**
```cpp
const char* machineId = "550e8400-e29b-41d4-a716-446655440000";
```

✅ **Correct Format:** `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` (8-4-4-4-12 hex digits)  
❌ **Wrong:** Random string, integer, or incorrect format

### **How to Get Machine ID**
1. Go to dashboard
2. Click on a machine
3. Copy UUID from URL or machine detail view
4. Paste exactly as shown (with hyphens)

---

## 9️⃣ **Update Interval**

### **Recommended Intervals**
```cpp
// Testing (fast updates)
delay(30 * 1000);  // 30 seconds

// Demo (moderate updates)
delay(2 * 60 * 1000);  // 2 minutes

// Production (normal updates)
delay(5 * 60 * 1000);  // 5 minutes
```

⚠️ **Don't update too frequently!** More than once per minute may cause rate limiting.

---

## 🔟 **Complete Example**

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Supabase
const char* supabaseUrl = "https://wjyanxstvbiqefmgpccb.supabase.co";
const char* supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqeWFueHN0dmJpcWVmbWdwY2NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMzI4NDUsImV4cCI6MjA3NzgwODg0NX0.r1xQG8HYHioH8_ALGQTRO2wM5F2tAOhM-xe_eh3VxhY";
const char* apiKey = "YOUR_API_KEY_HERE";
const char* machineId = "YOUR_MACHINE_UUID_HERE";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi Connected!");
}

void loop() {
  // Read sensors (replace with actual sensor code)
  float motorTemp = 45.5;
  float outsideTemp = 28.0;
  float insideTemp = 22.0;
  float current = 12.5;
  float voltage = 230.0;
  float power = current * voltage;
  float deltaT = abs(outsideTemp - insideTemp);
  
  // Send to Supabase
  if (sendToSupabase(motorTemp, outsideTemp, insideTemp, current, voltage, power, deltaT)) {
    Serial.println("✅ Data sent successfully!");
  } else {
    Serial.println("❌ Failed to send data");
  }
  
  // Wait 5 minutes
  delay(5 * 60 * 1000);
}

bool sendToSupabase(float motorTemp, float outsideTemp, float insideTemp, 
                    float current, float voltage, float power, float deltaT) {
  HTTPClient http;
  
  // 1. Set endpoint
  String endpoint = String(supabaseUrl) + "/rest/v1/readings_raw";
  http.begin(endpoint);
  
  // 2. Set headers
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabaseAnonKey);
  http.addHeader("Authorization", "Bearer " + String(apiKey));
  
  // 3. Build JSON payload
  StaticJsonDocument<512> doc;
  doc["machine_id"] = machineId;
  doc["motor_temp"] = motorTemp;
  doc["outside_temp"] = outsideTemp;
  doc["inside_temp"] = insideTemp;
  doc["current"] = current;
  doc["voltage"] = voltage;
  doc["power"] = power;
  doc["delta_t"] = deltaT;
  doc["is_on"] = true;
  doc["fan_active"] = true;
  doc["overall_status"] = "good";
  
  String payload;
  serializeJson(doc, payload);
  
  // 4. Send POST request
  int httpCode = http.POST(payload);
  http.end();
  
  // 5. Check response
  return (httpCode == 201);
}
```

---

## ✅ **Verification Checklist**

When I analyze your code, I'll check:

- [ ] Supabase URL correct (`wjyanxstvbiqefmgpccb.supabase.co`)
- [ ] Endpoint path correct (`/rest/v1/readings_raw`)
- [ ] All 3 headers present (Content-Type, apikey, Authorization)
- [ ] Authorization has `Bearer ` prefix
- [ ] JSON payload includes all required fields
- [ ] Field names match exactly (snake_case, not camelCase)
- [ ] HTTP method is POST
- [ ] Success check is `httpCode == 201`
- [ ] Machine ID is valid UUID format
- [ ] WiFi credentials configured
- [ ] Update interval reasonable (not < 30 seconds)

---

## 🚨 **Common Mistakes to Avoid**

1. ❌ Wrong endpoint: `/readings` instead of `/readings_raw`
2. ❌ Missing `Bearer ` prefix in Authorization header
3. ❌ Using camelCase in JSON: `motorTemp` instead of `motor_temp`
4. ❌ Checking for `httpCode == 200` instead of `201`
5. ❌ Missing required fields in JSON payload
6. ❌ Invalid machine UUID format
7. ❌ 5GHz WiFi network (ESP32 only supports 2.4GHz)

---

**Ready to analyze your code!** 📋

Just place your `.ino` file in this folder and I'll verify all connection points! 🔍

