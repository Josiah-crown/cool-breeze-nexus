# 🔧 Fix CoolBreeze 403 Error - Complete Guide

## 🔴 **The Problem**

You're getting `403 (Forbidden)` when accessing the `coolbreeze` table, even though the RLS policy exists.

## ✅ **The Solution**

Run `FIX_COOLBREEZE_403_COMPLETE.sql` - This recreates the policy using the **EXACT** same pattern as the working `cirrus` table.

---

## 📋 **Step-by-Step Instructions**

### **Step 1: Run the Fix**

1. Open Supabase SQL Editor:
   - Go to: https://supabase.com/dashboard/project/wjyanxstvbiqefmgpccb/sql

2. Copy the entire contents of `FIX_COOLBREEZE_403_COMPLETE.sql`

3. Paste into SQL Editor and click **"Run"** (or press Ctrl+J)

4. Verify the results:
   - Should show "✅ Policy Verification" with 3 policies (SELECT, INSERT, UPDATE)
   - SELECT policy should be named "Users can view CoolBreeze data for accessible machines"

### **Step 2: Clear Browser Cache**

1. **Hard Refresh** your dev server:
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

2. Or clear browser cache:
   - Chrome: Settings → Privacy → Clear browsing data → Cached images and files

### **Step 3: Test**

1. Refresh your dev server (http://localhost:8080)

2. Open browser console (F12)

3. Check for errors:
   - ✅ **Success**: No 403 error, historical data loads
   - ❌ **Still 403**: Continue to troubleshooting

---

## 🔍 **What the Fix Does**

1. **Drops all old policies** - Clean slate
2. **Ensures RLS is enabled** - Verifies table has RLS on
3. **Creates new SELECT policy** - Uses EXACT pattern from working `cirrus` table
4. **Verifies policy creation** - Shows confirmation

**Key Difference:**
- The new policy uses the **EXACT same structure** as the working `cirrus` table policy
- This ensures consistency and reliability

---

## 🐛 **Troubleshooting**

### **If 403 Error Persists:**

1. **Check your user role:**
   ```sql
   SELECT role FROM public.user_roles WHERE user_id = auth.uid();
   ```
   - Should return `super_admin` for you

2. **Check if you own any machines:**
   ```sql
   SELECT COUNT(*) FROM public.machines WHERE owner_id = auth.uid();
   ```

3. **Test the policy directly:**
   ```sql
   SELECT COUNT(*) FROM public.coolbreeze;
   ```
   - If this works, the policy is correct
   - If this fails, check Supabase logs for detailed error

4. **Check Supabase logs:**
   - Dashboard → Logs → Postgres Logs
   - Look for detailed error messages

5. **Verify RLS is enabled:**
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' 
   AND tablename = 'coolbreeze';
   ```
   - `rowsecurity` should be `true`

---

## 📝 **Alternative: Simple Test Policy**

If the complete fix doesn't work, try `FIX_COOLBREEZE_403_SIMPLE_TEST.sql` first:

- Creates a very simple policy (super_admin OR machine owner)
- If this works, we know RLS can work, and the issue is with complex logic
- If this doesn't work, the issue is NOT with the policy logic

---

## ✅ **Expected Result**

After running the fix:
- ✅ No 403 error in browser console
- ✅ Historical data loads for CoolBreeze machines
- ✅ Charts display correctly
- ✅ No permission denied errors

---

**Last Updated:** November 20, 2025  
**Status:** Ready to run

