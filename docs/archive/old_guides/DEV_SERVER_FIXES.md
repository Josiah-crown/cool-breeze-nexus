# 🔧 Dev Server Fixes - All Issues

## 🚀 **Start Dev Server**

```bash
npm run dev
```

Then open: http://localhost:8080

---

## ✅ **Fixes Applied**

### **1. Reassign Client Dialog** - FIXED
**Problem:** Querying for old `admin` role, causing 400 Bad Request

**Fix:**
- Updated to query for `installer` role instead
- Fixed query syntax (removed invalid join)
- Changed labels from "Admin" to "Installer"

**File:** `src/components/ReassignClientDialog.tsx`

---

### **2. CoolBreeze RLS Error** - FIX NEEDED
**Problem:** `permission denied for table coolbreeze` (403 Forbidden)

**Fix:**
- Run `FIX_COOLBREEZE_RLS.sql` in Supabase SQL Editor
- This will update the RLS policy to allow access

**Action Required:**
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `FIX_COOLBREEZE_RLS.sql`
3. Run it
4. Refresh your dev server

---

### **3. Machine Assignment (Super Admin)** - FIXED
**Problem:** Dropdown empty when trying to assign machine

**Fix:**
- Updated `AddMachineDialog` to support new role system
- Super admin now sees: companies, installers, and clients

**File:** `src/components/AddMachineDialog.tsx` (already fixed)

---

### **4. CoolBreeze Showing False Data** - NEEDS INVESTIGATION
**Problem:** Showing water level and temperature even without device connected

**Possible Causes:**
1. Default values in database (0.0, false, etc.)
2. Last reading still in database
3. Connection status calculation issue

**Action Required:**
- Check if machine has any readings in `coolbreeze` table
- Check connection status calculation logic
- May need to clear old data or fix connection status

---

## 📋 **Testing Checklist**

After starting dev server:

1. ✅ **Test Reassign Client:**
   - Go to a client
   - Click "Reassign Client"
   - Dropdown should show installers (not empty)
   - Should be able to reassign

2. ✅ **Test Machine Assignment:**
   - Click "Add Machine"
   - Select "Other Account"
   - Dropdown should show: companies, installers, clients
   - Should be able to assign

3. ⚠️ **Test CoolBreeze:**
   - After running RLS fix, check if historical data loads
   - Check if connection status is correct
   - Verify data is accurate

4. ⚠️ **Check CoolBreeze False Data:**
   - Check database for old readings
   - Verify connection status calculation
   - Check if default values are being displayed

---

## 🔍 **Debug CoolBreeze False Data**

### **Check Database:**
```sql
-- Check if machine has readings
SELECT * FROM coolbreeze 
WHERE machine_id = 'YOUR_MACHINE_ID' 
ORDER BY timestamp DESC 
LIMIT 10;

-- Check machine connection status
SELECT id, name, is_connected, updated_at 
FROM machines 
WHERE manufacturer = 'CoolBreeze';
```

### **Check Connection Status Logic:**
- Connection status should be based on last reading timestamp
- If no readings in last 15 minutes, should show as disconnected
- May need to check `useMachineData.tsx` connection calculation

---

## 🚀 **After Testing on Dev Server**

Once everything works on dev server:

1. **Commit changes:**
   ```bash
   git add .
   git commit -m "Fix: Reassign client, machine assignment, and RLS issues"
   ```

2. **Push to GitHub:**
   ```bash
   git push origin main
   ```

3. **Wait for auto-deploy** (3-5 minutes)

4. **Test on live site**

---

**Last Updated:** November 20, 2025  
**Status:** Ready for dev server testing

