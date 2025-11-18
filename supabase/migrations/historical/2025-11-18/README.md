# Historical SQL Files - November 18, 2025

## Overview
This folder contains all SQL scripts created during the November 18, 2025 session to fix RLS (Row Level Security) issues preventing historical data access.

## The Solution
**File:** `15_FIX_TABLE_PERMISSIONS.sql` - **THIS IS THE FIX THAT WORKED**

The root cause was missing table-level GRANT permissions. Even with proper RLS policies, the `authenticated` role needs explicit `GRANT SELECT` permission on the table.

## Files in This Folder

### The Fix (Use This One)
- `15_FIX_TABLE_PERMISSIONS.sql` - **THE SOLUTION** - Grants table-level SELECT permissions

### Diagnostic Files
- `QUICK_DIAGNOSTIC.sql` - Quick state check
- `DIAGNOSE_RLS_ISSUE.sql` - RLS diagnostic queries
- `DIAGNOSE_ZERO_COUNT.sql` - Zero count diagnostic
- `CHECK_HISTORICAL_DATA_FOR_MACHINE.sql` - Machine-specific check
- `06_QUICK_USER_CHECK.sql` - User role verification
- `12_FINAL_DIAGNOSTIC.sql` - Comprehensive diagnostic
- `14_CHECK_TABLE_PERMISSIONS.sql` - Check GRANT permissions

### Fix Attempts (Historical - These Didn't Work)
- `01_FIX_MANUFACTURER_FOR_EXISTING_MACHINE.sql` - Set manufacturer for existing machines
- `02_FIX_RLS_FOR_CIRRUS_HISTORICAL_DATA.sql` - Initial RLS fix attempt
- `02B_FIX_RLS_SIMPLIFIED.sql` - Simplified approach
- `02C_FIX_RLS_COMPLETE.sql` - Complete fix with verification
- `02D_FIX_RLS_WITH_GRANTS.sql` - Added function grants
- `03_FINAL_RLS_FIX.sql` - Comprehensive fix
- `05_EMERGENCY_RLS_FIX.sql` - Emergency approach
- `07_MATCH_MACHINES_TABLE_POLICIES.sql` - Match machines table structure
- `08_VERIFY_AND_FIX_ACTIVE_POLICIES.sql` - Policy verification
- `09_EXACT_MATCH_MACHINES_POLICY.sql` - Exact match without enum cast
- `10_NUCLEAR_OPTION_TEMPORARY_FIX.sql` - Test with USING (true)
- `13_USE_ORIGINAL_MIGRATION_POLICY.sql` - Original migration structure

### Verification
- `03_CHECK_HISTORICAL_DATA_AFTER_FIX.sql` - Post-fix verification

## Key Learning
**RLS policies control WHICH rows users can see, but GRANTs control WHETHER users can access the table at all.**

When adding new tables with RLS:
1. Create the table
2. Enable RLS
3. **GRANT SELECT to authenticated and anon roles** ← This was missing!
4. Create RLS policies

## Related Documentation
- See `docs/supabase/historical/2025-11-18/` for troubleshooting guides
- See `DAILY_LOGS/2025-11-18_SESSION_SUMMARY.md` for full session details
- See `docs/supabase/RLS_POLICY_TEMPLATE_FOR_NEW_TABLES.md` for future reference

