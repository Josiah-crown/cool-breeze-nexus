# ✅ Cirrus Website Logic - Implementation Summary

## Changes Made

### **1. Power → Connected** ✅
- Changed all "Power" labels to "Connected" in frontend
- Updated to use `machine.isConnected` instead of `machine.isOn`
- Files updated:
  - `MachineCard.tsx`
  - `MachineDetailView.tsx`
  - `StatusPanel.tsx`

### **2. Cooling LED Logic** ✅
- **Clarified**: Cooling LED checks `pump_active` (stored as `is_cooling` in cirrus table)
- For Cirrus: `pump_active` is the "cool" indicator
- Fan and cool run simultaneously
- Hardware is generic, so voltage inputs may be reassigned for different machine types

### **3. Motor Status LED** ✅
- Updated to show RED for both `warning` AND `critical` status
- Uses `machine.motorStatus` from database (calculated from thresholds)
- Critical parameters are editable in Alert Thresholds section
- Files updated:
  - `MachineDetailView.tsx`
  - `StatusPanel.tsx`

### **4. Water Level Column Removed** ✅
- Removed `water_level` column (we can only read FULL/EMPTY)
- Updated table definition
- Updated processor trigger
- Created migration to drop column

---

## LED Logic Summary

| LED | Logic | Database Field | Time Window |
|-----|-------|----------------|-------------|
| **Connected** | Post received in past 10 min | `is_connected` | 10 minutes |
| **Fan** | Any FAN voltage in past 10 min | `fan_active` | 10 minutes |
| **Cooling** | Any PUMP voltage in past 10 min | `is_cooling` (checks `pump_active`) | 10 minutes |
| **Water Level** | Complex: 30-min cooling + 2-min full in each 10-min window | `has_water` | 30 minutes |
| **Motor Status** | Current > threshold OR temp > threshold | `motor_status` | Current reading |

---

## Next Steps

1. **Implement 10-minute window queries** for Fan and Cooling LEDs
2. **Implement complex water level logic** (30-minute window with sub-windows)
3. **Verify motor status** includes current threshold check in database calculation

---

## Files Modified

- ✅ `src/components/MachineCard.tsx`
- ✅ `src/components/MachineDetailView.tsx`
- ✅ `src/components/StatusPanel.tsx`
- ✅ `supabase/migrations/20250108000000_create_cirrus_table.sql`
- ✅ `supabase/migrations/20250108000001_create_cirrus_processor.sql`
- ✅ `supabase/migrations/20250108000014_remove_water_level_column.sql`

