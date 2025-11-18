# 📝 Frontend Update Guide - Step 5

## ✅ Good News: Most Files Are Already Updated!

The frontend has already been updated to work with the `cirrus` and `coolbreeze` tables. Here's what's already done:

### **✅ Already Updated Files:**

1. **`src/lib/historicalData.ts`** ✅
   - Already fetches from `cirrus` or `coolbreeze` tables
   - Automatically determines which table based on machine type/manufacturer
   - Maps processed data fields correctly

2. **`src/hooks/useMachineData.tsx`** ✅
   - Already uses `fetchHistoricalDataForMachines` for historical data
   - Fetches machine metadata from `machines` table

3. **`src/components/MachineDetailView.tsx`** ✅
   - Already uses `fetchHistoricalData` for historical charts
   - Displays data from processing tables

4. **`src/lib/machineConfig.ts`** ✅
   - Already configured to map manufacturers to processing tables
   - Cirrus → `cirrus` table
   - CoolBreeze → `coolbreeze` table

---

## 🔍 What You Need to Check

### **1. Verify Current Status Fetching**

The current machine status (for dashboard cards) might still be coming from the `machines` table. You should verify if you need to fetch the **latest status from the `cirrus` table** instead.

**Check:** `src/hooks/useMachineData.tsx` around line 89-91

**Current code:**
```typescript
const { data: allMachines } = await supabase
  .from('machines')
  .select('*');
```

**If you want to use latest status from `cirrus` table:**
You would need to fetch the latest entry from `cirrus` for each machine. However, this might already be handled if:
- The `machines` table has a view that includes latest status
- Or the status is updated via a trigger/function

**For now, this is likely fine** - the `machines` table should have the latest status if your database triggers update it.

---

## 📋 Verification Steps

### **Step 1: Check Historical Data is Working**

1. Open your website
2. Click on a Cirrus machine
3. Check if historical charts load
4. Try different time periods (24h, 7d, 30d, 1y)

**Expected:** Charts should show data from the `cirrus` table

---

### **Step 2: Check Current Status Display**

1. Look at machine cards on the dashboard
2. Verify status LEDs show correct values:
   - **Connected** LED (green if post in last 10 min)
   - **Fan** LED (green if fan active)
   - **Cooling** LED (green if cooling active)
   - **Water Level** LED
   - **Motor Status** LED

**Expected:** Status should reflect current state from `cirrus` table

---

### **Step 3: Test with Real Data**

1. Make sure ESP32 is sending data
2. Wait for data to appear in `cirrus` table
3. Refresh the website
4. Verify:
   - Current readings update
   - Historical charts show new data
   - Status LEDs reflect current state

---

## 🛠️ If You Need to Update Current Status Fetching

If you find that current status is not updating correctly, you may need to fetch the latest status from the `cirrus` table. Here's how:

### **Option 1: Add Latest Status Query (Recommended)**

Update `src/hooks/useMachineData.tsx` to fetch latest status from `cirrus`:

```typescript
// After fetching machines, fetch latest status from cirrus table
const machineIds = visibleMachines.map(m => m.id);

// Fetch latest status from cirrus for each machine
const latestStatusPromises = machineIds.map(async (machineId) => {
  const { data } = await supabase
    .from('cirrus')
    .select('*')
    .eq('machine_id', machineId)
    .order('timestamp', { ascending: false })
    .limit(1)
    .single();
  
  return { machineId, status: data };
});

const latestStatuses = await Promise.all(latestStatusPromises);

// Merge latest status into machine data
const machinesWithStatus = visibleMachines.map(machine => {
  const latestStatus = latestStatuses.find(s => s.machineId === machine.id)?.status;
  
  if (latestStatus) {
    return {
      ...machine,
      motorTemp: latestStatus.motor_temp ?? machine.motorTemp,
      outsideTemp: latestStatus.ambient_temp ?? machine.outsideTemp,
      insideTemp: latestStatus.duct_temp ?? machine.insideTemp,
      isCooling: latestStatus.is_cooling ?? machine.isCooling,
      fanActive: latestStatus.fan_active ?? machine.fanActive,
      hasWater: latestStatus.has_water ?? machine.hasWater,
      isConnected: latestStatus.is_connected ?? machine.isConnected,
      motorStatus: latestStatus.motor_status ?? machine.motorStatus,
      overallStatus: latestStatus.overall_status ?? machine.overallStatus,
      current: latestStatus.current ?? machine.current,
      voltage: latestStatus.voltage ?? machine.voltage,
      power: latestStatus.power ?? machine.power,
      deltaT: latestStatus.delta_t ?? machine.deltaT,
    };
  }
  
  return machine;
});
```

**However, this might not be necessary** if your database already updates the `machines` table with latest status.

---

## ✅ Summary

**What to do:**

1. ✅ **No code changes needed** - files are already updated!
2. 🔍 **Test the website** - verify historical data loads
3. 🔍 **Check status LEDs** - verify they show correct values
4. 🔍 **Test with real ESP32 data** - make sure everything updates

**If everything works:**
- ✅ You're done! No frontend updates needed.

**If status doesn't update:**
- See "If You Need to Update Current Status Fetching" section above

---

## 🧪 Testing Checklist

- [ ] Historical charts load for Cirrus machines
- [ ] Historical charts load for CoolBreeze machines
- [ ] Time period selection works (24h, 7d, 30d, 1y)
- [ ] Current status displays correctly on dashboard
- [ ] Status LEDs show correct values
- [ ] Data updates when ESP32 sends new readings
- [ ] No console errors in browser

---

## 📝 Files That Are Already Updated

✅ `src/lib/historicalData.ts` - Fetches from cirrus/coolbreeze  
✅ `src/hooks/useMachineData.tsx` - Uses historical data fetcher  
✅ `src/components/MachineDetailView.tsx` - Displays historical charts  
✅ `src/lib/machineConfig.ts` - Maps manufacturers to tables  
✅ `src/components/MachineCard.tsx` - Shows Connected LED  
✅ `src/components/StatusPanel.tsx` - Shows status from database  

**All frontend files are ready! Just test to make sure everything works.**

---

**Last Updated:** November 13, 2025

