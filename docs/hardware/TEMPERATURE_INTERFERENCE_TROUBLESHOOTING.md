# 🌡️ DS18B20 Temperature Sensor Interference Troubleshooting

## Problem

Temperature readings become erratic when machine is turned on:
- Readings jump to -127°C or -999°C (DS18B20 error codes)
- Readings are completely out of range
- Readings are inconsistent
- Works fine in lab, fails in real-world installation

**Root Cause:** Electrical interference through metal cover of DS18B20 sensors

---

## 🔍 DS18B20 Error Codes

The DS18B20 library returns specific error codes:
- **-127°C**: Sensor disconnected or communication error
- **-999°C**: Invalid reading or sensor failure
- **Out of range**: Values < -50°C or > 120°C are likely invalid

---

## 🛠️ Code Fixes (ESP32)

### **1. Add Temperature Validation**

The ESP32 code needs to:
- ✅ Validate readings before sending
- ✅ Retry on failure
- ✅ Average multiple readings
- ✅ Use last valid reading if current fails
- ✅ Reject obviously bad values

**File:** `hardware/esp32/ESP32_Cirrus_Optimized_2Min/TEMPERATURE_VALIDATION_FIX.ino`

**Key Functions:**
- `isValidTemperature()` - Checks for error codes and range
- `readTemperatureWithValidation()` - Multiple samples + averaging
- `readTemperatureWithRetry()` - Retry logic

### **2. Update readSensors() Function**

Replace the current temperature reading code with validated version:

```cpp
void readSensors() {
  // Disable WiFi during sensor reading (reduces interference)
  if (wifiEnabled) {
    WiFi.mode(WIFI_OFF);
    wifiEnabled = false;
    delay(100);
  }
  
  // Read with validation
  motorTemp = readTemperatureWithValidation(sensorMotor, lastValidMotorTemp);
  exteriorTemp = readTemperatureWithValidation(sensorExterior, lastValidExteriorTemp);
  interiorTemp = readTemperatureWithValidation(sensorInterior, lastValidInteriorTemp);
  
  // ... rest of sensor readings
}
```

---

## 🛡️ Database Validation (Supabase)

### **Added Validation Function**

The database now validates temperatures before processing:
- Rejects -127°C, -999°C (error codes)
- Rejects out-of-range values (< -50°C or > 120°C)
- Skips processing if temperatures are invalid
- Deletes invalid raw data

**Migration:** `20250108000009_add_temperature_validation.sql`

---

## 🔧 Hardware Fixes

### **1. Electrical Isolation**

**Problem:** Metal cover of DS18B20 picking up interference

**Solutions:**
- ✅ **Insulate the sensor** - Wrap in electrical tape or heat shrink
- ✅ **Ground the shield** - Connect metal cover to ground (if possible)
- ✅ **Use shielded cable** - Shield connected to ground at ESP32 end only
- ✅ **Add ferrite core** - On data line near sensor
- ✅ **Keep sensors away from motors/pumps** - Physical separation

### **2. Wiring Improvements**

- ✅ **Twisted pair cable** - Reduces interference
- ✅ **Keep data line short** - < 1 meter if possible
- ✅ **Separate from power lines** - Don't run parallel to AC lines
- ✅ **Add pullup resistor** - 4.7kΩ on data line (usually already present)
- ✅ **Use shielded cable** - With shield grounded at one end

### **3. Power Supply**

- ✅ **Clean power** - Use filtered/regulated power supply
- ✅ **Separate grounds** - Keep sensor ground separate from motor ground
- ✅ **Add decoupling capacitors** - 100nF near ESP32 power pins

### **4. Software Timing**

- ✅ **Disable WiFi during reading** - Already in code
- ✅ **Wait for conversion** - DS18B20 needs 750ms for 12-bit resolution
- ✅ **Multiple samples** - Average 3-5 readings
- ✅ **Retry on failure** - Try 2-3 times before giving up

---

## 🐛 Potential Bugs to Watch For

### **1. Timing Issues**
- ❌ **Not waiting for conversion** - DS18B20 needs 750ms
- ❌ **Reading too fast** - Multiple sensors need time
- ✅ **Fix:** Add delays between readings

### **2. WiFi Interference**
- ❌ **WiFi ON during reading** - Causes ADC interference
- ✅ **Fix:** Already implemented - WiFi OFF during reading

### **3. Sensor Initialization**
- ❌ **Not checking if sensor exists** - getDeviceCount() should be > 0
- ✅ **Fix:** Add sensor count check in setup()

### **4. OneWire Bus Issues**
- ❌ **Multiple sensors on same bus** - Can cause conflicts
- ✅ **Fix:** Use separate OneWire instances (already done)

### **5. Power Supply Noise**
- ❌ **Noisy power supply** - Affects ADC readings
- ✅ **Fix:** Use clean power, add capacitors

### **6. Ground Loops**
- ❌ **Multiple ground paths** - Causes interference
- ✅ **Fix:** Single point ground, isolate sensor ground

---

## 📋 Testing Checklist

### **Before Deployment:**
- [ ] Test with machine OFF - Should get consistent readings
- [ ] Test with machine ON - Check for interference
- [ ] Test with all components running - Fan, pump, drain
- [ ] Verify no -127°C or -999°C readings
- [ ] Verify readings are within expected range
- [ ] Check Serial Monitor for validation messages

### **After Hardware Fixes:**
- [ ] Test with insulation applied
- [ ] Test with shielded cable
- [ ] Test with ferrite core
- [ ] Compare readings before/after fixes
- [ ] Monitor for 24 hours

---

## 🔬 Debugging Steps

### **1. Enable Debug Mode**
```cpp
#define DEBUG_MODE 1
```

### **2. Monitor Serial Output**
- Watch for "Invalid temp reading" messages
- Check retry counts
- Verify last valid values being used

### **3. Check Database**
```sql
-- Check for invalid temperatures in raw data
SELECT * FROM readings_raw 
WHERE motor_temp < -50 OR motor_temp > 120
   OR motor_temp = -127 OR motor_temp = -999
ORDER BY created_at DESC;
```

### **4. Compare Readings**
- Compare readings when machine is OFF vs ON
- Check if specific components cause interference (fan, pump, etc.)
- Note which sensor is most affected

---

## 🎯 Expected Behavior After Fixes

### **ESP32:**
- ✅ Validates all temperature readings
- ✅ Retries on failure
- ✅ Uses last valid reading if current fails
- ✅ Only sends valid data to Supabase

### **Database:**
- ✅ Rejects invalid temperatures
- ✅ Skips processing bad readings
- ✅ Deletes invalid raw data
- ✅ Only stores valid processed data

### **Result:**
- ✅ No -127°C or -999°C in database
- ✅ Consistent temperature readings
- ✅ Graceful handling of interference
- ✅ System continues working even with occasional bad readings

---

## 📚 Additional Resources

- **DS18B20 Datasheet:** Check timing requirements
- **OneWire Protocol:** Understand communication timing
- **ESP32 ADC Issues:** WiFi interference with ADC
- **Electrical Interference:** EMI/RFI mitigation techniques

---

## ⚠️ Important Notes

1. **Validation is critical** - Don't send invalid data to database
2. **Last valid reading** - Better than sending -127°C
3. **Hardware fixes are best** - Code fixes are a safety net
4. **Test thoroughly** - Electrical interference is unpredictable
5. **Monitor long-term** - Some issues only appear after hours/days

---

## 🚀 Quick Fix Implementation

1. **Add validation code** to ESP32 (see `TEMPERATURE_VALIDATION_FIX.ino`)
2. **Update readSensors()** function
3. **Run database migration** (`20250108000009_add_temperature_validation.sql`)
4. **Test with machine ON**
5. **Apply hardware fixes** (insulation, shielding)
6. **Retest and verify**

---

## 💡 Pro Tips

- **Start with software validation** - Quick to implement
- **Then apply hardware fixes** - More permanent solution
- **Use both** - Defense in depth
- **Monitor and adjust** - Every installation is different
- **Document what works** - For future installations


