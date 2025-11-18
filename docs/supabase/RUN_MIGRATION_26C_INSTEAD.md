# Use Migration 26c Instead

## Problem
Migration 26a didn't work - the function still set `is_connected = false` even though the direct fix works.

## Root Cause
The function used `IS TRUE` but the direct fix uses `= true`. While both should work, the direct fix logic is proven to work, so we'll match it exactly.

## Solution
**Run Migration 26c** which uses the **exact same logic** as `DIRECT_FIX_CONNECTION.sql`:

- Uses `c.is_connected = true` (not `IS TRUE`)
- Uses same time calculation
- Matches the working direct fix exactly

---

## Steps

### Step 1: Run Migration 26c
**File:** `supabase/migrations/20250108000026c_fix_function_matching_direct_fix.sql`

1. Open Supabase Dashboard → SQL Editor
2. Copy the **entire contents** of `20250108000026c_fix_function_matching_direct_fix.sql`
3. Paste into SQL Editor
4. Click **Run**
5. ✅ Verify: Should see "Success. No rows returned"

**What this does:**
- Replaces the function with logic that matches the working direct fix exactly
- Does NOT update any machines automatically

### Step 2: Test the Function
```sql
-- Test on your machine (replace with your machine ID)
SELECT public.update_machine_from_latest_reading('c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42');

-- Verify it worked
SELECT 
  'After Migration 26c' as step,
  c.is_connected as cirrus_says,
  m.is_connected as machines_says,
  CASE 
    WHEN c.is_connected = m.is_connected THEN '✅ MATCH - Function is working!'
    ELSE '❌ MISMATCH - Still broken'
  END as result
FROM public.machines m
LEFT JOIN (
  SELECT machine_id, is_connected
  FROM public.cirrus
  WHERE machine_id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42'
  ORDER BY timestamp DESC
  LIMIT 1
) c ON c.machine_id = m.id
WHERE m.id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42';
```

**Expected Result:**
- Should show "✅ MATCH - Function is working!"

### Step 3: If It Works, Update All Machines (Optional)
If Step 2 shows a match, you can optionally run Part B to update all machines:

**File:** `supabase/migrations/20250108000026b_optional_update_all_machines.sql`

**Or skip it** - machines will update automatically when new data arrives.

---

## Why This Should Work

The direct fix uses:
```sql
WHEN c.is_connected = true AND EXTRACT(EPOCH FROM (NOW() - c.timestamp))/60 <= 15
```

Migration 26c now uses:
```sql
v_is_connected := (v_last_cirrus.is_connected = true) AND (v_minutes_ago <= 15);
```

**Exact same logic** - should work identically!

---

**Last Updated:** November 17, 2025

