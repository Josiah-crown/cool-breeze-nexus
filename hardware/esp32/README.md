# ESP32 Hardware Integration

**✅ 2 PRODUCTION-READY FIRMWARE VERSIONS AVAILABLE!**

This folder contains complete, tested ESP32 firmware for the Cool Breeze Nexus IoT system.

---

## 🎯 **QUICK START**

**Choose Your Firmware:**
1. **`ESP32_HVAC_CoolBreezeNexus_V2.ino`** - 24V Evaporative Cooler
2. **`ESP32_Cirrus_12V_V2.ino`** - 12V Cirrus Machine

**Process:** Upload → WiFiManager Config → Test → Done! (30 min)

---

## 📝 **Files in This Folder**

### **Firmware (Production Ready):**
- **`ESP32_HVAC_CoolBreezeNexus_V2.ino`** - 24V logic, inverted fan speed
- **`ESP32_Cirrus_12V_V2.ino`** - 12V logic, non-inverted fan speed
- **`ESP32_HVAC_Enhanced (1).ino`** - Original firmware (reference only)

### **Documentation:**
- **`README.md`** - This file (overview)
- **`UPLOAD_GUIDE.md`** - Step-by-step upload instructions ⭐ START HERE
- **`MULTI_PROTOTYPE_BUILD_GUIDE.md`** - Build 2-3 units efficiently
- **`CIRRUS_12V_CALIBRATION.md`** - 12V voltage calibration
- **`CODE_ANALYSIS_AND_FIXES.md`** - Technical details & changes
- **`CONNECTION_POINTS.md`** - API reference & JSON schema
- **`IMPLEMENTATION_COMPLETE.md`** - Summary of ESP32 work

### **Configuration (Keep Private):**
- **`secrets.h`** - WiFi/API credentials (gitignored, don't commit!)
- **`secrets.example.h`** - Template for secrets.h

---

## 🔄 **Firmware Comparison**

| Feature | 24V Evap Cooler | 12V Cirrus |
|---------|----------------|------------|
| **File** | `ESP32_HVAC_CoolBreezeNexus_V2.ino` | `ESP32_Cirrus_12V_V2.ino` |
| **Voltage Logic** | 24V pickups | 12V pickups |
| **Fan Speed** | Inverted (high V = low speed) | Normal (low V = low speed) |
| **Cooling Detection** | Pump OR Dump valve | Same |
| **Sensors** | 3× temp, CT, float, 4× pickups | Same |
| **WiFiManager** | ✅ Yes | ✅ Yes |
| **API Auth** | ✅ Machine key | ✅ Machine key |
| **Calibration** | Pre-calibrated | Needs calibration |

**Both versions:**
- ✅ Dashboard-compatible JSON
- ✅ Smart status detection
- ✅ Production-ready
- ✅ Same hardware setup

**Key Difference:** Voltage thresholds and fan speed calculation logic only.

---

## 🔧 Hardware Requirements

- **ESP32 Development Board** (any variant)
- **Temperature Sensors** (DS18B20, DHT22, or similar)
- **Current Sensor** (ACS712 or similar) - optional for testing
- **USB Cable** for programming
- **Power Supply** (5V via USB or external)

---

## 📚 Arduino Libraries Required

Install these via Arduino IDE Library Manager:

```
- WiFi (built-in with ESP32)
- HTTPClient (built-in with ESP32)
- ArduinoJson (by Benoit Blanchon)
```

---

## ⚙️ Configuration

### **1. WiFi Credentials**
Update in your `.ino` file:
```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
```

### **2. Supabase Connection**
```cpp
const char* supabaseUrl = "https://wjyanxstvbiqefmgpccb.supabase.co";
const char* supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqeWFueHN0dmJpcWVmbWdwY2NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMzI4NDUsImV4cCI6MjA3NzgwODg0NX0.r1xQG8HYHioH8_ALGQTRO2wM5F2tAOhM-xe_eh3VxhY";
```

### **3. API Key & Machine ID**
Generate these from the dashboard:
```cpp
const char* apiKey = "YOUR_GENERATED_API_KEY";  // From dashboard: Right sidebar → API Key Management
const char* machineId = "YOUR_MACHINE_UUID";    // From dashboard: Machine detail view
```

---

## 🚀 Upload Instructions

### **Step 1: Install Arduino IDE**
- Download from: https://www.arduino.cc/en/software
- Install ESP32 board support: https://docs.espressif.com/projects/arduino-esp32/en/latest/installing.html

### **Step 2: Configure Board**
- Tools → Board → ESP32 Dev Module (or your specific board)
- Tools → Port → Select your COM port
- Tools → Upload Speed → 115200

### **Step 3: Update Configuration**
- Open `.ino` file
- Update WiFi credentials
- Update API key and machine ID
- Save file

### **Step 4: Upload**
- Click Upload button (→)
- Wait for compilation and upload
- Open Serial Monitor (115200 baud)
- Watch for "✅ Data sent!" messages

---

## 📊 Data Flow

```
ESP32 Sensors → Arduino Code → HTTP POST → Supabase → Dashboard
  ↓
  Motor Temp
  Outside Temp
  Inside Temp
  Current
  Voltage
  Power
  Delta T
```

---

## 🔍 Troubleshooting

### **Can't Connect to WiFi**
- Check SSID and password
- Ensure 2.4GHz network (ESP32 doesn't support 5GHz)
- Check signal strength

### **401 Unauthorized Error**
- API key is invalid or expired
- Generate new key in dashboard
- Update `.ino` file and re-upload

### **404 Not Found Error**
- Machine ID is incorrect
- Verify UUID in dashboard
- Copy exact UUID to `.ino` file

### **No Data in Dashboard**
- Check Serial Monitor for errors
- Verify Supabase URL is correct
- Check internet connection
- Ensure machine exists in database

---

## 📡 API Endpoint

**POST** `https://wjyanxstvbiqefmgpccb.supabase.co/rest/v1/readings_raw`

**Headers:**
```
Content-Type: application/json
apikey: {supabase_anon_key}
Authorization: Bearer {machine_api_key}
```

**Body:**
```json
{
  "machine_id": "uuid-here",
  "motor_temp": 45.5,
  "outside_temp": 28.0,
  "inside_temp": 22.0,
  "current": 12.5,
  "voltage": 230,
  "power": 2875,
  "delta_t": 6.0,
  "is_on": true,
  "fan_active": true,
  "overall_status": "good"
}
```

---

## ⏱️ Update Interval

**Default:** 5 minutes (300,000 ms)

To change, update in `.ino`:
```cpp
delay(5 * 60 * 1000);  // Change the "5" to desired minutes
```

**Recommended:**
- Testing: 30 seconds
- Demo: 1-2 minutes
- Production: 5 minutes

---

## 🔐 Security Notes

- **Never commit WiFi passwords** to git
- **Never commit API keys** to git
- Use `secrets.example.h` as template
- Add `secrets.h` to `.gitignore`

---

## 📞 Support

For more details, see:
- `../../ESP32_INTEGRATION_GUIDE.md` - Comprehensive guide
- `../../WHEN_YOU_RETURN.md` - Demo setup instructions
- Dashboard: http://localhost:8080 (dev) or https://iotnexus.site (prod)

---

**Ready to upload your firmware!** 🚀

