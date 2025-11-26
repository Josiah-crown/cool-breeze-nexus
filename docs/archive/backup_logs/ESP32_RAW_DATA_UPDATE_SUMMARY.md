# ESP32 Raw Data Update - Summary

**Date:** 2025-11-11  
**Status:** ✅ ESP32 Firmware Updated | ⏳ Server-Side Pending

---

## What Changed

### ESP32 Firmware (Both HVAC & Cirrus)

**BEFORE:**
- ESP32 computed business logic on-device
- Sent derived fields: `overall_status`, `is_cooling`, `delta_t`, `fan_active`, `is_on`, etc.
- Hard-coded thresholds in firmware
- Required reflashing to update rules

**AFTER:**
- ESP32 sends **raw sensor data only**
- Server computes all business logic
- Firmware just samples and transmits
- Can update rules without touching devices

---

## Current Raw Data Payload

```json
{
  "machine_id": "uuid",
  
  // Temperatures
  "motor_temp": 23.5,
  "outside_temp": 22.8,
  "inside_temp": 24.1,
  
  // Power
  "current": 1.25,
  "voltage": 230,
  "power": 287.5,
  
  // Water
  "has_water": true,
  
  // Control Voltages
  "exhaust_voltage": 11.2,
  "fan_voltage": 8.7,
  "pump_voltage": 0.3,
  "drain_voltage": 0.2
}
```

**Total: 11 fields** (machine_id + 9 sensors + voltage constant)

---

## Updated Files

1. **`hardware/esp32/ESP32_Cirrus_12V_V2/ESP32_Cirrus_12V_V2.ino`**
   - Removed all `determineOverallStatus()` calls
   - Removed computed fields from payload
   - Updated serial output
   - Reduced JSON buffer size (1024 → 768 bytes)
   - Changed send interval to 30 seconds

2. **`hardware/esp32/ESP32_HVAC_CoolBreezeNexus_V2/ESP32_HVAC_CoolBreezeNexus_V2.ino`**
   - Same changes as Cirrus for consistency
   - Both firmwares now send identical raw schema

3. **`hardware/esp32/ESP32_RAW_DATA_SPECIFICATION.md`** *(NEW)*
   - Complete documentation of raw data flow
   - Server-side processing examples (SQL & TypeScript)
   - Testing procedures
   - Implementation checklist

4. **`docs/COMPLETE_SETUP_GUIDE.md`** *(UPDATED EARLIER)*
   - Comprehensive setup guide from scratch

---

## Server-Side Work Required

### Phase 1: Update Edge Function
File: `supabase/functions/esp32-data-receiver/index.ts`

```typescript
// Currently expects old schema with computed fields
// NEEDS UPDATE to accept raw-only payload and compute:
// - delta_t = |outside_temp - inside_temp|
// - fan_active = fan_voltage > 6.0
// - pump_active = pump_voltage > 6.0
// - drain_active = drain_voltage > 6.0
// - exhaust_active = exhaust_voltage > 6.0
// - is_on = pump_active
// - is_cooling = pump_active OR drain_active
// - fan_speed = calculate from fan_voltage
// - overall_status = determine from temps + states
```

### Phase 2: Update Database Trigger
File: SQL migration

```sql
-- Current trigger: update_machine_from_reading()
-- Needs to compute derived fields from raw voltages
-- See ESP32_RAW_DATA_SPECIFICATION.md for SQL example
```

### Phase 3: Test with Live Device
- Flash updated firmware
- Monitor serial output (should show "RAW DATA")
- Check `readings_raw` table receives raw values
- Verify `machines` table gets computed values
- Confirm dashboard displays correctly

---

## Benefits of This Change

1. **Security**: Machine API key validated server-side before insertion
2. **Flexibility**: Update thresholds/logic without reflashing 1000s of devices
3. **Consistency**: Single source of truth for all calculations
4. **Auditability**: Can reprocess historical data with new rules
5. **Scalability**: Per-client customization without firmware forks
6. **Debugging**: Raw voltages preserved for troubleshooting

---

## Next Steps

### Immediate (Before Next ESP32 Test)
1. Update `esp32-data-receiver` Edge Function to:
   - Accept raw-only payload
   - Compute derived fields
   - Insert into `readings_raw` with service role

2. Update database trigger `update_machine_from_reading()`:
   - Add voltage interpretation logic
   - Compute fan speed from `fan_voltage`
   - Determine `overall_status` server-side

### Short-Term
3. Test with one live Cirrus device
4. Verify dashboard shows correct data
5. Compare old vs new data flow

### Long-Term
6. Add configurable thresholds table
7. Build alert rules engine
8. Implement historical reprocessing
9. Add per-client customization

---

## Testing Checklist

- [ ] Flash Cirrus firmware with raw-only code
- [ ] Connect serial monitor, verify "RAW DATA" output
- [ ] Check `readings_raw` table for raw values
- [ ] Verify Edge Function accepts payload
- [ ] Confirm `machines` table updated with computed fields
- [ ] Dashboard shows correct temps/status
- [ ] Voltages graph correctly (if implemented)
- [ ] Repeat for HVAC firmware

---

## Rollback Plan

If server-side processing isn't ready yet:

1. Keep the ESP32 sending raw data (already done)
2. Temporarily add computed fields in Edge Function:
   ```typescript
   const derivedFields = {
     delta_t: Math.abs(raw.outside_temp - raw.inside_temp),
     fan_active: raw.fan_voltage > 6.0,
     is_on: raw.pump_voltage > 6.0,
     // ... etc
   };
   await supabase.from('readings_raw').insert({
     ...raw,
     ...derivedFields
   });
   ```

---

## Documentation References

- **Detailed Spec**: `hardware/esp32/ESP32_RAW_DATA_SPECIFICATION.md`
- **Setup Guide**: `docs/COMPLETE_SETUP_GUIDE.md`
- **Optimization Chat**: `c:\Users\HP\Desktop\cursor_optimize_data_flow_to_supabase.md`

---

**Status:** ESP32 firmware ready to test once server-side processing is implemented.

