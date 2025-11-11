# 🔧 Building Multiple ESP32 Prototypes - Quick Guide

**Goal:** Build 2-3 ESP32 prototypes today  
**Time:** ~2.5 hours total  
**Firmware:** Already done! ✅

---

## 📦 **PARTS LIST (Per Prototype)**

### **Required Components:**
- [ ] 1× ESP32 Dev Module
- [ ] 3× DS18B20 Temperature Sensors (with 4.7kΩ pullup resistors)
- [ ] 1× CT Sensor (SCT-013-000 or similar)
- [ ] 1× Float Switch
- [ ] 4× Voltage Divider Circuits (for 24V or 12V pickups)
- [ ] Breadboard or PCB
- [ ] Jumper wires
- [ ] USB cable (power + programming)

### **Optional (Recommended):**
- [ ] 3.3V regulator (if powering from external source)
- [ ] Enclosure/case
- [ ] Terminal blocks for easy connections
- [ ] LED status indicators

---

## ⚡ **EFFICIENT BUILD PROCESS**

### **Strategy: Assembly Line Approach**

**Instead of building one complete prototype at a time, do each step for ALL prototypes:**

1. **Step 1: Layout** (10 min for all)
   - Place all 3 ESP32s on workbench
   - Organize components for each
   - Label each prototype (#1, #2, #3)

2. **Step 2: Power Rails** (15 min for all)
   - Connect 3.3V and GND rails on all breadboards
   - Power up all ESP32s
   - Test power LEDs

3. **Step 3: Temperature Sensors** (20 min for all)
   - Connect all 3 DS18B20s to each prototype:
     - Motor temp → GPIO 21
     - Outside temp → GPIO 22
     - Inside temp → GPIO 23
   - Add 4.7kΩ pullup resistors
   - Test: Upload basic temp reading sketch

4. **Step 4: CT Sensors** (15 min for all)
   - Connect CT to GPIO 36 on all units
   - Add any required burden resistors
   - Test: Upload CT reading sketch

5. **Step 5: Float Switches** (10 min for all)
   - Connect to GPIO 5 (INPUT_PULLUP)
   - GND to switch other terminal
   - Test: Read digital state

6. **Step 6: Voltage Pickups** (30 min for all)
   - **Most complex part!**
   - Connect 4 voltage dividers:
     - Yellow → GPIO 34
     - Green → GPIO 35
     - Brown → GPIO 32
     - Black → GPIO 33
   - **CALIBRATE VOLTAGE DIVIDERS:**
     - Test with 24V or 12V input
     - Verify output < 3.3V
     - Adjust resistors if needed

---

## 🎯 **WIRING DIAGRAM (All Prototypes Use Same Pinout)**

```
ESP32 Pin Map:
=============
GPIO 21 ────→ Motor Temp (DS18B20)
GPIO 22 ────→ Outside Temp (DS18B20)
GPIO 23 ────→ Inside Temp (DS18B20)

GPIO 36 ────→ CT Sensor (Analog)

GPIO 5  ────→ Float Switch (Digital, INPUT_PULLUP)

GPIO 34 ────→ Yellow Pickup (Exhaust) - Analog
GPIO 35 ────→ Green Pickup (Fan) - Analog
GPIO 32 ────→ Brown Pickup (Pump) - Analog
GPIO 33 ────→ Black Pickup (Drain) - Analog

GND ─────────→ Common Ground
3.3V ────────→ Power Rail
```

---

## 💻 **FIRMWARE UPLOAD (10 min per prototype)**

### **Batch Upload Process:**

**Prototype #1 (Evap Cooler 24V):**
1. Open `ESP32_HVAC_CoolBreezeNexus_V2.ino`
2. Select Board: ESP32 Dev Module
3. Select Port: COM# (varies)
4. Click Upload
5. **While uploading Prototype #1**, prepare #2

**Prototype #2 (Cirrus 12V):**
1. Open `ESP32_Cirrus_12V_V2.ino`
2. Select Port: COM# (different)
3. Click Upload
4. **While uploading**, prepare #3

**Prototype #3 (Choose type):**
1. Open appropriate `.ino` file
2. Upload
3. Done!

**Total upload time:** 30 min (if done efficiently)

---

## 📡 **WIFI CONFIGURATION (5 min per prototype)**

### **Quick Config Process:**

**For Each Prototype:**
1. Power on ESP32
2. Look for WiFi network: `ESP32_HVAC_Setup` or `ESP32_Cirrus_Setup`
3. Connect phone/laptop
4. Browser opens to `192.168.4.1` (or navigate manually)
5. **Fill in form ONCE, screenshot it!** 📸
   - SSID: [Your WiFi]
   - Password: [Your Password]
   - Supabase URL: `https://wjyanxstvbiqefmgpccb.supabase.co`
   - Supabase Anon Key: [Copy from guide]
   - Machine UUID: [Unique per prototype!]
   - Machine API Key: [Unique per prototype!]
6. Save
7. ESP32 reboots and connects

**Time-saving tip:** Pre-generate all UUIDs and API keys in dashboard first!

---

## 🎛️ **DASHBOARD SETUP (5 min per prototype)**

### **Pre-Generate Everything:**

**Before configuring any ESP32, do this in dashboard:**

1. **Create 3 Machines:**
   - Machine #1: "R32 Evap Cooler Demo"
   - Machine #2: "Cirrus 12V Demo"
   - Machine #3: "Backup Demo Unit"

2. **Generate 3 API Keys:**
   - Key #1: "R32 Demo Key"
   - Key #2: "Cirrus Demo Key"
   - Key #3: "Backup Key"

3. **Copy All UUIDs and Keys:**
   - Create a text file with all credentials
   - Keep it handy during ESP32 configuration

**Example:**
```
Prototype #1:
  Machine UUID: 550e8400-e29b-41d4-a716-446655440001
  API Key: sk_live_abc123...
  
Prototype #2:
  Machine UUID: 550e8400-e29b-41d4-a716-446655440002
  API Key: sk_live_def456...
  
Prototype #3:
  Machine UUID: 550e8400-e29b-41d4-a716-446655440003
  API Key: sk_live_ghi789...
```

---

## ✅ **TESTING (5 min per prototype)**

### **Quick Test Checklist:**

**For Each Prototype:**
1. Open Serial Monitor (115200 baud)
2. Wait 60 seconds for first transmission
3. Look for:
   ```
   ✓ WiFi connected!
   ✓ Data sent successfully!
   HTTP Code: 201
   ```
4. Check dashboard:
   - Machine shows "Connected" (green)
   - Temperature readings appear
   - Current shows (when fan running)
5. **If successful:** ✅ Mark as complete
6. **If errors:** Check Serial Monitor for hints

---

## 🔧 **TROUBLESHOOTING (Common Issues)**

### **Issue 1: "WiFi connection failed"**
**Solution:**
- Check SSID/password spelling
- Ensure 2.4GHz WiFi (ESP32 doesn't support 5GHz!)
- Move closer to router
- Try mobile hotspot as test

### **Issue 2: "HTTP Code: 401"**
**Solution:**
- API key is wrong
- Generate new key in dashboard
- Reconfigure ESP32 WiFiManager

### **Issue 3: "HTTP Code: 404"**
**Solution:**
- Machine UUID doesn't exist
- Create machine in dashboard first
- Copy exact UUID (with hyphens)

### **Issue 4: Temp sensors read -999.0**
**Solution:**
- DS18B20 not connected
- Check wiring (VCC, GND, DATA)
- Add 4.7kΩ pullup resistor
- Test each sensor individually

### **Issue 5: Pickups show "UNKNOWN"**
**Solution:**
- Voltage divider issue
- Check input voltage (24V or 12V)
- Verify output < 3.3V
- Adjust resistors
- **For 12V Cirrus:** Calibrate thresholds!

---

## 📊 **PROGRESS TRACKING**

### **Prototype #1: R32 Evap Cooler (24V)**
- [ ] Hardware assembled
- [ ] Firmware uploaded
- [ ] WiFi configured
- [ ] Dashboard shows data
- [ ] All sensors working
- [ ] **READY FOR DEMO** ✅

### **Prototype #2: Cirrus (12V)**
- [ ] Hardware assembled
- [ ] Firmware uploaded
- [ ] **12V calibration done** ⚠️
- [ ] WiFi configured
- [ ] Dashboard shows data
- [ ] All sensors working
- [ ] **READY FOR DEMO** ✅

### **Prototype #3: [Type]**
- [ ] Hardware assembled
- [ ] Firmware uploaded
- [ ] WiFi configured
- [ ] Dashboard shows data
- [ ] All sensors working
- [ ] **READY FOR DEMO** ✅

---

## ⏱️ **REALISTIC TIME ESTIMATE**

### **Per Prototype:**
- Hardware assembly: 30-40 min
- Firmware upload: 10 min
- WiFi config: 5 min
- Testing: 5 min
- **Total:** ~50 min

### **For 3 Prototypes:**
- Assembly (all 3): 90 min
- Upload (all 3): 30 min
- Config (all 3): 15 min
- Testing (all 3): 15 min
- **TOTAL:** ~2.5 hours

**Buffer for issues:** +30 min  
**REALISTIC TOTAL:** 3 hours

---

## 🎯 **GOAL FOR TODAY**

**By End of Day:**
- ✅ 2-3 working ESP32 prototypes
- ✅ All connected to dashboard
- ✅ Real sensor data flowing
- ✅ Ready to show in demo tomorrow

**What You'll Have:**
- Physical proof of concept
- Real-time data on dashboard
- Impressive demo material
- Backup units if one fails

---

## 💡 **PRO TIPS**

1. **Label everything!** Use tape to mark each prototype
2. **Test as you go** - Don't wait until all 3 are built
3. **Keep spares** - Extra sensors, wires, ESP32s
4. **Document issues** - Note any calibration values
5. **Take photos** - Of working prototypes for demo
6. **Power management** - Use quality USB cables
7. **Serial Monitor** - Keep open for all prototypes
8. **Dashboard** - Keep open to see real-time updates

---

## 🚀 **YOU'VE GOT THIS!**

**Building 3 ESP32 prototypes is ambitious but totally doable!**

**Remember:**
- Firmware is done ✅
- Dashboard is ready ✅
- You just need to wire and upload ✅
- 3 hours and you're golden! ✅

**Good luck! The demo tomorrow will be amazing!** 🎉

---

**Need help?** All firmware is in `hardware/esp32/`:
- `ESP32_HVAC_CoolBreezeNexus_V2.ino`
- `ESP32_Cirrus_12V_V2.ino`
- `UPLOAD_GUIDE.md`
- `CIRRUS_12V_CALIBRATION.md`

