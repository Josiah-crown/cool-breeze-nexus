# 🔧 RLS Fix Summary - Machine Creation & Client Deletion Issues

## ✅ **Issues Fixed**

### 1. **Machine Creation Failing** ❌ → ✅
**Error:** `new row violates row-level security policy for table 'machine_notification_preferences'`

**Root Cause:**
- Trigger `create_machine_notification_preferences()` runs when a machine is created
- Trigger tries to insert into `machine_notification_preferences`
- RLS policy only allowed `service_role` to insert
- Trigger runs with user's context, not service role

**Fix Applied:**
1. ✅ Updated trigger functions to use `SECURITY DEFINER` (bypasses RLS)
2. ✅ Updated RLS policy to allow users to insert preferences for machines they own
3. ✅ Kept service role policy for backwards compatibility

**Files Changed:**
- `FIX_MACHINE_CREATION_RLS.sql` - Updates RLS policy
- `FIX_TRIGGER_FUNCTIONS_SECURITY.sql` - Updates trigger functions with SECURITY DEFINER
- `supabase/migrations/20251107000000_add_machine_notification_preferences.sql` - Updated for future migrations

---

### 2. **Client Deletion Failing** ❌ → ✅
**Error:** `fails to send to edge function`

**Root Cause:**
- Edge function `delete-user` was checking for old `admin` role
- System now uses `installer` and `company` roles
- Authorization logic was outdated

**Fix Applied:**
1. ✅ Updated authorization to support new role system:
   - `super_admin` - can delete anyone
   - `company` - can delete their installers and clients
   - `installer` - can delete their clients
   - Users can delete themselves

**Files Changed:**
- `supabase/functions/delete-user/index.ts` - Updated role checks

---

## 🚀 **How to Apply Fixes**

### **Step 1: Fix Machine Creation (Run in Supabase SQL Editor)**

1. **Run `FIX_TRIGGER_FUNCTIONS_SECURITY.sql`**
   - Updates trigger functions to use SECURITY DEFINER
   - This allows triggers to bypass RLS

2. **Run `FIX_MACHINE_CREATION_RLS.sql`**
   - Updates RLS policy to allow users to insert preferences
   - Adds fallback for service role

### **Step 2: Fix Client Deletion**

1. **Deploy the updated edge function:**
   ```bash
   # If using Supabase CLI
   supabase functions deploy delete-user
   
   # Or manually update the function in Supabase dashboard
   ```

2. **Or manually update:**
   - Go to Supabase Dashboard → Edge Functions → `delete-user`
   - Replace the code with the updated version from `supabase/functions/delete-user/index.ts`

---

## ✅ **Testing**

### **Test Machine Creation:**
1. Go to Dashboard
2. Click "Add Machine"
3. Fill in the form
4. Click "Create Machine"
5. ✅ Should succeed without RLS error

### **Test Client Deletion:**
1. Go to Dashboard
2. Find a client user
3. Click delete
4. Confirm deletion
5. ✅ Should succeed without edge function error

---

## 📋 **What Changed**

### **RLS Policy for `machine_notification_preferences`:**
- **Before:** Only `service_role` could insert
- **After:** 
  - Users can insert for machines they own
  - Users can insert for themselves
  - Super admins can insert for any machine
  - Service role can still insert (for backwards compatibility)

### **Trigger Functions:**
- **Before:** Ran with user's privileges (subject to RLS)
- **After:** Run with `SECURITY DEFINER` (bypasses RLS)

### **Delete User Edge Function:**
- **Before:** Checked for `admin` role
- **After:** Checks for `installer`, `company`, and `super_admin` roles
- **Added:** Company can delete their installers and clients

---

## ⚠️ **Important Notes**

1. **SECURITY DEFINER Functions:**
   - These functions now run with elevated privileges
   - They're safe because they only insert notification preferences
   - They don't expose sensitive data

2. **RLS Still Active:**
   - RLS is still enabled on the table
   - Users can only insert preferences for machines they own
   - The trigger just bypasses RLS to do its job

3. **Edge Function:**
   - Uses service role key for admin operations
   - Still validates user authorization
   - Now supports the new role hierarchy

---

**Last Updated:** November 20, 2025  
**Status:** ✅ Fixes ready to apply  
**Priority:** 🔴 **HIGH** - Blocks machine creation and client deletion

