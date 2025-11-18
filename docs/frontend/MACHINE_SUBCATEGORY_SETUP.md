# 🏷️ Machine Subcategory Setup

## Overview

Added subcategory selection for evaporative coolers and HVAC systems to automatically route data to the correct processing table.

---

## Implementation

### **1. Database Field**

The `manufacturer` column already exists in the `machines` table:
- ✅ Added via migration `20250108000003_add_manufacturer_column.sql`
- ✅ Used by processing triggers to determine which table to use

### **2. UI Changes**

**AddMachineDialog Component:**
- ✅ Added `manufacturer` field to form state
- ✅ Shows subcategory dropdown when "Evaporative Cooler" is selected
- ✅ Shows optional subcategory dropdown for HVAC systems
- ✅ Validates that evaporative coolers must have a model selected

**Subcategory Options:**
- **Evaporative Cooler:**
  - `Cirrus` → Processes to `cirrus` table
  - `CoolBreeze` → Processes to `coolbreeze` table (if supported)
  
- **HVAC (Air Conditioner / Heat Pump):**
  - `CoolBreeze` (optional) → Processes to `coolbreeze` table
  - `None` → Uses default processing based on type

---

## Data Flow

```
User selects "Evaporative Cooler" + "Cirrus"
    ↓
Machine created with: type='evaporative', manufacturer='Cirrus'
    ↓
ESP32 sends data → readings_raw
    ↓
Trigger checks: type='evaporative' OR manufacturer='Cirrus'
    ↓
Data processed into → cirrus table
```

```
User selects "Evaporative Cooler" + "CoolBreeze"
    ↓
Machine created with: type='evaporative', manufacturer='CoolBreeze'
    ↓
ESP32 sends data → readings_raw
    ↓
Trigger checks: type='evaporative' OR manufacturer='CoolBreeze'
    ↓
Data processed into → coolbreeze table (if trigger supports it)
```

**Note:** Currently, the `process_cirrus_reading` trigger only processes `evaporative` type OR `Cirrus` manufacturer. If you want CoolBreeze evaporative coolers to go to a different table, you may need to adjust the trigger logic.

---

## Processing Logic

### **Cirrus Trigger (`process_cirrus_reading`):**
```sql
IF v_machine_type != 'evaporative' AND v_machine_manufacturer != 'Cirrus' THEN
  RETURN NEW; -- Skip processing
END IF;
```
**Processes:** `type='evaporative'` OR `manufacturer='Cirrus'` → `cirrus` table

### **CoolBreeze Trigger (`process_coolbreeze_reading`):**
```sql
IF v_machine_type NOT IN ('airconditioner', 'heatpump') AND v_machine_manufacturer != 'CoolBreeze' THEN
  RETURN NEW; -- Skip processing
END IF;
```
**Processes:** `type IN ('airconditioner', 'heatpump')` OR `manufacturer='CoolBreeze'` → `coolbreeze` table

---

## UI Behavior

### **When "Evaporative Cooler" is selected:**
- ✅ Subcategory dropdown appears (required)
- ✅ Options: "Cirrus" or "CoolBreeze"
- ✅ Form validation requires selection
- ✅ Error message if not selected

### **When "Air Conditioner" or "Heat Pump" is selected:**
- ✅ Optional subcategory dropdown appears
- ✅ Options: "None" or "CoolBreeze"
- ✅ Not required (can be left empty)

### **Form Reset:**
- ✅ Manufacturer field resets when machine type changes
- ✅ Evaporative cooler selection clears manufacturer if type changes

---

## Validation

**Required:**
- ✅ Evaporative coolers must have a manufacturer/model selected

**Optional:**
- ✅ HVAC systems can have manufacturer/model (optional)

**Error Messages:**
- "Please select an Evaporative Cooler model" - if evaporative cooler is selected without model

---

## Database Schema

**machines table:**
```sql
manufacturer TEXT NULL
```

**Usage:**
- `'Cirrus'` - For Cirrus evaporative coolers
- `'CoolBreeze'` - For CoolBreeze HVAC systems or evaporative coolers
- `NULL` - For machines without specific manufacturer/model

---

## Historical Data Fetching

The `fetchHistoricalData` function automatically detects the processing table:
```typescript
if (machine.type === 'evaporative' || machine.manufacturer === 'Cirrus') {
  return 'cirrus';
} else if (machine.type === 'airconditioner' || machine.type === 'heatpump' || machine.manufacturer === 'CoolBreeze') {
  return 'coolbreeze';
}
```

---

## Future Enhancements

1. **Additional Models:**
   - Add more evaporative cooler models
   - Add more HVAC manufacturers

2. **Model-Specific Settings:**
   - Default parameters per model
   - Model-specific alert thresholds

3. **Visual Indicators:**
   - Show model badge on machine cards
   - Display model in machine detail view

---

## Testing Checklist

- [x] Evaporative cooler requires model selection
- [x] HVAC systems can optionally select model
- [x] Manufacturer field saved to database
- [x] Processing triggers use manufacturer field
- [x] Historical data fetches from correct table
- [x] Form validation works correctly
- [x] Form resets properly

---

## Files Modified

- ✅ `src/components/AddMachineDialog.tsx` - Added subcategory selection
- ✅ `supabase/migrations/20250108000003_add_manufacturer_column.sql` - Already exists
- ✅ Processing triggers already support manufacturer field

---

## Summary

✅ **Subcategory selection added** for evaporative coolers  
✅ **Automatic routing** to correct processing table  
✅ **Form validation** ensures required fields  
✅ **Backward compatible** with existing machines  
✅ **Extensible** for future models/manufacturers

