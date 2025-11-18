# Check Supabase Logs for RLS Errors

If the nuclear option (`10_NUCLEAR_OPTION_TEMPORARY_FIX.sql`) still doesn't work, the issue is NOT with RLS policies.

## Steps to Check Logs

1. Go to Supabase Dashboard
2. Navigate to **Logs** → **Postgres Logs** (or **API Logs**)
3. Look for errors around the time you tried to access historical data
4. Search for:
   - `cirrus`
   - `permission denied`
   - `RLS`
   - `42501` (PostgreSQL error code for permission denied)

## What to Look For

- **RLS Policy Evaluation Errors**: If you see errors about policy evaluation failing
- **Function Execution Errors**: If `has_role()` function is failing
- **Schema/Search Path Issues**: If there are errors about schema resolution
- **Authentication Issues**: If `auth.uid()` is NULL or not being passed correctly

## Alternative: Check Network Tab

1. Open browser DevTools → **Network** tab
2. Try to access historical data
3. Click on the failed request to `cirrus` table
4. Check:
   - **Request Headers**: Is `Authorization` header present?
   - **Response**: What's the exact error message?
   - **Preview/Response**: Any additional error details?

## If Nuclear Option Works

If `10_NUCLEAR_OPTION_TEMPORARY_FIX.sql` allows access, then:
- The issue IS with the policy logic
- We need to debug why `has_role()` isn't working in RLS context
- Try creating a simpler policy that doesn't use `has_role()` at all

## If Nuclear Option Still Fails

If even `USING (true)` doesn't work, then:
- The issue is NOT with RLS policies
- Could be:
  - Table permissions issue
  - Schema issue
  - Supabase project configuration
  - Frontend authentication not being passed correctly

