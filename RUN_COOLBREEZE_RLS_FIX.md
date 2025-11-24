# 🔧 Fix CoolBreeze RLS Error (403 Forbidden)

## ⚠️ **The Error**

You're seeing: `GET .../coolbreeze?... 403 (Forbidden)`

This means the RLS policy on the `coolbreeze` table is blocking access.

---

## ✅ **The Fix**

I've created `FIX_COOLBREEZE_RLS_FINAL.sql` with a comprehensive fix.

### **Steps to Fix:**

1. **Open Supabase Dashboard:**
   - Go to: https://supabase.com/dashboard/project/wjyanxstvbiqefmgpccb/sql

2. **Run the Fix:**
   - Copy the entire contents of `FIX_COOLBREEZE_RLS_FINAL.sql`
   - Paste into Supabase SQL Editor
   - Click **"Run"** (or press Ctrl+J)

3. **Verify:**
   - The query will show verification results at the bottom
   - Should show 3 policies: SELECT, INSERT, UPDATE

4. **Test:**
   - Refresh your dev server (http://localhost:8080)
   - Check browser console - 403 error should be gone
   - Historical data should load for CoolBreeze machines

---

## 🔍 **What the Fix Does**

1. **Drops the old SELECT policy** (if it exists)
2. **Creates a new SELECT policy** that allows:
   - Super admins to see all CoolBreeze data
   - Machine owners to see their own data
   - Companies to see data for their installers/clients
   - Installers to see data for their clients
   - Clients to see their own data

3. **Verifies the policy was created** (shows results)

---

## ✅ **After Running**

- ✅ 403 error should disappear
- ✅ Historical data should load for CoolBreeze machines
- ✅ No more permission denied errors

---

**File to Run:** `FIX_COOLBREEZE_RLS_FINAL.sql`  
**Location:** Supabase SQL Editor

