# Cirrus Machine (12V Logic) - Calibration Guide

**Firmware:** `ESP32_Cirrus_12V_V2.ino`  
**Logic:** 12V (instead of 24V)  
**Fan Speed:** Non-inverted (lower voltage = lower speed)

---

## 🔧 **KEY DIFFERENCES FROM EVAP COOLER**

| Feature | Evap Cooler (24V) | Cirrus (12V) |
|---------|-------------------|--------------|
| **Voltage Logic** | 24V | 12V |
| **Fan Speed** | Inverted (high V = low speed) | Normal (low V = low speed) |
| **Voltage Dividers** | Same hardware | Same hardware |
| **CT Sensor** | Unchanged | Unchanged |
| **Temp Sensors** | Unchanged | Unchanged |

---

## ⚙️ **12V VOLTAGE THRESHOLDS (NEEDS CALIBRATION)**

### **Current Values (Estimated):**
```cpp
const float VOLTAGE_DISCONNECTED_MAX = 0.3;   // Below this = wire disconnected
const float VOLTAGE_ON_MIN = 0.4;             // Pickup ON starts here
const float VOLTAGE_ON_MAX = 1.3;             // Pickup ON ends here
const float VOLTAGE_OFF_MIN = 1.4;            // Above this = pickup OFF

// Fan speed (Non-inverted)
const float FAN_VOLTAGE_0_SPEED = 0.5;        // Low voltage = 0% speed
const float FAN_VOLTAGE_100_SPEED = 1.0;      // High voltage = 100% speed
```

**⚠️ THESE ARE ESTIMATES!** You need to calibrate based on actual readings.

---

## 📊 **HOW TO CALIBRATE**

### **Step 1: Upload Firmware with DEBUG_MODE = 1**
The firmware will print detailed voltage readings every second.

### **Step 2: Test Each Pickup State**

**Test Sequence:**
1. **Disconnect wire** - Note voltage (should be < 0.3V)
2. **Turn pickup ON** - Note voltage range
3. **Turn pickup OFF** - Note voltage range
4. **Test fan at different speeds** - Note voltage at 0%, 50%, 100%

### **Step 3: Update Thresholds**

Open `ESP32_Cirrus_12V_V2.ino` and update these lines:

```cpp
// Line 115-120: Pickup thresholds
const float VOLTAGE_DISCONNECTED_MAX = X.X;   // Your measured disconnected max
const float VOLTAGE_ON_MIN = X.X;             // Your measured ON minimum
const float VOLTAGE_ON_MAX = X.X;             // Your measured ON maximum
const float VOLTAGE_OFF_MIN = X.X;            // Your measured OFF minimum

// Line 126-127: Fan speed range
const float FAN_VOLTAGE_0_SPEED = X.X;        // Your measured 0% speed voltage
const float FAN_VOLTAGE_100_SPEED = X.X;      // Your measured 100% speed voltage
```

### **Step 4: Re-upload & Test**

---

## 🎯 **EXPECTED SERIAL OUTPUT**

### **During Calibration (DEBUG_MODE = 1):**

```
┌─────────────────────────────────────────────────────
│ Sample: 15/60  |  Uptime: 15 seconds
├─────────────────────────────────────────────────────
│ PICKUP INPUTS (12V Logic):
│   GPIO 34 Yellow: 0.523 V  →  ON
│   GPIO 35 Green:  0.750 V  →  ON  (Fan Speed: 50% - Non-inverted)
│   GPIO 32 Brown:  1.420 V  →  OFF
│   GPIO 33 Black:  0.020 V  →  DISCONNECTED ⚠
└─────────────────────────────────────────────────────
```

**Record these voltages for each state!**

---

## 📝 **CALIBRATION WORKSHEET**

Fill this out while testing:

### **Yellow Pickup (Exhaust):**
- Disconnected: ______ V
- ON: ______ V to ______ V
- OFF: ______ V

### **Brown Pickup (Pump):**
- Disconnected: ______ V
- ON: ______ V to ______ V
- OFF: ______ V

### **Black Pickup (Drain):**
- Disconnected: ______ V
- ON: ______ V to ______ V
- OFF: ______ V

### **Green Pickup (Fan with Speed):**
- Disconnected: ______ V
- 0% Speed: ______ V
- 50% Speed: ______ V
- 100% Speed: ______ V

---

## ✅ **NON-INVERTED FAN SPEED LOGIC**

**Formula:**
```
Speed % = ((Voltage - MIN_VOLTAGE) / (MAX_VOLTAGE - MIN_VOLTAGE)) × 100
```

**Example:**
- Min voltage (0% speed): 0.5V
- Max voltage (100% speed): 1.0V
- Current reading: 0.75V

```
Speed = ((0.75 - 0.5) / (1.0 - 0.5)) × 100
      = (0.25 / 0.5) × 100
      = 50%
```

**Lower voltage = Lower speed** ✅ (Not inverted)

---

## 🔄 **COMPARISON: 24V vs 12V**

### **Expected Voltage Scaling:**

If 24V pickups give these readings through dividers:
- Disconnected: 0.5V
- ON: 0.8V - 2.6V
- OFF: 2.8V

Then 12V pickups (same dividers) should give roughly **HALF**:
- Disconnected: 0.25V
- ON: 0.4V - 1.3V
- OFF: 1.4V

**But measure yours to be sure!**

---

## 🚀 **QUICK START (Before Calibration)**

The firmware will work with estimated values, but may not be accurate:

1. Upload `ESP32_Cirrus_12V_V2.ino`
2. Configure WiFi via portal: `ESP32_Cirrus_Setup`
3. Watch Serial Monitor (115200 baud)
4. If pickups show "UNKNOWN" frequently, calibration needed
5. If fan speed is way off, calibrate fan voltage range

---

## 🎯 **AFTER CALIBRATION**

Expected behavior:
- ✅ Pickups correctly show ON/OFF/DISCONNECTED
- ✅ Fan speed accurate (0-100%)
- ✅ Dashboard displays correct data
- ✅ No "UNKNOWN" status messages

---

## 📞 **SUPPORT**

**Files:**
- `ESP32_Cirrus_12V_V2.ino` - Main firmware
- `CIRRUS_12V_CALIBRATION.md` - This guide
- `UPLOAD_GUIDE.md` - General upload instructions

**Debug Mode:**
Set `DEBUG_MODE = 1` at line 46 for detailed output

**WiFi Portal:**
Network: `ESP32_Cirrus_Setup`
IP: `192.168.4.1`

---

**Ready to calibrate and test!** 🎯

