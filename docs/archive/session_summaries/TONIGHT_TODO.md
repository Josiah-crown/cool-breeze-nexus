# 🚨 Tonight's Priority Tasks

## Critical Issues to Fix

### 1. **"Change Model" Prop Not Being Passed** ⚠️ CODE ISSUE
**Problem:** Console shows `hasOnChangeManufacturer: false` - prop is not reaching MachineCard

**Quick Fix Needed:**
- Check if `handleChangeManufacturer` function is defined in Dashboard.tsx (it is)
- Check if prop is being passed to UserHierarchyView (it is in code)
- **Likely Issue:** Browser/dev server caching - the code changes aren't being picked up

**Action:**
1. Stop dev server completely
2. Delete `.vite` cache folder if it exists
3. Restart: `npm run dev`
4. Hard refresh browser: Ctrl+Shift+R
5. Check console - should see `hasOnChangeManufacturer: true`

**If still not working:**
- Check React DevTools to see actual props being passed
- Verify all 3 UserHierarchyView instances have the prop

---

### 2. **Run Migration 4** ⚠️ **REQUIRED FOR FEATURE**
**File:** `supabase/migrations/20250108000003_add_manufacturer_column.sql`

**Why:** The "Change Model" dialog needs to read/write the `manufacturer` column, which doesn't exist yet.

**Action:**
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `20250108000003_add_manufacturer_column.sql`
3. Run it
4. Verify: Check `machines` table - should have `manufacturer` column

**This will fix:** Console error `column machines.manufacturer does not exist`

---

### 3. **Fix RLS Policy for Cirrus Table** ⚠️ **REQUIRED FOR HISTORICAL DATA**
**File:** `FIX_CIRRUS_RLS.md`

**Why:** Console shows `permission denied for table cirrus` (403 Forbidden)

**Action:**
1. Open Supabase Dashboard → SQL Editor
2. Copy SQL from `FIX_CIRRUS_RLS.md`
3. Run it
4. Verify: Historical data should load without errors

---

## Quick Checklist for Tonight

- [ ] **Stop and restart dev server** (fix prop passing)
- [ ] **Hard refresh browser** (Ctrl+Shift+R)
- [ ] **Run Migration 4** (add manufacturer column)
- [ ] **Fix RLS policy** (allow cirrus table access)
- [ ] **Verify "Change Model" appears** (check dropdown menu)
- [ ] **Test "Change Model" feature** (click it, verify dialog opens)
- [ ] **Check console** (should see no more errors)

---

## Expected Results After Fixes

1. **"Change Model" menu item appears** (without "(DEBUG: prop missing)")
2. **Console shows:** `hasOnChangeManufacturer: true`
3. **No more errors:** `column machines.manufacturer does not exist`
4. **No more errors:** `permission denied for table cirrus`
5. **Historical data loads** correctly
6. **"Change Model" dialog works** when clicked

---

## If Prop Still Not Working

**Last Resort Debug Steps:**
1. Open React DevTools extension
2. Inspect MachineCard component
3. Check Props tab - see if `onChangeManufacturer` exists
4. If missing, trace back through UserHierarchyView → Dashboard

**Alternative:** The prop might be getting lost in a conditional render. Check if the machine card is being rendered in a context where the prop isn't available.

---

## Summary

**Two separate issues:**
1. **Code issue:** Prop not being passed (likely caching)
2. **Database issue:** Missing `manufacturer` column (Migration 4)

**Both need to be fixed for feature to work completely.**

---

**Priority Order:**
1. Restart dev server + hard refresh (fix prop)
2. Run Migration 4 (add column)
3. Fix RLS policy (fix historical data)
4. Test everything

