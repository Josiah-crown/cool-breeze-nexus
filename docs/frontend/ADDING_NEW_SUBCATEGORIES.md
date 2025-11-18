# ➕ Adding New Subcategories Guide

## Overview

This guide explains how to add new machine subcategories (manufacturers/models) to the system. The architecture is designed to make this process straightforward.

---

## Quick Steps

### **1. Update Machine Configuration** (`src/lib/machineConfig.ts`)

Add the new manufacturer to the appropriate arrays:

```typescript
export const MACHINE_MANUFACTURERS: Record<MachineType, Manufacturer[]> = {
  evaporative: ['Cirrus', 'CoolBreeze', 'NewManufacturer'], // ← Add here
  heatpump: ['CoolBreeze', 'NewManufacturer'], // ← Add here
  airconditioner: ['CoolBreeze', 'NewManufacturer'], // ← Add here
};

export const PROCESSING_TABLE_MAP: Record<Manufacturer | string, 'cirrus' | 'coolbreeze' | null> = {
  'Cirrus': 'cirrus',
  'CoolBreeze': 'coolbreeze',
  'NewManufacturer': 'new_table', // ← Add mapping here
};
```

**That's it for the frontend!** The UI will automatically show the new option.

---

## Complete Process

### **Step 1: Add to Configuration File**

Edit `src/lib/machineConfig.ts`:

1. **Add to Manufacturer type** (if needed):
```typescript
export type Manufacturer = 'Cirrus' | 'CoolBreeze' | 'NewManufacturer';
```

2. **Add to manufacturers array**:
```typescript
export const MACHINE_MANUFACTURERS: Record<MachineType, Manufacturer[]> = {
  evaporative: ['Cirrus', 'CoolBreeze', 'NewManufacturer'],
  // ...
};
```

3. **Add processing table mapping**:
```typescript
export const PROCESSING_TABLE_MAP: Record<Manufacturer | string, 'cirrus' | 'coolbreeze' | null> = {
  'NewManufacturer': 'new_table', // or 'cirrus' or 'coolbreeze'
};
```

---

### **Step 2: Create Processing Table (if new table needed)**

If the new manufacturer needs its own processing table:

```sql
-- supabase/migrations/YYYYMMDD_create_new_manufacturer_table.sql
CREATE TABLE IF NOT EXISTS public.new_manufacturer (
  -- Define columns similar to cirrus/coolbreeze tables
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- ... other columns
);
```

---

### **Step 3: Create Processing Trigger (if new table needed)**

```sql
-- supabase/migrations/YYYYMMDD_create_new_manufacturer_processor.sql
CREATE OR REPLACE FUNCTION public.process_new_manufacturer_reading()
RETURNS TRIGGER AS $$
DECLARE
  v_machine_type TEXT;
  v_machine_manufacturer TEXT;
BEGIN
  SELECT m.type, COALESCE(m.manufacturer, '') INTO v_machine_type, v_machine_manufacturer
  FROM public.machines m
  WHERE m.id = NEW.machine_id;
  
  -- Process if it's the right type or manufacturer
  IF v_machine_type != 'evaporative' AND v_machine_manufacturer != 'NewManufacturer' THEN
    RETURN NEW; -- Skip processing
  END IF;
  
  -- Process data and insert into new_manufacturer table
  -- ...
  
  DELETE FROM public.readings_raw WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_process_new_manufacturer_reading
  AFTER INSERT ON public.readings_raw
  FOR EACH ROW
  EXECUTE FUNCTION public.process_new_manufacturer_reading();
```

---

### **Step 4: Update Historical Data Fetching (if new table)**

Update `src/lib/historicalData.ts`:

```typescript
async function getMachineProcessingTable(machineId: string): Promise<'cirrus' | 'coolbreeze' | 'new_manufacturer' | null> {
  // ... existing code ...
  
  const table = getProcessingTable(machine.type as MachineType, machine.manufacturer);
  
  // Handle new table
  if (table === null && machine.manufacturer === 'NewManufacturer') {
    return 'new_manufacturer';
  }
  
  return table;
}
```

Or better, update `getProcessingTable` in `machineConfig.ts` to return the new table type.

---

### **Step 5: Update Edge Function (if field mapping needed)**

If the new manufacturer sends different field names, update `supabase/functions/esp32-data-receiver/index.ts`:

```typescript
// Map voltage inputs - support new format
if (reading.new_manufacturer_voltage_1 !== undefined) {
  rawReading.voltage_input_1 = reading.new_manufacturer_voltage_1
  // ...
}
```

---

## Examples

### **Example 1: Adding "BrandX" Evaporative Cooler**

**1. Update config:**
```typescript
// src/lib/machineConfig.ts
export type Manufacturer = 'Cirrus' | 'CoolBreeze' | 'BrandX';

export const MACHINE_MANUFACTURERS = {
  evaporative: ['Cirrus', 'CoolBreeze', 'BrandX'],
  // ...
};

export const PROCESSING_TABLE_MAP = {
  'BrandX': 'cirrus', // Use existing cirrus table
  // ...
};
```

**That's it!** BrandX will now appear in the dropdown and use the `cirrus` processing table.

---

### **Example 2: Adding "BrandY" with Custom Table**

**1. Update config:**
```typescript
export const PROCESSING_TABLE_MAP = {
  'BrandY': 'brandy', // New table
};
```

**2. Create table and trigger** (see Step 2 & 3 above)

**3. Update historical data fetching** (see Step 4 above)

---

## Architecture Benefits

### **✅ Centralized Configuration**
- All manufacturers defined in one place (`machineConfig.ts`)
- Easy to see what's available
- Type-safe with TypeScript

### **✅ Automatic UI Updates**
- Dropdowns automatically populate from config
- No need to manually update UI components
- Consistent across the application

### **✅ Flexible Processing**
- Can use existing tables or create new ones
- Easy to change processing logic per manufacturer
- Supports multiple manufacturers per table

### **✅ Type Safety**
- TypeScript ensures valid manufacturer values
- Compile-time checks prevent typos
- Better IDE autocomplete

---

## Testing Checklist

After adding a new subcategory:

- [ ] New manufacturer appears in dropdown
- [ ] Can create machine with new manufacturer
- [ ] Manufacturer saved to database correctly
- [ ] Data routes to correct processing table
- [ ] Historical data fetches from correct table
- [ ] Processing trigger works correctly
- [ ] Edge function handles field mapping (if needed)

---

## Common Scenarios

### **Scenario 1: New Manufacturer, Same Processing**
- **Action:** Just add to `MACHINE_MANUFACTURERS` and `PROCESSING_TABLE_MAP`
- **Time:** 2 minutes

### **Scenario 2: New Manufacturer, Existing Table**
- **Action:** Add to config, point to existing table (e.g., `'cirrus'`)
- **Time:** 2 minutes

### **Scenario 3: New Manufacturer, New Table**
- **Action:** Add to config, create table, create trigger, update historical fetching
- **Time:** 15-30 minutes

### **Scenario 4: New Manufacturer, Different Field Names**
- **Action:** All of Scenario 3, plus update edge function mapping
- **Time:** 20-40 minutes

---

## Files to Modify

### **Always:**
- ✅ `src/lib/machineConfig.ts` - Add manufacturer

### **If New Table:**
- ✅ Create new migration for table
- ✅ Create new migration for trigger
- ✅ Update `src/lib/historicalData.ts`

### **If Different Fields:**
- ✅ Update `supabase/functions/esp32-data-receiver/index.ts`

---

## Summary

**Adding a new subcategory is easy!**

1. **Simplest case (2 min):** Just update `machineConfig.ts`
2. **New table (15-30 min):** Add config + create table/trigger
3. **Different fields (20-40 min):** All above + update edge function

The architecture is designed to make this process as simple as possible, with centralized configuration and automatic UI updates.

