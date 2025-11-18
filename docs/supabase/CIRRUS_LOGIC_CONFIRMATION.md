# ✅ Cirrus Website Logic - Confirmation

## Your Requirements (I Understand)

### **1. Power LED → "Connected" LED** ✅
- **ON**: Supabase received a post from device in past 10 minutes
- **OFF**: No posts in past 10 minutes
- **Implementation**: Check `cirrus.is_connected` (calculated: last reading within 10 min)

### **2. Fan LED** ✅
- **ON**: Any voltage reading from FAN in past 10 minutes
- **OFF**: No FAN voltage readings in past 10 minutes
- **Implementation**: Query `fan_active = true` in last 10 minutes

### **3. Cooling LED** ⚠️
- **ON**: Any voltage reading from FAN in past 10 minutes
- **OFF**: No FAN voltage readings in past 10 minutes
- **QUESTION**: You said "FAN" for both Fan and Cooling. Should Cooling check `pump_active` or `is_cooling` (pump OR drain) instead?

### **4. Water Level LED** ✅
- **GREEN**: 
  - Cooling on > 10 minutes
  - AND water level full for > 2 minute interval every 10 minutes
- **RED**: 
  - After 30 minutes of cooling active
  - AND no water level full indication
- **Note**: We can only read FULL/EMPTY (boolean `has_water`), not actual level

### **5. Motor Status LED** ✅
- **RED**: 
  - Current > set amount (from `machine_alert_config.motor_amps_warning`)
  - OR temperature > set amount (from `machine_alert_config.motor_temp_warning`)
- **GREEN**: 
  - Current within limits
  - AND temperature within limits

---

## Issues Fixed

### **1. Removed `water_level` Column** ✅

**Problem:**
- Table had `water_level NUMERIC(5,2)` 
- But we can only read FULL/EMPTY (boolean `has_water`)
- This column was misleading

**Solution:**
- ✅ Created migration to remove `water_level` column
- ✅ Updated processor to remove `water_level` references
- ✅ Updated table definition to remove `water_level`

**Files Updated:**
- `20250108000000_create_cirrus_table.sql` - Removed column definition
- `20250108000001_create_cirrus_processor.sql` - Removed from INSERT/UPDATE
- `20250108000014_remove_water_level_column.sql` - Migration to drop column

---

## Table Structure (Corrected)

### ✅ **Correct Fields:**
- `is_connected` - Connection status (10-minute window check)
- `fan_active` - Fan voltage reading (boolean)
- `is_cooling` - Cooling status (pump OR drain active)
- `has_water` - Water status (boolean: true = full, false = empty)
- `motor_status` - Motor status ('normal', 'warning', 'critical')
- `motor_temp_within_parameters` - Temperature compliance flag
- `current_within_parameters` - Current compliance flag

### ✅ **Removed:**
- `water_level` - Removed (we can't read actual level)

---

## Frontend Implementation Needed

### **1. Connected LED**
```typescript
// Use is_connected field (already calculated in database)
const isConnected = machine.isConnected;
```

### **2. Fan LED**
```typescript
// Query last 10 minutes for fan_active = true
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
// ⚠️ NEED CLARIFICATION: Check fan_active or is_cooling?
// For now, using is_cooling (pump OR drain active)
const { count } = await supabase
  .from('cirrus')
  .select('*', { count: 'exact', head: true })
  .eq('machine_id', machineId)
  .eq('is_cooling', true)
  .gte('timestamp', new Date(Date.now() - 10 * 60 * 1000).toISOString());

const coolingActive = (count ?? 0) > 0;
```

### **4. Water Level LED**
```typescript
// Complex logic: Check last 30 minutes
// - Cooling active for > 30 minutes
// - Water full for > 2 min in each 10-min window
const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
const { data: readings } = await supabase
  .from('cirrus')
  .select('timestamp, is_cooling, has_water')
  .eq('machine_id', machineId)
  .gte('timestamp', thirtyMinutesAgo.toISOString())
  .order('timestamp', { ascending: true });

// Calculate cooling duration
const coolingDuration = calculateActiveDuration(readings, 'is_cooling');
const hasCoolingFor30Min = coolingDuration >= 30 * 60 * 1000;

if (hasCoolingFor30Min) {
  // Check water in 10-minute windows
  const waterStatus = checkWaterInWindows(readings);
  // Green if water was full in windows, Red if not
}
```

### **5. Motor Status LED**
```typescript
// Use motor_status or compliance flags
const motorStatus = machine.motorStatus; // 'normal', 'warning', 'critical'
const isMotorOK = machine.motorTempWithinParameters && 
                  machine.currentWithinParameters;

const motorLED = (motorStatus === 'critical' || motorStatus === 'warning' || !isMotorOK) 
  ? 'error' 
  : 'active';
```

---

## Questions for You

1. **Cooling LED**: Should it check `fan_active` or `is_cooling` (pump/drain)?
   - You said "FAN" but cooling typically means pump/drain active
   - Current: `is_cooling = pump_active OR drain_active`

2. **Water Level Logic**: 
   - "for more than 2 minute interval every 10 minutes" means:
     - At least 2 minutes of full water in EACH 10-minute window?
     - Or at least 2 minutes total in the last 10 minutes?

3. **Motor Status**: Should it be red for:
   - Only `critical` status?
   - Or both `warning` AND `critical`?

---

## Summary

✅ **I understand your requirements**  
✅ **Fixed `water_level` column issue**  
✅ **Table structure is now correct**  
⚠️ **Need clarification on Cooling LED logic**  
⏭️ **Ready to implement frontend logic once clarified**

