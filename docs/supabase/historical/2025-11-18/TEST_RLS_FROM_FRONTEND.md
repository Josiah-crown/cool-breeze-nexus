# Testing RLS from Frontend

## The Problem

When running queries in Supabase SQL Editor with `postgres` role:
- `auth.uid()` returns `NULL`
- RLS policies can't match records (they check `auth.uid()`)
- This is **expected behavior** - SQL Editor queries bypass RLS

## The Real Test

The RLS policy needs to work when accessed from the **frontend (browser)**, where:
- User is authenticated
- `auth.uid()` returns the actual user ID
- RLS policies are enforced

## How to Test

1. **Open your website** (localhost:8080)
2. **Open browser DevTools** (F12) → Console tab
3. **Click on your Cirrus machine** to view details
4. **Check the console** for:
   - ✅ **Success**: `[Historical Data] Fetched X readings from cirrus` (no 403 error)
   - ❌ **Failure**: `403 (Forbidden)` or `permission denied for table cirrus`

## If You Still Get 403 Error

The RLS policy might not be working correctly. Check:

1. **Is the policy created?**
   ```sql
   SELECT policyname, cmd, roles
   FROM pg_policies
   WHERE tablename = 'cirrus';
   ```
   Should show: `"Users can view CIRRUS data for accessible machines"` with `cmd = SELECT` and `roles = {authenticated}`

2. **Is the GRANT statement executed?**
   ```sql
   SELECT 
     p.proname as function_name,
     has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
   FROM pg_proc p
   JOIN pg_namespace n ON p.pronamespace = n.oid
   WHERE n.nspname = 'public' 
     AND p.proname = 'has_role';
   ```
   Should return `authenticated_can_execute = true`

3. **What's your user ID and role?**
   - Check in browser console: The frontend should log your user info
   - Or check in Supabase Auth dashboard

## Quick Fix if Still Getting 403

If you're still getting 403 errors, try running this in SQL Editor (as postgres role):

```sql
-- Verify policy exists and is correct
SELECT 
  policyname,
  cmd,
  roles,
  qual
FROM pg_policies
WHERE tablename = 'cirrus' AND cmd = 'SELECT';

-- If policy doesn't exist or looks wrong, re-run:
-- TODAY/02D_FIX_RLS_WITH_GRANTS.sql
```

## Expected Behavior

- **SQL Editor (postgres role)**: `auth.uid()` is NULL, queries bypass RLS, you see all data
- **Frontend (authenticated user)**: `auth.uid()` is your user ID, RLS enforces access, you see only your accessible data

The 0 count in SQL Editor is **normal** - it's not a problem!

