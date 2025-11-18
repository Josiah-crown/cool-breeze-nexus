# 🌐 Cirrus Website Logic Requirements

## Overview

This document defines the exact logic for LED status indicators on the website for Cirrus evaporative coolers.

---

## LED Status Logic

### **1. Power LED (Rename to "Connected")**

**Logic:**
- ✅ **ON (Green)**: Supabase has received a post from the device in the past 10 minutes
- ❌ **OFF (Gray)**: No posts received in the past 10 minutes

**Implementation:**
- Check `cirrus.is_connected` field (calculated: last reading within 10 minutes)
- OR query: `SELECT MAX(timestamp) FROM cirrus WHERE machine_id = ? AND timestamp > NOW() - INTERVAL '10 minutes'`

**Current Status:**
- ✅ Table has `is_connected` field
- ⚠️ Need to verify calculation in trigger is correct (last reading within 10 min)

---

### **2. Fan LED**

**Logic:**
- ✅ **ON (Green)**: Any voltage reading from FAN in the past 10 minutes
- ❌ **OFF (Gray)**: No FAN voltage readings in the past 10 minutes

**Implementation:**
- Query: `SELECT COUNT(*) FROM cirrus WHERE machine_id = ? AND fan_active = true AND timestamp > NOW() - INTERVAL '10 minutes'`
- If count > 0, LED is ON

**Current Status:**
- ✅ Table has `fan_active` field
- ✅ Trigger calculates `fan_active` from voltage inputs
- ⚠️ Need to implement 10-minute window check in frontend

---

### **3. Cooling LED**

**Logic:**
- ✅ **ON (Green)**: Any voltage reading from FAN in the past 10 minutes
- ❌ **OFF (Gray)**: No FAN voltage readings in the past 10 minutes

**Note:** This seems to be the same as Fan LED. Please confirm:
- Should this check `pump_active` instead?
- Or should it check `is_cooling` (which is `pump_active OR drain_active`)?

**Current Status:**
- ✅ Table has `is_cooling` field (calculated as `pump_active OR drain_active`)
- ⚠️ Need clarification on exact logic

---

### **4. Water Level LED**

**Logic:**
- 🟢 **GREEN**: 
  - Cooling is on for more than 10 minutes
  - AND water level indicates full for more than 2 minute interval every 10 minutes
- 🔴 **RED**: 
  - After 30 minutes of "cooling" active
  - AND no water level full indication

**Implementation:**
- Query last 30 minutes of data
- Check if `is_cooling = true` for > 30 minutes
- Check if `has_water = true` for at least 2 minutes in each 10-minute window
- **Important:** We can only read FULL/EMPTY (boolean), not actual water level percentage

**Current Status:**
- ✅ Table has `has_water` (boolean) - CORRECT
- ❌ Table has `water_level NUMERIC(5,2)` - **SHOULD BE REMOVED** (we can't read this)
- ⚠️ Need to remove `water_level` column or set it based on `has_water` only

---

### **5. Motor Status LED**

**Logic:**
- 🔴 **RED**: 
  - Motor pulls more current than the set amount
  - OR motor heats up more than the set amount
- 🟢 **GREEN**: 
  - Current within limits
  - AND temperature within limits

**Implementation:**
- Check `motor_status` field (calculated from `machine_alert_config` thresholds)
- OR check `motor_temp_within_parameters` AND `current_within_parameters`
- Thresholds come from `machine_alert_config` table:
  - `motor_temp_warning` / `motor_temp_critical`
  - `motor_amps_warning` / `motor_amps_critical`

**Current Status:**
- ✅ Table has `motor_status` field ('normal', 'warning', 'critical')
- ✅ Table has `motor_temp_within_parameters` and `current_within_parameters` flags
- ✅ Trigger calculates these from `machine_alert_config`
- ⚠️ Need to verify frontend uses these correctly

---

## Table Corrections Needed

### **1. Remove `water_level` Column**

**Issue:** Table has `water_level NUMERIC(5,2)` but we can only read FULL/EMPTY (boolean)

**Solution:**
```sql
-- Option 1: Remove the column entirely
ALTER TABLE public.cirrus DROP COLUMN IF EXISTS water_level;

-- Option 2: Keep it but always set based on has_water
-- (Already done in trigger: CASE WHEN v_has_water THEN 100.0 ELSE 0.0 END)
```

**Recommendation:** Remove the column since it's misleading. We only have boolean water status.

---

## Frontend Implementation Requirements

### **1. Connected LED (formerly Power)**

```typescript
// Check if last reading was within 10 minutes
const isConnected = machine.isConnected; // From cirrus.is_connected
// OR
const lastReading = await supabase
  .from('cirrus')
  .select('timestamp')
  .eq('machine_id', machineId)
  .order('timestamp', { ascending: false })
  .limit(1)
  .single();
  
const isConnected = lastReading && 
  (new Date() - new Date(lastReading.timestamp)) < 10 * 60 * 1000;
```

### **2. Fan LED**

```typescript
// Check if any fan reading in last 10 minutes
const { count } = await supabase
  .from('cirrus')
  .select('*', { count: 'exact', head: true })
  .eq('machine_id', machineId)
  .eq('fan_active', true)
  .gte('timestamp', new Date(Date.now() - 10 * 60 * 1000).toISOString());

const fanActive = (count ?? 0) > 0;
```

### **3. Cooling LED**

```typescript
// Check if any cooling reading in last 10 minutes
// NOTE: Need clarification - should this check fan_active or is_cooling?
const { count } = await supabase
  .from('cirrus')
  .select('*', { count: 'exact', head: true })
  .eq('machine_id', machineId)
  .eq('is_cooling', true) // OR fan_active?
  .gte('timestamp', new Date(Date.now() - 10 * 60 * 1000).toISOString());

const coolingActive = (count ?? 0) > 0;
```

### **4. Water Level LED**

```typescript
// Complex logic: Check last 30 minutes
const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
const { data: readings } = await supabase
  .from('cirrus')
  .select('timestamp, is_cooling, has_water')
  .eq('machine_id', machineId)
  .gte('timestamp', thirtyMinutesAgo.toISOString())
  .order('timestamp', { ascending: true });

// Check if cooling has been active for > 30 minutes
const coolingDuration = calculateActiveDuration(readings, 'is_cooling');
const hasCoolingFor30Min = coolingDuration >= 30 * 60 * 1000;

if (hasCoolingFor30Min) {
  // Check if water was full for at least 2 min in each 10-min window
  const waterStatus = checkWaterInWindows(readings);
  // Green if water was full in windows, Red if not
}
```

### **5. Motor Status LED**

```typescript
// Use calculated motor_status or check flags
const motorStatus = machine.motorStatus; // 'normal', 'warning', 'critical'
// OR
const isMotorOK = machine.motorTempWithinParameters && 
                  machine.currentWithinParameters;

const motorLED = (motorStatus === 'critical' || !isMotorOK) ? 'error' : 'active';
```

---

## Questions for Clarification

1. **Cooling LED**: Should it check `fan_active` or `is_cooling` (pump/drain)?
2. **Water Level Logic**: 
   - "for more than 2 minute interval every 10 minutes" - does this mean:
     - At least 2 minutes of full water in each 10-minute window?
     - Or at least 2 minutes total in the last 10 minutes?
3. **Motor Status**: Should it be red for both warning AND critical, or only critical?

---

## Summary

### ✅ What's Correct:
- `is_connected` field exists
- `fan_active` field exists
- `is_cooling` field exists
- `has_water` field exists (boolean - correct)
- `motor_status` field exists
- Parameter compliance flags exist

### ❌ What Needs Fixing:
- Remove `water_level` column (we can't read actual level)
- Implement 10-minute window checks in frontend
- Implement complex water level logic (30-minute window with 10-minute sub-windows)
- Clarify cooling LED logic (fan vs pump)

### ⚠️ What Needs Verification:
- `is_connected` calculation in trigger (10-minute window)
- Frontend uses correct fields for LED status
- Motor status thresholds are correct

