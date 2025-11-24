# 🧪 Quick Test Guide - Dev Server

## ✅ **All Fixes Applied - Ready to Test**

The dev server should be running at: **http://localhost:8080**

---

## 🧪 **Test Each Issue**

### **1. Test CoolBreeze False Data** ✅

**Steps:**
1. Open a CoolBreeze machine that's NOT connected
2. Check the detail view

**Expected Results:**
- ✅ Status lights should all be **grey/inactive** (not green)
- ✅ Temperature readings should show **"N/A"** (not 20.0°C)
- ✅ Voltage, current, power should show **"N/A"**
- ✅ Delta T should show **"N/A"**
- ✅ Motor status should be **inactive**

**If Still Showing False Data:**
- Check browser console for errors
- Verify machine is actually disconnected (no readings in last 15 min)

---

### **2. Test Change Owner** ✅

**Steps:**
1. As super admin, click on any machine
2. Click "Change Owner" from dropdown
3. Check the dropdown list

**Expected Results:**
- ✅ Dropdown should show: **companies, installers, and clients**
- ✅ Should be able to select and change owner
- ✅ Should work without errors

**If Still Not Working:**
- Check browser console for errors
- Verify you're logged in as super admin
- Check if users exist in database

---

### **3. Test Location Display** ⚠️

**Steps:**
1. Open browser console (F12)
2. Look for `MachineCard DEBUG:` logs
3. Check `location` value in the log

**Expected Results:**
- ✅ Console should show location value (or null)
- ✅ If location exists, it should display on card
- ✅ If location is null, it won't display (expected)

**If Location is Null:**
- Check database: `SELECT id, name, manufacturer, location FROM machines WHERE manufacturer = 'CoolBreeze';`
- If location is null, update it:
  ```sql
  UPDATE machines 
  SET location = 'Your Location Here' 
  WHERE id = 'MACHINE_ID';
  ```

---

## 🔍 **Debug Information**

### **Check Browser Console:**
- Look for `MachineCard DEBUG:` logs
- Check for any errors
- Verify location value

### **Check Database:**
```sql
-- Check machine location
SELECT id, name, manufacturer, location 
FROM machines 
WHERE manufacturer = 'CoolBreeze';

-- Check connection status (should be false if no recent readings)
SELECT id, name, is_connected, updated_at 
FROM machines 
WHERE manufacturer = 'CoolBreeze';
```

---

## 📋 **If Issues Persist**

1. **Hard Refresh Browser:** Ctrl+Shift+R
2. **Check Console:** Look for errors
3. **Check Database:** Verify data exists
4. **Check Network Tab:** Verify API calls are working

---

**Last Updated:** November 20, 2025  
**Status:** Ready for testing

