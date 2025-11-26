# 📝 Files That Need Updates After Migration

**Date:** 2025-01-23  
**Purpose:** Complete list of files that need to be updated when migrating to new Supabase instance

---

## ✅ Already Updated (With TODO Comments)

These files have been updated with TODO comments indicating they need changes after migration:

1. **`src/lib/machineConfig.ts`**
   - ✅ Added TODO comments
   - **Change:** `'cirrus'` → `'cirrus_calculated'`, `'coolbreeze'` → `'coolbreeze_calculated'`
   - **Line:** 29-34

2. **`src/lib/historicalData.ts`**
   - ✅ Added TODO comments
   - **Change:** Return type and table references
   - **Lines:** 10, 32-35

---

## ⚠️ Files That Need Updates (Not Yet Updated)

### **Frontend Code Files**

#### **1. `src/components/MachineCard.tsx`**
- **Line 55:** `.from('cirrus')` → `.from('cirrus_calculated')`
- **Also check:** Any other references to `cirrus` or `coolbreeze` tables

#### **2. `src/components/MachineDetailView.tsx`**
- **Line 68:** `.from('cirrus')` → `.from('cirrus_calculated')`
- **Line 128:** Check subscription channel references
- **Also check:** Any other references to `cirrus` or `coolbreeze` tables

#### **3. `src/hooks/useMachineData.tsx`**
- **Line 107:** `.from('readings_raw')` → Remove or update to use `{manufacturer}_raw`
- **Line 114:** `.from('cirrus')` → `.from('cirrus_calculated')`
- **Line 121:** `.from('coolbreeze')` → `.from('coolbreeze_calculated')`
- **Note:** This hook checks connection status - may need to use `machine_connection_status` table instead

#### **4. `src/components/AlertThresholdsEditor.tsx`**
- **Line 56:** `.from('machine_alert_config')` → `.from('{manufacturer}_notifications')`
- **Line 77:** `.from('machine_alert_config')` → `.from('{manufacturer}_notifications')`
- **Note:** Need to determine manufacturer and use appropriate table

#### **5. `src/types/reading.ts`**
- **Line 63:** Comment references `readings_raw` - update to `{manufacturer}_raw`
- **Note:** May need to update type definitions if schema changes

---

### **Documentation Files**

#### **6. `ESP32_INTEGRATION_GUIDE.md`**
- **Line 35:** References `readings_raw` table
- **Update:** Change to `{manufacturer}_raw` pattern
- **Add:** Instructions for determining manufacturer and using correct table

#### **7. All files in `docs/supabase/`**
- Many files reference `cirrus`, `coolbreeze`, `readings_raw`
- **Action:** Review and update or archive these files
- **Files to check:**
  - `docs/supabase/historical/2025-11-18/*.md`
  - `docs/supabase/QUICK_CHECK_HISTORICAL_DATA.md`
  - `docs/supabase/VERIFY_HISTORICAL_DATA.sql`
  - `docs/supabase/HISTORICAL_DATA_SETUP_COMPLETE.md`
  - And many others...

---

### **Migration Files**

#### **8. Old Migration Files**
- **Location:** `supabase/migrations/`
- **Action:** Archive or delete after migration verified
- **Files to archive:**
  - All files except `000_COMPLETE_DATABASE_SCHEMA.sql`
  - Move to `supabase/migrations/archive/` folder

---

## 🔄 Update Checklist

### **Before Migration:**
- [ ] Review all files listed above
- [ ] Create backup of current codebase
- [ ] Test current system to ensure baseline works

### **During Migration:**
- [ ] Run `000_COMPLETE_DATABASE_SCHEMA.sql` on new Supabase instance
- [ ] Migrate data (if applicable)
- [ ] Create processing triggers
- [ ] Create cleanup jobs

### **After Migration:**
- [ ] Update `src/lib/machineConfig.ts` - Remove TODO, update table names
- [ ] Update `src/lib/historicalData.ts` - Remove TODO, update table names
- [ ] Update `src/components/MachineCard.tsx` - Change table references
- [ ] Update `src/components/MachineDetailView.tsx` - Change table references
- [ ] Update `src/hooks/useMachineData.tsx` - Change table references
- [ ] Update `src/components/AlertThresholdsEditor.tsx` - Change to manufacturer-specific tables
- [ ] Update `src/types/reading.ts` - Update comments/types if needed
- [ ] Update `ESP32_INTEGRATION_GUIDE.md` - Update table references
- [ ] Archive old migration files
- [ ] Update/archive old documentation files
- [ ] Test all functionality
- [ ] Verify historical data loads correctly
- [ ] Verify real-time updates work
- [ ] Verify ESP32 integration works

---

## 📋 Quick Reference: Table Name Changes

| Old Table Name | New Table Name | Notes |
|---------------|----------------|-------|
| `cirrus` | `cirrus_calculated` | Processed data (1 year retention) |
| `coolbreeze` | `coolbreeze_calculated` | Processed data (1 year retention) |
| `readings_raw` | `{manufacturer}_raw` | Raw data (2 weeks retention) |
| `machine_alert_config` | `{manufacturer}_notifications` | Per-manufacturer notifications |
| `machine_voltage_config` | `{manufacturer}_voltage_config` | Per-manufacturer voltage config |
| N/A | `machine_connection_status` | NEW: Shared connection tracking |

---

## 🎯 Pattern for Updates

### **Table References:**
```typescript
// OLD:
.from('cirrus')
.from('coolbreeze')

// NEW:
.from('cirrus_calculated')
.from('coolbreeze_calculated')
```

### **Dynamic Table Selection:**
```typescript
// OLD:
const table = manufacturer === 'Cirrus' ? 'cirrus' : 'coolbreeze';

// NEW:
const table = manufacturer === 'Cirrus' ? 'cirrus_calculated' : 'coolbreeze_calculated';
```

### **Manufacturer-Specific Tables:**
```typescript
// For notifications/config tables:
const notificationsTable = `${manufacturer.toLowerCase()}_notifications`;
const voltageConfigTable = `${manufacturer.toLowerCase()}_voltage_config`;
```

---

**All updates should be made AFTER the new Supabase instance is set up and tested!**

