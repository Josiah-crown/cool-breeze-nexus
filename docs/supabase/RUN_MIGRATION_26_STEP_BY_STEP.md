# How to Run Migration 26 (Step by Step)

## Problem
Migration 26 reverted the connection status fix because the DO block at the end automatically updated all machines, and the function might still have issues.

## Solution
Run Migration 26 in two parts:

---

## Step 1: Run Part A (Function Fix Only)

**File:** `supabase/migrations/20250108000026a_fix_function_part1.sql`

1. Open Supabase Dashboard → SQL Editor
2. Copy the **entire contents** of `20250108000026a_fix_function_part1.sql`
3. Paste into SQL Editor
4. Click **Run**
5. ✅ Verify: Should see "Success. No rows returned"

**What this does:**
- Replaces the `update_machine_from_latest_reading()` function with the fixed version
- Uses explicit `IS TRUE` boolean checks
- Does NOT update any machines automatically

---

## Step 2: Test the Function (Optional but Recommended)

Test the function on your specific machine before updating all machines:

```sql
-- Test on your machine (replace with your machine ID)
SELECT public.update_machine_from_latest_reading('c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42');

-- Check if it worked
SELECT 
  name,
  is_connected,
  updated_at
FROM public.machines
WHERE id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42';
```

**Expected Result:**
- `is_connected` should be `true` if device has recent data (within 15 minutes)
- `is_connected` should be `false` if device is offline

---

## Step 3: Run Part B (Optional - Update All Machines)

**File:** `supabase/migrations/20250108000026b_optional_update_all_machines.sql`

**⚠️ Only run this if Step 2 worked correctly!**

1. Open Supabase Dashboard → SQL Editor
2. Copy the **entire contents** of `20250108000026b_optional_update_all_machines.sql`
3. Paste into SQL Editor
4. Click **Run**
5. ✅ Verify: Should see "Success. No rows returned"

**What this does:**
- Updates all machines using the fixed function
- Only run this if you verified the function works in Step 2

**Alternative:** You can skip this step entirely. Machines will update automatically when new data arrives (via the triggers).

---

## If Function Still Doesn't Work

If after Step 1, the function still sets `is_connected = false` incorrectly:

1. **Don't run Step 3** (don't update all machines)
2. **Re-run the direct fix:**
   - Use `docs/supabase/DIRECT_FIX_CONNECTION.sql` to fix your machine
3. **Debug the function:**
   - Check what the function sees:
   ```sql
   SELECT 
     c.is_connected,
     EXTRACT(EPOCH FROM (NOW() - c.timestamp))/60 as minutes_ago,
     (c.is_connected IS TRUE) as condition1,
     (EXTRACT(EPOCH FROM (NOW() - c.timestamp))/60 <= 15) as condition2
   FROM public.cirrus c
   WHERE machine_id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42'
   ORDER BY timestamp DESC
   LIMIT 1;
   ```

---

## Summary

1. ✅ Run Part A (function fix)
2. ✅ Test function on your machine
3. ⏳ Run Part B only if test passed (or skip - machines will update automatically)

**Last Updated:** November 17, 2025

