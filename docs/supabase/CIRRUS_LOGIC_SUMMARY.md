# ✅ Cirrus Website Logic - Confirmation

## Your Requirements (Confirmed Understanding)

### **1. Power LED → "Connected" LED**
- ✅ **ON**: Supabase received a post from device in past 10 minutes
- ❌ **OFF**: No posts in past 10 minutes
- **Implementation**: Check `cirrus.is_connected` or query last 10 minutes

### **2. Fan LED**
- ✅ **ON**: Any voltage reading from FAN in past 10 minutes
- ❌ **OFF**: No FAN voltage readings in past 10 minutes
- **Implementation**: Query `fan_active = true` in last 10 minutes

### **3. Cooling LED**
- ✅ **ON**: Any voltage reading from FAN in past 10 minutes
- ❌ **OFF**: No FAN voltage readings in past 10 minutes
- **⚠️ QUESTION**: You said "FAN" for both Fan and Cooling. Should Cooling check `pump_active` or `is_cooling` instead?

### **4. Water Level LED**
- 🟢 **GREEN**: 
  - Cooling on > 10 minutes
  - AND water level full for > 2 minute interval every 10 minutes
- 🔴 **RED**: 
  - After 30 minutes of cooling active
  - AND no water level full indication
- **Note**: We can only read FULL/EMPTY (boolean), not actual level

### **5. Motor Status LED**
- 🔴 **RED**: 
  - Current > set amount
  - OR temperature > set amount
- 🟢 **GREEN**: 
  - Current within limits
  - AND temperature within limits

---

## Issues Found

### **1. `water_level` Column Should Be Removed**

**Problem:**
- Table has `water_level NUMERIC(5,2)` 
- But we can only read FULL/EMPTY (boolean `has_water`)
- This column is misleading

**Solution:**
- Remove `water_level` column
- OR keep it but always set to 100.0 (full) or 0.0 (empty) based on `has_water`

**Current Code:**
```sql
water_level NUMERIC(5,2),  -- ❌ Should be removed or clarified
has_water BOOLEAN NOT NULL DEFAULT true,  -- ✅ This is correct
```

---

## Table Structure Verification

### ✅ **Correct Fields:**
- `is_connected` - Connection status (10-minute window)
- `fan_active` - Fan voltage reading
- `is_cooling` - Cooling status (pump OR drain active)
- `has_water` - Water status (boolean: full/empty)
- `motor_status` - Motor status ('normal', 'warning', 'critical')
- `motor_temp_within_parameters` - Temperature compliance
- `current_within_parameters` - Current compliance

### ❌ **Needs Fix:**
- `water_level` - Remove or clarify (we can't read actual level)

---

## Next Steps

1. **Remove `water_level` column** (migration)
2. **Clarify Cooling LED logic** (Fan vs Pump)
3. **Implement 10-minute window checks** in frontend
4. **Implement complex water level logic** (30-minute window with sub-windows)

