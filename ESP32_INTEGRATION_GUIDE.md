# 🔌 ESP32 Integration Guide

## Prerequisites
- ✅ Website deployed and accessible
- ✅ Migration run (notifications_enabled column added)
- ✅ ESP32 hardware with sensors
- ✅ Arduino IDE or PlatformIO installed

---

## Step 1: Generate API Key

1. Log in to your deployed website
2. Go to **Dashboard**
3. If you're a Super Admin:
   - Navigate to **API Key Management** section
   - Click **Generate New Key**
   - (Optional) Add a description: "ESP32 Test Device"
   - Click **Create**
   - **IMPORTANT:** Copy the generated key immediately!

4. If you're an Installer/Company:
   - Select a machine
   - Click to expand the machine detail view
   - In the **API Key Manager** section on the right
   - Assign an existing key or generate a new one

---

## Step 2: ESP32 Code Structure

Your ESP32 needs to:
1. Connect to WiFi
2. Read sensor values
3. POST data to Supabase `readings_raw` table every 5 minutes
4. Authenticate using the API key

---

## Step 3: ESP32 Example Code (Arduino)

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi Credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Supabase Configuration
const char* supabaseUrl = "https://lkvnhskxbxzeohopqjcr.supabase.co";
const char* supabaseAnonKey = "YOUR_ANON_KEY_HERE";
const char* apiKey = "YOUR_GENERATED_API_KEY_HERE";  // From website
const char* machineId = "YOUR_MACHINE_UUID_HERE";    // From website

// Sensor Pins (example)
#define TEMP_SENSOR_PIN 34
#define CURRENT_SENSOR_PIN 35
#define VOLTAGE_SENSOR_PIN 32

void setup() {
  Serial.begin(115200);
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected to WiFi!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  // Read sensor values
  float motorTemp = readTemperature();
  float outsideTemp = readOutsideTemp();
  float insideTemp = readInsideTemp();
  float current = readCurrent();
  float voltage = readVoltage();
  float power = current * voltage;
  float deltaT = abs(outsideTemp - insideTemp);
  
  // Get machine state
  bool isOn = checkIfOn();
  bool fanActive = checkFanActive();
  bool isCooling = checkCooling();
  bool hasWater = checkWaterLevel();
  
  // Determine status
  String overallStatus = "good";
  String motorStatus = "normal";
  
  if (motorTemp > 75) {
    motorStatus = "critical";
    overallStatus = "error";
  } else if (motorTemp > 60) {
    motorStatus = "warning";
    overallStatus = "warning";
  }
  
  if (!hasWater) {
    overallStatus = "error";
  }
  
  // Send data to Supabase
  bool success = sendToSupabase(
    motorTemp, outsideTemp, insideTemp, deltaT,
    current, voltage, power,
    isOn, fanActive, isCooling, hasWater,
    overallStatus, motorStatus
  );
  
  if (success) {
    Serial.println("✅ Data sent successfully!");
  } else {
    Serial.println("❌ Failed to send data");
  }
  
  // Wait 5 minutes
  delay(5 * 60 * 1000);
}

bool sendToSupabase(
  float motorTemp, float outsideTemp, float insideTemp, float deltaT,
  float current, float voltage, float power,
  bool isOn, bool fanActive, bool isCooling, bool hasWater,
  String overallStatus, String motorStatus
) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected!");
    return false;
  }
  
  HTTPClient http;
  
  // Construct URL
  String url = String(supabaseUrl) + "/rest/v1/readings_raw";
  
  // Create JSON payload
  StaticJsonDocument<512> doc;
  doc["machine_id"] = machineId;
  doc["motor_temp"] = motorTemp;
  doc["outside_temp"] = outsideTemp;
  doc["inside_temp"] = insideTemp;
  doc["delta_t"] = deltaT;
  doc["current"] = current;
  doc["voltage"] = voltage;
  doc["power"] = power;
  doc["is_on"] = isOn;
  doc["is_connected"] = true;  // Always true if sending
  doc["has_water"] = hasWater;
  doc["is_cooling"] = isCooling;
  doc["fan_active"] = fanActive;
  doc["has_pump"] = false;  // Set based on your machine
  doc["has_heat"] = false;  // Set based on your machine
  doc["overall_status"] = overallStatus;
  doc["motor_status"] = motorStatus;
  
  String jsonBody;
  serializeJson(doc, jsonBody);
  
  // Make POST request
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabaseAnonKey);
  http.addHeader("Authorization", String("Bearer ") + supabaseAnonKey);
  http.addHeader("X-API-Key", apiKey);  // Your generated API key
  http.addHeader("Prefer", "return=minimal");
  
  Serial.println("Sending: " + jsonBody);
  
  int httpResponseCode = http.POST(jsonBody);
  
  bool success = false;
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("Response code: " + String(httpResponseCode));
    Serial.println("Response: " + response);
    success = (httpResponseCode == 201 || httpResponseCode == 200);
  } else {
    Serial.println("Error code: " + String(httpResponseCode));
  }
  
  http.end();
  return success;
}

// Sensor reading functions (implement based on your hardware)
float readTemperature() {
  // Read from DS18B20, DHT22, or other temp sensor
  int raw = analogRead(TEMP_SENSOR_PIN);
  return (raw / 4095.0) * 100.0;  // Example conversion
}

float readOutsideTemp() {
  // Implement based on your sensor
  return 28.5;
}

float readInsideTemp() {
  // Implement based on your sensor
  return 22.3;
}

float readCurrent() {
  // Read from ACS712 or similar current sensor
  int raw = analogRead(CURRENT_SENSOR_PIN);
  return (raw / 4095.0) * 30.0;  // Example: 30A max sensor
}

float readVoltage() {
  // Read from voltage divider
  int raw = analogRead(VOLTAGE_SENSOR_PIN);
  return (raw / 4095.0) * 250.0;  // Example: scaled to 250V max
}

bool checkIfOn() {
  // Check relay status or power detection
  return digitalRead(RELAY_PIN);
}

bool checkFanActive() {
  // Check fan tachometer or relay
  return digitalRead(FAN_PIN);
}

bool checkCooling() {
  // Check cooling pump/valve status
  return digitalRead(COOLING_PIN);
}

bool checkWaterLevel() {
  // Read water level sensor
  return digitalRead(WATER_SENSOR_PIN);
}
```

---

## Step 4: Required Arduino Libraries

Install these via Arduino Library Manager:

```
- WiFi (built-in for ESP32)
- HTTPClient (built-in)
- ArduinoJson (by Benoit Blanchon)
```

---

## Step 5: Configuration Values

You need to replace these placeholders:

1. **WiFi Credentials:**
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   ```

2. **Supabase Anon Key:**
   - Get from Supabase Dashboard → Project Settings → API
   ```cpp
   const char* supabaseAnonKey = "eyJhbGciOiJIUzI1...";
   ```

3. **Machine API Key:**
   - Get from your deployed website
   ```cpp
   const char* apiKey = "abc123-generated-key-from-website";
   ```

4. **Machine UUID:**
   - Get from website URL when viewing a machine
   - Or query the database
   ```cpp
   const char* machineId = "550e8400-e29b-41d4-a716-446655440000";
   ```

---

## Step 6: Testing

### Upload and Monitor
```bash
# In Arduino IDE:
1. Select board: ESP32 Dev Module
2. Select port: COM3 (or your port)
3. Click Upload
4. Open Serial Monitor (115200 baud)
```

### Expected Serial Output
```
Connecting to WiFi.....
Connected to WiFi!
IP Address: 192.168.1.105
Sending: {"machine_id":"550e8400...","motor_temp":45.2,...}
Response code: 201
✅ Data sent successfully!
```

---

## Step 7: Verify in Dashboard

1. Log in to your deployed website
2. Go to Dashboard
3. Select your machine
4. You should see:
   - Current readings updated (from latest reading)
   - Historical charts populating with real data
   - Connection status showing "Connected" (green)

---

## Troubleshooting

### Error 401 (Unauthorized)
- Check API key is correct
- Verify machine_id exists in database
- Check Supabase anon key

### Error 404 (Not Found)
- Verify Supabase URL is correct
- Check if `readings_raw` table exists
- Confirm table name spelling

### Data not appearing in dashboard
- Check if readings are being inserted (query database)
- Verify machine_id matches
- Check RLS policies on `readings_raw` table

### WiFi connection issues
- Verify SSID and password
- Check WiFi signal strength
- ESP32 supports only 2.4GHz networks (not 5GHz)

---

## Advanced: Power Optimization

For battery-powered devices:

```cpp
#include <esp_sleep.h>

void setup() {
  // ... existing setup ...
  
  // Configure wake up every 5 minutes
  esp_sleep_enable_timer_wakeup(5 * 60 * 1000000); // microseconds
}

void loop() {
  // Read sensors and send data
  sendToSupabase(...);
  
  // Enter deep sleep
  esp_deep_sleep_start();
}
```

---

## Security Best Practices

1. ✅ **Use HTTPS** - All connections are encrypted
2. ✅ **API Key Auth** - Each device has unique key
3. ✅ **Row-Level Security** - Supabase enforces permissions
4. ⚠️ **Hardcoded Keys** - Consider using secure storage (SPIFFS/EEPROM)
5. ⚠️ **Firmware Updates** - Implement OTA updates for security patches

---

## What's Next?

Once ESP32 is connected:
1. ✅ Real sensor data flowing to database
2. ✅ Dashboard updates with live readings
3. ➡️ Add Realtime subscriptions for instant updates
4. ➡️ Set up alerts based on thresholds
5. ➡️ Scale to 20+ machines

---

**Estimated Time:** 30-45 minutes for first device


