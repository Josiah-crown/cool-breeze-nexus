# 🔄 ESP32 Reset & Reconfiguration Guide

**Problem:** ESP32 won't start WiFi config portal (AP mode)  
**Reason:** Old WiFi credentials saved in flash memory  
**Solution:** Multiple options below

---

## 🎯 **CHOOSE YOUR METHOD:**

### **Method 1: Upload Clear Memory Sketch** ⭐ EASIEST
**Use when:** First time setup, or ESP32 has old credentials

**Steps:**
1. Open `CLEAR_ESP32_MEMORY.ino` in Arduino IDE
2. Upload to ESP32
3. Wait 5 seconds (watch Serial Monitor)
4. See "✅ ALL MEMORY CLEARED!"
5. Now upload your main firmware
6. ESP32 will start in AP mode!

**Time:** 2 minutes

---

### **Method 2: Hardware Reset Button** ⭐ BEST FOR CLIENTS
**Use when:** Client changes WiFi password, need to reconfigure

**Requirements:**
- ESP32 firmware must have reset button code (✅ Already added!)
- Most ESP32 boards have a BOOT button (GPIO 0)

**Steps:**
1. **HOLD the BOOT button**
2. **PRESS the RESET button** (while still holding BOOT)
3. **RELEASE RESET** (still holding BOOT)
4. **KEEP HOLDING BOOT for 3 seconds**
5. Serial Monitor shows:
   ```
   ⚠ Reset button detected - Hold for 3 seconds...
   ...
   ✓ Reset button held - CLEARING ALL SETTINGS!
   ✅ All settings cleared! Rebooting...
   Connect to 'ESP32_HVAC_Setup' WiFi after reboot
   ```
6. ESP32 reboots and starts in AP mode!

**Time:** 10 seconds

**Perfect for clients!** No computer needed, just hold a button!

---

### **Method 3: Serial Commands** (Advanced)
**Use when:** You have Serial Monitor open

**Steps:**
1. Open Serial Monitor (115200 baud)
2. Type: `reset_config`
3. ESP32 clears settings and reboots
4. Starts in AP mode

**Note:** This requires adding serial command parsing to firmware  
(Not currently implemented, but can add if needed)

---

## 📋 **WHAT EACH METHOD CLEARS:**

All methods clear:
- ✅ WiFi SSID & Password
- ✅ Supabase URL & Anon Key
- ✅ Machine UUID
- ✅ Machine API Key

All methods preserve:
- ✅ Firmware code
- ✅ Sensor calibrations (hardcoded)
- ✅ Library installations

---

## 🚀 **AFTER CLEARING CREDENTIALS:**

ESP32 will automatically:
1. Boot up
2. Detect no WiFi credentials
3. Start WiFi Access Point: `ESP32_HVAC_Setup`
4. Serial Monitor shows:
   ```
   ========================================
     CONFIGURATION PORTAL
   ========================================
   Starting WiFiManager config portal...
   Connect to WiFi network: 'ESP32_HVAC_Setup'
   Navigate to: 192.168.4.1
   ========================================
   ```

5. Connect your phone/laptop to `ESP32_HVAC_Setup`
6. Browser opens to config page (or go to `192.168.4.1`)
7. Fill in all fields
8. Click Save
9. ESP32 connects and starts sending data!

---

## 🔧 **WHICH METHOD FOR WHICH SCENARIO:**

### **Scenario 1: First Time Setup (New ESP32)**
**Use:** Method 1 (Clear Memory Sketch)  
**Why:** Ensures fresh start

### **Scenario 2: Testing Multiple Times**
**Use:** Method 1 (Clear Memory Sketch)  
**Why:** Quick and reliable

### **Scenario 3: Client Changes WiFi Password**
**Use:** Method 2 (Hardware Reset Button)  
**Why:** No computer needed, client can do it themselves!

### **Scenario 4: ESP32 Already Installed at Client Site**
**Use:** Method 2 (Hardware Reset Button)  
**Why:** Most practical, no disassembly needed

### **Scenario 5: Debugging/Development**
**Use:** Method 1 or 2  
**Why:** Both work great

---

## ⚠️ **TROUBLESHOOTING:**

### **"I uploaded CLEAR_ESP32_MEMORY but ESP32 still won't start AP mode"**
**Solution:**
1. Upload CLEAR_ESP32_MEMORY again
2. Press RESET button on ESP32
3. Wait 10 seconds
4. Upload main firmware again

### **"I held BOOT button but nothing happened"**
**Check:**
1. Are you holding BOOT during the reboot?
2. Serial Monitor open? (you'll see messages)
3. Hold for FULL 3 seconds
4. Try: HOLD BOOT → PRESS RESET → RELEASE RESET → KEEP HOLDING BOOT

### **"AP mode starts but I can't connect to 192.168.4.1"**
**Solutions:**
1. Turn off mobile data (phone might prefer it)
2. Manually go to `http://192.168.4.1` in browser
3. Try different device
4. Check ESP32 is actually in AP mode (Serial Monitor confirms)

### **"After config, ESP32 can't connect to my WiFi"**
**Check:**
1. WiFi is 2.4GHz (ESP32 doesn't support 5GHz!)
2. Password is correct
3. WiFi name (SSID) is correct
4. WiFi has internet access
5. Try mobile hotspot as test

---

## 💡 **PRO TIPS:**

### **For Installation Techs:**
1. **Always test before installing:**
   - Upload firmware
   - Clear memory
   - Configure with test WiFi
   - Verify data flows
   - Then install at site

2. **Label the BOOT button:**
   - Put a small sticker: "HOLD 3 SEC TO RESET"
   - Clients can reconfigure without calling you!

3. **Keep credentials handy:**
   - Save client WiFi password securely
   - Save machine UUID in your records
   - Save API key (or regenerate)

### **For Clients:**
1. **WiFi Password Changed?**
   - Hold BOOT button for 3 seconds on reboot
   - Reconfigure with new password
   - Done!

2. **Moving Machine to New Location?**
   - Same process: Reset and reconfigure
   - Use new WiFi credentials

---

## 🎯 **QUICK REFERENCE:**

**To Start Fresh:**
```
Upload CLEAR_ESP32_MEMORY.ino → Upload main firmware → Configure
```

**To Reconfigure Existing ESP32:**
```
Hold BOOT + Press RESET → Release RESET → Hold BOOT 3 sec → Configure
```

**To Verify AP Mode Started:**
```
Serial Monitor shows: "Connect to WiFi network: 'ESP32_HVAC_Setup'"
Phone WiFi list shows: ESP32_HVAC_Setup
```

---

## ✅ **SUMMARY:**

**The Problem:** ESP32 remembers old WiFi, won't start config mode  
**The Fix:** Clear memory with Method 1 or 2  
**Future Reconfigurations:** Use Method 2 (reset button)  
**Client-Friendly:** Yes! Hardware button works without computer

**You're all set!** 🚀

---

**Files:**
- `CLEAR_ESP32_MEMORY.ino` - Memory clear utility
- `ESP32_HVAC_CoolBreezeNexus_V2.ino` - Main firmware (with reset button feature)
- `ESP32_Cirrus_12V_V2.ino` - Cirrus firmware (with reset button feature)




