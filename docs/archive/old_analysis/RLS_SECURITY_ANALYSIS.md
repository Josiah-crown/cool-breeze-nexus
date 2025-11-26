# RLS (Row Level Security) Analysis & Fix Guide

## ⚠️ **CRITICAL SECURITY ISSUE**

**Missing RLS = Security Risk!**

Without RLS enabled, tables can be:
- ✅ **Accessible to all authenticated users** (if using GRANT)
- ❌ **Blocked entirely** (if RLS enabled but no policies = no access)
- ⚠️ **Security vulnerability** (unauthorized data access)

---

## 🔍 **What RLS Does**

**Row Level Security (RLS):**
- Controls **which rows** users can see/modify
- Works at the **database level**
- Enforces access control even if frontend is bypassed
- **Required for secure multi-tenant systems**

**Without RLS:**
- Users might see **all data** (security breach)
- Or users might see **no data** (site breaks)

---

## 📊 **Current Status: Tables That Need RLS**

### **✅ Tables WITH RLS (Good):**
- `profiles` ✅
- `user_roles` ✅
- `client_admin_assignments` ✅
- `machines` ✅
- `api_keys` ✅
- `installer_company_assignments` ✅
- `readings_raw` ✅
- `cirrus` ✅
- `coolbreeze` ✅
- `machine_voltage_config` ✅
- `edge_function_rate_limit` ✅

### **❌ Tables MISSING RLS (Need Fix):**

Based on your screenshot and migrations, these tables likely **don't have RLS**:

1. **`machine_alert_config`** ⚠️ **CRITICAL**
   - Currently uses `GRANT` statements (less secure)
   - Should have RLS policies
   - Contains sensitive threshold data

2. **`alert_states`** ⚠️ **CRITICAL**
   - Currently uses `GRANT` statements
   - Should have RLS policies
   - Contains active alert information

3. **`alert_history`** ⚠️ **IMPORTANT**
   - Currently uses `GRANT` statements
   - Should have RLS policies
   - Contains alert email history

4. **`machine_notification_preferences`** ⚠️ **IMPORTANT**
   - Currently uses `GRANT` statements
   - Should have RLS policies
   - Contains user notification settings

5. **Views (Don't Need RLS):**
   - `machine_connection_status` (view - no RLS needed)
   - `cirrus_data_retention_info` (view - no RLS needed)
   - `coolbreeze_data_retention_info` (view - no RLS needed)

---

## 🚨 **Implications of Missing RLS**

### **Will It Break the Site?**

**Short Answer: Maybe, but probably not immediately.**

**Why:**
- If tables use `GRANT` statements (like `machine_alert_config`), they might work
- But `GRANT` is **less secure** than RLS
- If RLS is enabled but **no policies exist**, the table is **completely blocked**

**Current Behavior:**
- Tables with `GRANT` → Work but insecure
- Tables with RLS but no policies → **Blocked** (site breaks)
- Tables with RLS + policies → **Secure and working**

---

## 🔒 **Security Risks**

### **Without RLS on Sensitive Tables:**

1. **`machine_alert_config`:**
   - ❌ Any authenticated user could see all machine thresholds
   - ❌ Users could modify other users' alert settings
   - ❌ Security breach

2. **`alert_states`:**
   - ❌ Users could see alerts for machines they don't own
   - ❌ Privacy violation

3. **`alert_history`:**
   - ❌ Users could see alert history for all machines
   - ❌ Privacy violation

4. **`machine_notification_preferences`:**
   - ❌ Users could see/modify other users' notification settings
   - ❌ Privacy violation

---

## ✅ **Solution: Add RLS to Missing Tables**

### **Step 1: Check Current Status**

Run this query to see which tables have RLS enabled:

```sql
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'machine_alert_config',
  'alert_states',
  'alert_history',
  'machine_notification_preferences'
)
ORDER BY tablename;
```

**Expected:** All should show `rls_enabled = true`

---

### **Step 2: Enable RLS (If Not Enabled)**

```sql
-- Enable RLS on all tables that need it
ALTER TABLE public.machine_alert_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_notification_preferences ENABLE ROW LEVEL SECURITY;
```

---

### **Step 3: Add RLS Policies**

#### **For `machine_alert_config`:**

```sql
-- Drop existing GRANT-based access (if any)
-- RLS policies will replace this

-- Policy: Users can view alert config for machines they own or have access to
CREATE POLICY "Users can view alert config for accessible machines"
  ON public.machine_alert_config
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = machine_alert_config.machine_id
      AND (
        -- Super admin sees all
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'super_admin'
        )
        OR
        -- Machine owner
        m.owner_id = auth.uid()
        OR
        -- Company sees their machines and installer/client machines
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.installer_company_assignments ica ON ica.installer_id = m.owner_id
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'company'
          AND ica.company_id = ur.user_id
        )
        OR
        -- Installer sees their machines and client machines
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          LEFT JOIN public.client_admin_assignments caa ON caa.client_id = m.owner_id
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'installer'
          AND (m.owner_id = ur.user_id OR caa.admin_id = ur.user_id)
        )
      )
    )
  );

-- Policy: Users can update alert config for machines they own
CREATE POLICY "Users can update alert config for their machines"
  ON public.machine_alert_config
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = machine_alert_config.machine_id
      AND (
        m.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'super_admin'
        )
      )
    )
  );

-- Policy: Service role can insert (for triggers)
CREATE POLICY "Service role can insert alert config"
  ON public.machine_alert_config
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
```

#### **For `alert_states`:**

```sql
-- Policy: Users can view alert states for machines they own or have access to
CREATE POLICY "Users can view alert states for accessible machines"
  ON public.alert_states
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = alert_states.machine_id
      AND (
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'super_admin'
        )
        OR
        m.owner_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.installer_company_assignments ica ON ica.installer_id = m.owner_id
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'company'
          AND ica.company_id = ur.user_id
        )
        OR
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          LEFT JOIN public.client_admin_assignments caa ON caa.client_id = m.owner_id
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'installer'
          AND (m.owner_id = ur.user_id OR caa.admin_id = ur.user_id)
        )
      )
    )
  );

-- Policy: Service role can insert/update (for alert processing)
CREATE POLICY "Service role can manage alert states"
  ON public.alert_states
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

#### **For `alert_history`:**

```sql
-- Policy: Users can view alert history for machines they own or have access to
CREATE POLICY "Users can view alert history for accessible machines"
  ON public.alert_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = alert_history.machine_id
      AND (
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'super_admin'
        )
        OR
        m.owner_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.installer_company_assignments ica ON ica.installer_id = m.owner_id
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'company'
          AND ica.company_id = ur.user_id
        )
        OR
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          LEFT JOIN public.client_admin_assignments caa ON caa.client_id = m.owner_id
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'installer'
          AND (m.owner_id = ur.user_id OR caa.admin_id = ur.user_id)
        )
      )
    )
  );

-- Policy: Service role can insert (for alert logging)
CREATE POLICY "Service role can insert alert history"
  ON public.alert_history
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
```

#### **For `machine_notification_preferences`:**

```sql
-- Policy: Users can view their own notification preferences
CREATE POLICY "Users can view their own notification preferences"
  ON public.machine_notification_preferences
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = machine_notification_preferences.machine_id
      AND (
        m.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'super_admin'
        )
      )
    )
  );

-- Policy: Users can update their own preferences
CREATE POLICY "Users can update their own notification preferences"
  ON public.machine_notification_preferences
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: Service role can insert (for triggers)
CREATE POLICY "Service role can insert notification preferences"
  ON public.machine_notification_preferences
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
```

---

## 🧪 **Testing After Adding RLS**

### **Test 1: Check RLS is Enabled**

```sql
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

### **Test 2: Check Policies Exist**

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
  'machine_alert_config',
  'alert_states',
  'alert_history',
  'machine_notification_preferences'
)
ORDER BY tablename, policyname;
```

### **Test 3: Test Access (As Regular User)**

1. Log in as a regular user (not super admin)
2. Try to access alert config for a machine you don't own
3. Should be **blocked** (good!)
4. Try to access alert config for your own machine
5. Should **work** (good!)

---

## ⚠️ **Important Notes**

### **GRANT vs RLS:**

**Current System Uses GRANT:**
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.machine_alert_config TO authenticated;
```

**Problem:**
- `GRANT` gives access to **all authenticated users**
- No row-level filtering
- Less secure

**Better: RLS + Policies**
- Controls access at **row level**
- More secure
- Follows same pattern as other tables

---

### **Service Role Access:**

**Important:** Service role (used by triggers/edge functions) needs access:
- Use `auth.role() = 'service_role'` in policies
- This allows triggers to work correctly

---

## 🎯 **Quick Fix Script**

I'll create a complete migration file with all RLS policies. Would you like me to:

1. **Create a migration file** with all the RLS policies?
2. **Test it first** to make sure it doesn't break anything?
3. **Provide step-by-step instructions** for applying it?

---

## 📋 **Summary**

### **Current Risk Level: 🟡 MEDIUM-HIGH**

**Why:**
- Some tables use `GRANT` (works but insecure)
- Missing RLS on sensitive tables
- Potential data leakage

### **After Fix: 🟢 SECURE**

**Benefits:**
- ✅ Proper access control
- ✅ Users only see their own data
- ✅ Consistent security model
- ✅ Follows best practices

### **Will Site Break?**

**Probably not immediately**, but:
- ⚠️ Security vulnerability exists
- ⚠️ Should be fixed before production
- ⚠️ Some features might not work correctly

---

**Last Updated:** November 20, 2025  
**Status:** RLS analysis complete - needs implementation  
**Priority:** 🔴 **HIGH** - Security issue

