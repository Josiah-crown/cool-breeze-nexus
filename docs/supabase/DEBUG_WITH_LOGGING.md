# Debug Function with Logging

## Step 1: Run Deep Debug Query

First, run `docs/supabase/DEEP_DEBUG_FUNCTION.sql` to see all the different boolean checks and what they evaluate to.

This will show you:
- What `is_connected` value is in the cirrus table
- How different boolean checks evaluate (`= true`, `IS TRUE`, `IS NOT FALSE`)
- What the direct fix logic calculates
- What the function logic calculates

**Share the results** - this will help us see if there's a subtle difference.

---

## Step 2: Run Migration 26d (With Debug Logging)

**File:** `supabase/migrations/20250108000026d_fix_function_with_debug_logging.sql`

1. Open Supabase Dashboard → SQL Editor
2. Copy the entire contents of `20250108000026d_fix_function_with_debug_logging.sql`
3. Paste and run it
4. This adds `RAISE NOTICE` statements that will show in the logs

---

## Step 3: Check Logs After Running Function

After running Migration 26d, when you call the function:

```sql
SELECT public.update_machine_from_latest_reading('c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42');
```

**Check the Supabase logs:**
1. Go to Supabase Dashboard → Logs → Postgres Logs
2. Look for messages starting with "DEBUG:"
3. These will show:
   - Which branch the function entered
   - What `is_connected` value it saw
   - What `minutes_ago` it calculated
   - What the final `v_is_connected` result was

**Share the log output** - this will tell us exactly what the function is seeing and why it's making the wrong decision.

---

## Alternative: Check Logs in SQL Editor

If you can't access Postgres Logs, you can also check by running:

```sql
-- This will show recent notices/warnings
SELECT * FROM pg_stat_statements 
WHERE query LIKE '%update_machine_from_latest_reading%'
ORDER BY calls DESC
LIMIT 10;
```

Or check the Supabase Dashboard → Database → Logs for recent activity.

---

**Last Updated:** November 17, 2025

