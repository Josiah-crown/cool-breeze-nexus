# ✅ Cirrus Website Logic - Final Implementation

## LED Status Logic (Confirmed)

### **1. Connected LED (formerly Power)** ✅
- **ON (Green)**: Supabase received a post from device in past 10 minutes
- **OFF (Gray)**: No posts in past 10 minutes
- **Implementation**: Uses `machine.isConnected` (calculated: last reading within 10 min)

### **2. Fan LED** ✅
- **ON (Green)**: Any voltage reading from FAN in past 10 minutes
- **OFF (Gray)**: No FAN voltage readings in past 10 minutes
- **Implementation**: Query `fan_active = true` in last 10 minutes

### **3. Cooling LED** ✅
- **ON (Green)**: Any voltage reading from PUMP in past 10 minutes
- **OFF (Gray)**: No PUMP voltage readings in past 10 minutes
- **Clarification**: 
  - For Cirrus, `pump_active` is the "cool" indicator
  - In `cirrus` table, this is stored as `is_cooling` (which is `pump_active OR drain_active`)
  - Fan and cool run simultaneously
- **Implementation**: Query `is_cooling = true` (which checks `pump_active`) in last 10 minutes

### **4. Water Level LED** ✅
- **GREEN**: 
  - Cooling is on for more than 10 minutes
  - AND water level indicates full for more than 2 minute interval every 10 minutes
- **RED**: 
  - After 30 minutes of "cooling" active
  - AND no water level full indication
- **Note**: We can only read FULL/EMPTY (boolean `has_water`), not actual level
- **Implementation**: 
  - Query last 30 minutes of data
  - Check if `is_cooling = true` for > 30 minutes
  - Check if `has_water = true` for at least 2 minutes in each 10-minute window

### **5. Motor Status LED** ✅
- **RED**: 
  - Motor pulls more current than the set amount (from `machine_alert_config.motor_amps_warning`)
  - OR motor heats up more than the set amount (from `machine_alert_config.motor_temp_warning` or `motor_temp_critical`)
- **GREEN**: 
  - Current within limits
  - AND temperature within limits
- **Clarification**: 
  - Shows RED for both `warning` AND `critical` status
  - But will only show red if critical (meaning: if status is 'warning' or 'critical', show red)
  - Critical parameters are changeable in "Alert Thresholds" section
- **Implementation**: 
  - Uses `machine.motorStatus` from database ('normal', 'warning', 'critical')
  - Red if `motorStatus === 'warning'` OR `motorStatus === 'critical'`
  - Green if `motorStatus === 'normal'`

---

## Database Fields Used

### **Connection Status:**
- `cirrus.is_connected` - Boolean (calculated: last reading within 10 min)

### **Fan Status:**
- `cirrus.fan_active` - Boolean (from voltage input mapped to 'fan')

### **Cooling Status:**
- `cirrus.is_cooling` - Boolean (calculated as `pump_active OR drain_active`)
- For Cirrus: `pump_active` is the "cool" indicator
- Note: Hardware is generic, so voltage inputs may be reassigned for different machine types

### **Water Status:**
- `cirrus.has_water` - Boolean (true = full, false = empty)
- **Removed**: `water_level` column (we can't read actual level)

### **Motor Status:**
- `cirrus.motor_status` - Text ('normal', 'warning', 'critical')
- Calculated from:
  - `machine_alert_config.motor_temp_warning`
  - `machine_alert_config.motor_temp_critical`
  - `machine_alert_config.motor_amps_warning`
- `cirrus.motor_temp_within_parameters` - Boolean flag
- `cirrus.current_within_parameters` - Boolean flag

---

## Frontend Implementation

### **Connected LED**
```typescript
<StatusLight 
  status={machine.isConnected ? 'active' : 'inactive'} 
  label="Connected" 
/>
```

### **Fan LED**
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

### **Cooling LED**
```typescript
// Query last 10 minutes for is_cooling = true (which checks pump_active for Cirrus)
const { count } = await supabase
  .from('cirrus')
  .select('*', { count: 'exact', head: true })
  .eq('machine_id', machineId)
  .eq('is_cooling', true)  // This checks pump_active for Cirrus
  .gte('timestamp', new Date(Date.now() - 10 * 60 * 1000).toISOString());

const coolingActive = (count ?? 0) > 0;
```

### **Water Level LED**
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
  // Check if water was full for at least 2 minutes in each 10-minute window
  const waterStatus = checkWaterInWindows(readings);
  // Green if water was full in windows, Red if not
}
```

### **Motor Status LED**
```typescript
// Use motor_status from database (calculated from thresholds)
<StatusLight
  status={
    machine.motorStatus === 'critical' || machine.motorStatus === 'warning' ? 'error' : 'active'
  }
  label="Motor Status"
/>
```

---

## Alert Thresholds

### **Editable in Alert Thresholds Editor:**
- ✅ `motor_temp_critical` - Motor overheating critical threshold (°C)
- ✅ `motor_temp_warning` - Motor overheating warning threshold (°C)
- ✅ `motor_amps_warning` - Motor overcurrent warning threshold (Amps)

### **Note:**
- Currently only `motor_amps_warning` exists (no `motor_amps_critical`)
- Motor status is calculated as:
  - `critical` if `motor_temp >= motor_temp_critical`
  - `warning` if `motor_temp >= motor_temp_warning`
  - `normal` otherwise
- Current is checked against `motor_amps_warning` for overall status, but doesn't affect `motor_status` field directly

---

## Summary of Changes

### ✅ **Completed:**
1. Changed "Power" to "Connected" in frontend
2. Updated Connected LED to use `isConnected` instead of `isOn`
3. Clarified Cooling LED uses `pump_active` (stored as `is_cooling`)
4. Updated Motor Status LED to show red for both warning and critical
5. Removed `water_level` column from database
6. Confirmed Alert Thresholds Editor has critical parameters editable

### ⏭️ **To Implement:**
1. Frontend queries for 10-minute windows (Fan, Cooling LEDs)
2. Complex water level logic (30-minute window with 10-minute sub-windows)
3. Verify motor status calculation includes current threshold check

---

## Files Updated

- ✅ `src/components/MachineCard.tsx` - Changed "Power" to "Connected"
- ✅ `src/components/MachineDetailView.tsx` - Changed "Power" to "Connected", updated motor status logic
- ✅ `src/components/StatusPanel.tsx` - Changed "Power" to "Connected", updated motor status logic
- ✅ `supabase/migrations/20250108000000_create_cirrus_table.sql` - Removed `water_level` column
- ✅ `supabase/migrations/20250108000001_create_cirrus_processor.sql` - Removed `water_level` references
- ✅ `supabase/migrations/20250108000014_remove_water_level_column.sql` - Migration to drop column

