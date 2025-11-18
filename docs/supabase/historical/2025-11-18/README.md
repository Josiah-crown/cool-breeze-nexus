# Today's Tasks - Historical Data Setup

## Files to Run (In Order)

### 1. `QUICK_DIAGNOSTIC.sql` ⚡ START HERE
**Purpose:** Quick check of current state - see what needs fixing
**Why:** Get overview of all machines, manufacturer status, and data availability
**When:** Run first to see current state

### 2. `01_FIX_MANUFACTURER_FOR_EXISTING_MACHINE.sql`
**Purpose:** Set manufacturer='Cirrus' for existing machines that have manufacturer=NULL
**Why:** The system needs manufacturer to know which table (cirrus/coolbreeze) to query for historical data
**When:** Run after diagnostic, before testing historical data

### 3. `13_USE_ORIGINAL_MIGRATION_POLICY.sql` ⚡ **TRY THIS FIRST**
**Purpose:** Use the original migration policy structure (direct role checks, not has_role function)
**Why:** The original migration uses direct role queries instead of has_role() - maybe that's the issue
**When:** Run after step 2
**Key Difference:** Uses `EXISTS (SELECT 1 FROM user_roles WHERE ...)` instead of `has_role()` function
**After running:** Test in browser with HARD REFRESH (Ctrl+Shift+R)

### 3b. `12_FINAL_DIAGNOSTIC.sql` ⚡ **IF STILL NOT WORKING**
**Purpose:** Comprehensive diagnostic and nuclear option test
**Why:** Still getting 403 after all fixes - need to determine if issue is with policies or something else
**When:** Run if `13_USE_ORIGINAL_MIGRATION_POLICY.sql` doesn't work
**What it does:**
- Checks ALL policies, RLS status, permissions, function grants
- Creates a test policy that allows ALL authenticated users (USING (true))
- If THIS doesn't work, the issue is NOT with RLS policies
**After running:** Test in browser with HARD REFRESH (Ctrl+Shift+R)
**If still 403:** Check Supabase logs (see `11_CHECK_SUPABASE_LOGS.md`)

### 4. `03_CHECK_HISTORICAL_DATA_AFTER_FIX.sql`
**Purpose:** Verify everything works after fixes
**Why:** Confirm manufacturer is set and RLS allows access
**When:** Run after steps 2 and 3 to verify

## Additional Diagnostic Files

- `CHECK_HISTORICAL_DATA_FOR_MACHINE.sql` - Detailed check for a specific machine
- `QUICK_CHECK_HISTORICAL_DATA.md` - Troubleshooting guide

## Current Issues

1. ✅ **Manufacturer is NULL** - Machine needs manufacturer='Cirrus' set
2. ✅ **403 Forbidden Error** - RLS policy blocking access to cirrus table
3. ⏳ **Historical data not showing** - Should work after fixing above issues

## Testing Steps

1. Run SQL files 01 and 02 in Supabase SQL Editor
2. Refresh the website
3. Click on your Cirrus machine
4. Check browser console for `[Historical Data]` logs
5. Scroll down to "Historical Data" section
6. Should see chart with data (if data exists in cirrus table)

## Notes

- After we're done for the day, these files will be moved to their proper locations
- Keep this folder for quick access to today's work files

