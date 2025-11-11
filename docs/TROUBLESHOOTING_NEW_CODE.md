# 🔧 Troubleshooting: New Code Integration Failed

**Date:** November 5, 2025  
**Issue:** Added new files broke the dev server  
**Status:** ✅ RESOLVED - Site working again

---

## 📋 **What Happened**

You added 3 new files that were designed to integrate real-time data from the `readings_raw` table:

1. `src/types/reading.ts` - New types for readings
2. `src/hooks/useMachineData.tsx` - New version using React Query
3. `src/components/MachineCard.tsx` - New version expecting `MachineWithReading` type

**Problem:** These files had breaking changes that weren't compatible with the existing codebase.

---

## 🚨 **Why It Broke**

### **1. Missing Dependencies**
The new code used `@tanstack/react-query` but you hadn't run `npm install` yet.

### **2. API Changes**
**Old `useMachineData` API:**
```typescript
const { machines, users, historicalData, loading, refetch } = useMachineData(userId, role);
```

**New API:**
```typescript
const { machines, isLoading, error, refetch } = useMachineData({ userId, machineId, enabled });
```

The Dashboard and other components expected `users` and `historicalData`, which the new version doesn't provide.

### **3. Type Mismatches**
- **Old:** Components used `MachineStatus` type
- **New:** Components expected `MachineWithReading` type

These types have different structures, causing TypeScript/runtime errors.

### **4. Missing Setup**
The new code requires:
- React Query Provider in `main.tsx`
- `readings_raw` table in Supabase
- Updated all components to use new types

---

## ✅ **What Was Done to Fix It**

### **Step 1: Backed Up New Files**
```
src/hooks/useMachineData.tsx → src/hooks/useMachineData.tsx.backup
src/components/MachineCard.tsx → src/components/MachineCard.tsx.backup
```

### **Step 2: Restored Old Working Versions**
Created new versions of both files that match the old API and types.

### **Step 3: Verified No Errors**
- Ran linter: No errors
- Started dev server: Working!

---

## 📦 **Your New Files Are Saved**

The new code you added is **NOT lost**! It's saved in:

```
src/hooks/useMachineData.tsx.backup
src/components/MachineCard.tsx.backup
src/types/reading.ts (still there, not currently used)
```

---

## 🔄 **How to Properly Integrate the New Code**

When you're ready to integrate real-time data, follow these steps:

### **Phase 1: Database Setup**

1. **Create `readings_raw` table migration:**
   ```sql
   CREATE TABLE readings_raw (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     machine_id UUID REFERENCES machines(id) ON DELETE CASCADE,
     timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     
     -- Temperature readings
     temp_inside FLOAT,
     temp_outside FLOAT,
     temp_machine FLOAT,
     
     -- Other sensors
     ct_current FLOAT,
     water_level FLOAT,
     
     -- State data
     state_inputs JSONB,
     derived_state TEXT,
     delta_t FLOAT,
     
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   
   CREATE INDEX idx_readings_machine_time ON readings_raw(machine_id, timestamp DESC);
   ```

2. **Run migration** in Supabase Dashboard

---

### **Phase 2: React Query Setup**

1. **Install dependencies** (already done):
   ```bash
   npm install @tanstack/react-query
   ```

2. **Add Query Provider to `main.tsx`:**
   ```typescript
   import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
   
   const queryClient = new QueryClient();
   
   ReactDOM.createRoot(document.getElementById('root')!).render(
     <React.StrictMode>
       <QueryClientProvider client={queryClient}>
         <AuthProvider>
           <App />
         </AuthProvider>
       </QueryClientProvider>
     </React.StrictMode>,
   );
   ```

---

### **Phase 3: Update Components Gradually**

Don't replace everything at once! Update one component at a time:

#### **Step 1: Create New Hook Alongside Old One**
```typescript
// src/hooks/useMachineDataLegacy.tsx
// (rename current useMachineData to this)

// src/hooks/useMachineDataNew.tsx  
// (use your backup version here)
```

#### **Step 2: Test with One Component**
```typescript
// In Dashboard.tsx, test with single machine:
const { machines: oldMachines, users, historicalData } = useMachineDataLegacy(userId, role);
const { machines: newMachines } = useMachineDataNew({ userId: userId, enabled: true });

console.log('Old:', oldMachines[0]);
console.log('New:', newMachines?.[0]);
```

#### **Step 3: Create Adapter**
Create a function to convert new types to old types:
```typescript
function convertToLegacyMachine(newMachine: MachineWithReading): MachineStatus {
  const status = getMachineStatus(newMachine);
  return {
    ...newMachine,
    isOn: status.isOn,
    isCooling: status.isCooling,
    // ... map all fields
  };
}
```

#### **Step 4: Update Dashboard Gradually**
```typescript
// Use adapter to maintain compatibility
const legacyMachines = newMachines?.map(convertToLegacyMachine) || [];
```

#### **Step 5: Once Stable, Remove Old Code**

---

### **Phase 4: ESP32 Integration**

After the above is working:

1. ESP32 posts to `/api/readings` edge function
2. Edge function validates API key
3. Edge function inserts to `readings_raw` table
4. React Query auto-refreshes every 5 minutes
5. Dashboard shows real data!

---

## 🎯 **Recommended Approach**

**For Tonight (ESP32 Testing):**
- ✅ Use current working version
- ✅ Test ESP32 connection
- ✅ Manually verify data appears in Supabase

**For Tomorrow (Integration):**
- Create `readings_raw` table
- Add React Query Provider
- Test new hooks side-by-side
- Gradually migrate components

**For Next Week (Polish):**
- Remove old code
- Add Realtime subscriptions
- Add data simulator
- Full production deployment

---

## 📝 **Key Lessons**

### **Do:**
- ✅ Test new code in isolation first
- ✅ Add one feature at a time
- ✅ Keep old code working while testing new
- ✅ Run `npm install` after adding dependencies
- ✅ Create adapters for type compatibility

### **Don't:**
- ❌ Replace working files without backup
- ❌ Change multiple files at once
- ❌ Assume types are compatible
- ❌ Skip dependency installation
- ❌ Deploy untested code

---

## 🔍 **Debugging Checklist**

If you add new code and it breaks:

1. **Check Dependencies:**
   ```bash
   npm install
   ```

2. **Check Type Errors:**
   ```bash
   npm run build
   ```

3. **Check Linter:**
   - VS Code will show red squiggles
   - Or run: `npx tsc --noEmit`

4. **Check Console:**
   - Open browser DevTools (F12)
   - Look for errors in Console tab

5. **Check Imports:**
   - Are all imports resolving?
   - Are paths correct?

6. **Revert If Needed:**
   - Rename new file to `.backup`
   - Restore old working version
   - Debug separately

---

## 💡 **Pro Tips**

### **Test in Separate Branch (if using Git):**
```bash
git checkout -b feature/real-time-data
# Make changes
# Test thoroughly
git checkout main  # Revert if broken
```

### **Use Feature Flags:**
```typescript
const USE_REAL_TIME_DATA = false;  // Toggle feature

const machineData = USE_REAL_TIME_DATA 
  ? useMachineDataNew({ userId })
  : useMachineDataLegacy(userId, role);
```

### **Keep Backups:**
Always keep a `.backup` or `.old` version of files you're replacing.

---

## 📞 **Need Help?**

If you encounter similar issues:

1. Check this document first
2. Look at backup files (`.backup` extensions)
3. Check `docs/progress/` for what was working before
4. Ask Claude to help debug step-by-step

---

## ✅ **Current Status**

- ✅ **Site Working:** Dev server running
- ✅ **Old Code:** Restored and functional
- ✅ **New Code:** Backed up safely
- ✅ **Ready for:** ESP32 testing tonight
- ⏳ **Next Step:** Proper integration tomorrow

---

**Remember:** Slow and steady wins the race. One feature at a time! 🐢🏆

---

**Document Created:** November 5, 2025  
**Status:** Active Reference  
**Last Updated:** November 5, 2025


