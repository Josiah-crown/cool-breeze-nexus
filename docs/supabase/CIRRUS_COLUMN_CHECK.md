# 🔍 Cirrus Table Column Check

## Columns to Delete

### **1. `water_level`** ❌ DELETE
- **Type:** `NUMERIC(5,2)`
- **Reason:** We can only read FULL/EMPTY (boolean), not actual level
- **Action:** Delete manually
- **SQL:**
  ```sql
  ALTER TABLE public.cirrus DROP COLUMN IF EXISTS water_level;
  ```

---

## Columns That Should Exist

### ✅ **Required Columns:**

**Temperature:**
- `ambient_temp` - NUMERIC(5,2)
- `duct_temp` - NUMERIC(5,2)
- `motor_temp` - NUMERIC(5,2)
- `delta_t` - NUMERIC(5,2)

**Operational States:**
- `fan_active` - BOOLEAN
- `pump_active` - BOOLEAN
- `drain_active` - BOOLEAN
- `exhaust_active` - BOOLEAN
- `is_cooling` - BOOLEAN
- `is_on` - BOOLEAN
- `is_connected` - BOOLEAN

**Water:**
- `has_water` - BOOLEAN ✅ (CORRECT - we can only read full/empty)

**Electrical:**
- `voltage` - NUMERIC(6,2)
- `current` - NUMERIC(6,2)
- `power` - NUMERIC(7,2)

**Status:**
- `overall_status` - TEXT
- `motor_status` - TEXT
- `water_status` - TEXT
- `cooling_status` - TEXT
- `status_details` - JSONB

**Parameter Compliance:**
- `motor_temp_within_parameters` - BOOLEAN
- `current_within_parameters` - BOOLEAN
- `voltage_within_parameters` - BOOLEAN
- `power_within_parameters` - BOOLEAN
- `water_within_parameters` - BOOLEAN

**Metadata:**
- `id` - UUID
- `machine_id` - UUID
- `timestamp` - TIMESTAMPTZ
- `created_at` - TIMESTAMPTZ
- `updated_at` - TIMESTAMPTZ

---

## Verification Query

Run this to check your table structure:

```sql
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'cirrus'
ORDER BY ordinal_position;
```

**Expected:** Should NOT have `water_level` column
**Expected:** Should have `has_water` column (boolean)

---

## Summary

**Delete:**
- ❌ `water_level` (numeric) - We can't read actual level

**Keep:**
- ✅ `has_water` (boolean) - This is correct (full/empty only)

**No other columns need to be deleted or added.**

