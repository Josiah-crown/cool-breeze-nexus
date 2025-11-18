# 📊 ESP32 Files Comparison

## Files Compared

1. **ESP32_Cirrus_Optimized_2Min.ino** - Cirrus evaporative cooler
2. **ESP32_HVAC_CoolBreezeNexus_V2_Optimized.ino** - HVAC system (CoolBreeze)

---

## ✅ Common Features (Both Files Have)

### **Core Improvements:**
- ✅ Watchdog timer (60 seconds)
- ✅ Boot button hold (5 seconds) to enter config mode
- ✅ WiFi stuck detection and auto-recovery
- ✅ Improved HTTP POST timeout handling
- ✅ Auto-reset every 6 hours (improved from 24h)
- ✅ No automatic WiFi reset on connection failure
- ✅ Temperature validation (Cirrus only - HVAC uses simpler validation)
- ✅ Sensor read count tracking

### **WiFi Management:**
- ✅ WiFi OFF during sensor reading
- ✅ 2-minute data transmission interval
- ✅ Improved connection timeout handling
- ✅ Watchdog feeds during WiFi operations

### **Data Transmission:**
- ✅ 2-minute intervals (120 seconds)
- ✅ Raw data only (no calculations)
- ✅ Improved error handling
- ✅ Rate limiting support

---

## 🔄 Key Differences

### **1. Voltage Reading Method**

**Cirrus (`ESP32_Cirrus_Optimized_2Min.ino`):**
- Uses simple `readVoltage()` function
- 12V logic with 4:1 voltage divider
- Direct ADC reading (64 samples)
- Returns: `(voltage_mv / 1000.0) * 4.0`
- **Note:** Currently has a bug - uses `ADC1_CHANNEL_0` for all pins (needs fix)

**HVAC (`ESP32_HVAC_CoolBreezeNexus_V2_Optimized.ino`):**
- Uses `readStableVoltage()` with advanced filtering
- Higher voltage pickups (inverted logic)
- Moving average filter (3 readings)
- 100 ADC samples with settling time
- More sophisticated voltage thresholds
- Status detection (ON/OFF/DISCONNECTED)
- Fan speed calculation from voltage

### **2. Data Structure**

**Cirrus:**
- Simple accumulator: `motorTempSum`, `exteriorTempSum`, etc.
- Single `sensorReadCount` variable
- Sends: `voltage_input_1`, `voltage_input_2`, `voltage_input_3`, `voltage_input_4`

**HVAC:**
- Complex `SensorAccumulator` struct
- Tracks: `sampleCount` (same as `sensorReadCount`)
- Stores pickup statuses (ON/OFF/DISCONNECTED)
- Calculates fan speed
- Sends: `exhaust_voltage`, `fan_voltage`, `pump_voltage`, `drain_voltage`

### **3. Temperature Validation**

**Cirrus:**
- Advanced validation with `readTemperatureWithValidation()`
- Multiple samples (3) with averaging
- Last valid reading fallback
- Handles interference (-127°C, -999°C errors)

**HVAC:**
- Simple validation in `readTemperature()`
- Single reading
- Returns -999.0 on error
- No averaging or fallback

### **4. Sensor Read Count**

**Cirrus:**
- ✅ Sends `sensor_read_count` in JSON payload
- ✅ Tracked in database

**HVAC:**
- ❌ Does NOT send `sensor_read_count` (uses `sampleCount` but doesn't send it)
- ⚠️ **NEEDS UPDATE** - Should send `sensor_read_count` like Cirrus

### **5. JSON Payload Fields**

**Cirrus sends:**
```json
{
  "machine_id": "...",
  "motor_temp": ...,
  "inside_temp": ...,
  "outside_temp": ...,
  "current": ...,
  "voltage": ...,
  "power": ...,
  "has_water": ...,
  "voltage_input_1": ...,
  "voltage_input_2": ...,
  "voltage_input_3": ...,
  "voltage_input_4": ...,
  "sensor_read_count": 120
}
```

**HVAC sends:**
```json
{
  "machine_id": "...",
  "motor_temp": ...,
  "outside_temp": ...,
  "inside_temp": ...,
  "current": ...,
  "voltage": 230.0,
  "power": ...,
  "has_water": ...,
  "exhaust_voltage": ...,
  "fan_voltage": ...,
  "pump_voltage": ...,
  "drain_voltage": ...
  // MISSING: sensor_read_count
}
```

---

## ⚠️ Issues Found

### **1. HVAC Missing sensor_read_count**
- HVAC tracks `sampleCount` but doesn't send it
- Should add `doc["sensor_read_count"] = accumulator.sampleCount;` in `sendToSupabase()`

### **2. Cirrus Voltage Reading Bug**
- `readVoltage()` uses `ADC1_CHANNEL_0` for all pins
- Should map pin to correct ADC channel (like we fixed earlier)

---

## 📋 Summary

### **Both Files Have:**
- ✅ Same core improvements (watchdog, boot button, WiFi handling)
- ✅ Same timing (2-minute intervals)
- ✅ Same reliability features
- ✅ Same WiFi management

### **Main Differences:**
1. **Voltage Reading:** HVAC has more sophisticated filtering and status detection
2. **Temperature Validation:** Cirrus has advanced multi-sample validation
3. **Data Structure:** HVAC uses struct, Cirrus uses simple variables
4. **JSON Fields:** Different field names (voltage_input vs exhaust_voltage, etc.)
5. **Sensor Read Count:** Cirrus sends it, HVAC doesn't (needs update)

---

## 🔧 Recommended Updates

1. **Add sensor_read_count to HVAC:**
   ```cpp
   doc["sensor_read_count"] = accumulator.sampleCount;
   ```

2. **Fix Cirrus voltage reading:**
   - Map pin to correct ADC channel (already identified earlier)

3. **Consider adding temperature validation to HVAC:**
   - Could benefit from multi-sample averaging like Cirrus

---

## ✅ Verification

**Both files are:**
- ✅ Latest versions with all improvements
- ✅ Use same timing (2-minute intervals)
- ✅ Have same reliability features
- ✅ Work the same way (core functionality)

**Main difference:**
- HVAC has more sophisticated voltage pickup handling (inverted, higher voltage, filtering)
- Cirrus has more sophisticated temperature validation (multi-sample, fallback)


