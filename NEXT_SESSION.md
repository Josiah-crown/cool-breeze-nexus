# 🚀 Next Session - Quick Start Guide

## 🎯 **Your Priority: ESP32 Integration**

You mentioned wanting to connect the ESP32 device when you get home. Here's what you need:

---

## 📋 **ESP32 Setup Checklist:**

### **Step 1: Generate API Key**
1. Go to http://localhost:8080
2. Log in as Super Admin
3. In the right sidebar, find **"ESP32 API Key Management"**
4. Click **"+ Generate New API Key"**
5. (Optional) Add description: "ESP32 Test Device"
6. Click **"Create"**
7. **COPY THE KEY IMMEDIATELY** (you can't see it again!)

### **Step 2: Get Machine ID**
1. In the dashboard, click any machine to expand it
2. The machine ID is in the URL or visible in the expanded view
3. Copy this UUID (e.g., `550e8400-e29b-41d4-a716-446655440000`)

### **Step 3: ESP32 Code**
- **Guide:** `ESP32_INTEGRATION_GUIDE.md` (comprehensive)
- **Quick Reference:** See example code below

---

## ⚡ **Quick ESP32 Example (Auto Mode):**

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
const char* apiKey = "YOUR_GENERATED_API_KEY_HERE";
const char* machineId = "YOUR_MACHINE_UUID_HERE";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected!");
}

void loop() {
  // Read sensors (replace with your actual sensors)
  float motorTemp = random(30, 50);    // °C
  float outsideTemp = random(25, 35);  // °C
  float insideTemp = random(20, 30);   // °C
  float current = random(10, 20);      // A
  float voltage = 230;                 // V
  
  // Send to Supabase
  sendToSupabase(motorTemp, outsideTemp, insideTemp, current, voltage);
  
  // Wait 5 minutes
  delay(5 * 60 * 1000);
}

bool sendToSupabase(float motorTemp, float outsideTemp, float insideTemp, float current, float voltage) {
  HTTPClient http;
  http.begin(String(supabaseUrl) + "/rest/v1/readings_raw");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabaseAnonKey);
  http.addHeader("Authorization", "Bearer " + String(apiKey));
  
  StaticJsonDocument<512> doc;
  doc["machine_id"] = machineId;
  doc["motor_temp"] = motorTemp;
  doc["outside_temp"] = outsideTemp;
  doc["inside_temp"] = insideTemp;
  doc["current"] = current;
  doc["voltage"] = voltage;
  doc["power"] = current * voltage;
  doc["delta_t"] = abs(outsideTemp - insideTemp);
  doc["is_on"] = true;
  doc["fan_active"] = true;
  doc["overall_status"] = "good";
  
  String payload;
  serializeJson(doc, payload);
  
  int httpCode = http.POST(payload);
  http.end();
  
  if (httpCode == 201) {
    Serial.println("✅ Data sent!");
    return true;
  } else {
    Serial.println("❌ Failed: " + String(httpCode));
    return false;
  }
}
```

---

## 🔧 **What You'll Need:**

### **Hardware:**
- ESP32 board
- Temperature sensor(s)
- Current sensor (optional for testing)
- USB cable for programming

### **Software:**
- Arduino IDE or PlatformIO
- Libraries: WiFi, HTTPClient, ArduinoJson

### **Configuration:**
1. Replace `YOUR_WIFI_SSID` with your WiFi name
2. Replace `YOUR_WIFI_PASSWORD` with your WiFi password
3. Replace `YOUR_GENERATED_API_KEY_HERE` with the API key from Step 1
4. Replace `YOUR_MACHINE_UUID_HERE` with the machine ID from Step 2

---

## 📊 **Testing the Connection:**

### **1. Upload Code to ESP32**
- Connect ESP32 via USB
- Upload the code
- Open Serial Monitor (115200 baud)

### **2. Watch Serial Output**
You should see:
```
Connecting to WiFi...
Connected!
✅ Data sent!
✅ Data sent!
```

### **3. Verify in Dashboard**
- Go to http://localhost:8080
- Find your machine
- The values should update every 5 minutes
- Motor temp, outside temp, inside temp should show real data

### **4. Troubleshooting:**
If you see errors:
- `❌ Failed: 401` → API key invalid (generate new one)
- `❌ Failed: 404` → Machine ID wrong (check UUID)
- `❌ Failed: 403` → Supabase permissions issue
- Can't connect to WiFi → Check SSID/password

---

## 🎯 **After ESP32 is Working:**

### **Next: Implement Alert System** (3 hours)
Once real data is flowing, we'll implement:
1. Alert checking logic (monitors your actual sensor data)
2. Email sending (sends alerts based on your thresholds)
3. Alert dashboard (shows active alerts)

This way you can test with **real machine data** instead of simulated!

---

## 📁 **Important Files:**

### **For ESP32:**
- `ESP32_INTEGRATION_GUIDE.md` - Comprehensive guide
- `EMAIL_SMTP_CONFIG.env` - SMTP credentials

### **For Next Session:**
- `SESSION_PROGRESS_2025-11-08.md` - Today's progress
- `COMPLETE_ALERT_PARAMETERS.md` - All alert conditions
- `supabase/migrations/20251108000001_add_alert_system.sql` - Run if not done yet

---

## ✅ **Before Next Session:**

1. **Test the Alert Thresholds Editor:**
   - Open any machine in the dashboard
   - Scroll to "Alert Thresholds"
   - See the 2-column layout
   - Try changing a value and clicking Save

2. **Run Migration (if not done):**
   - Go to Supabase SQL Editor
   - Copy `20251108000001_add_alert_system.sql`
   - Paste and Run
   - Verify "Success"

3. **ESP32 Hardware Prep:**
   - Gather your ESP32 and sensors
   - Test WiFi connection
   - Have Arduino IDE ready

---

## 🎉 **You're Ready!**

Everything is set up for:
- ✅ ESP32 to send real sensor data
- ✅ Dashboard to display it
- ✅ Alert thresholds customized per machine
- ✅ Email system ready to send alerts

**Good luck with the ESP32 integration!** 🚀

**When you're back:** Just tell me "ESP32 is connected and sending data" and we'll implement the alert logic to monitor it!

