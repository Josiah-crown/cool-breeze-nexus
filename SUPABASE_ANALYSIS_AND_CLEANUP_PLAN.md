# 📊 Supabase Database Analysis & Cleanup Plan

**Date:** 2025-01-23  
**Purpose:** Analyze current database structure, identify issues, and propose cleanup/optimization

---

## 🔍 Current Database Structure

### **Core Tables (User Management & Machines)**

#### 1. **profiles** ✅ KEEP
- **Purpose:** User profile information (name, email, address, etc.)
- **Columns:** id, name, email, cell_number, country, state, city, street, suburb, po_box, full_name_business, email_subscribed, created_at, updated_at
- **Status:** ✅ Essential - Keep all columns

#### 2. **user_roles** ✅ KEEP
- **Purpose:** Maps users to their roles (super_admin, company, installer, client)
- **Columns:** id, user_id, role, created_by, created_at
- **Status:** ✅ Essential

#### 3. **installer_company_assignments** ✅ KEEP
- **Purpose:** Links installers to companies
- **Columns:** id, installer_id, company_id, assigned_by, assigned_at
- **Status:** ✅ Essential for hierarchy

#### 4. **client_admin_assignments** ✅ KEEP
- **Purpose:** Links clients to installers (who manages them)
- **Columns:** id, client_id, admin_id, assigned_at, assigned_by
- **Status:** ✅ Essential for hierarchy

#### 5. **machines** ✅ KEEP (but needs cleanup)
- **Purpose:** Main machine registry - current status snapshot
- **Current Columns:** 
  - ✅ Essential: id, name, type, manufacturer, owner_id, location, api_key, api_endpoint
  - ✅ Status: is_on, is_connected, is_cooling, fan_active, has_water, has_pump, has_heat
  - ✅ Readings: motor_temp, outside_temp, inside_temp, delta_t, current, voltage, power
  - ✅ Status: overall_status, motor_status
  - ✅ Config: temperature_setpoint
  - ⚠️ **QUESTIONABLE:** notifications_enabled (might be redundant with machine_notification_preferences)
- **Status:** ✅ Keep, but review `notifications_enabled` column

---

### **Data Processing Tables**

#### 6. **readings_raw** ⚠️ **REPLACE/REFACTOR**
- **Purpose:** Temporary storage for raw sensor readings before processing
- **Current Issue:** 
  - Data is deleted immediately after processing
  - No historical backup
  - You can't access old raw data
- **Proposed Solution:** Replace with manufacturer-specific `*_raw` tables (see below)

#### 7. **cirrus** ✅ KEEP (but needs voltage columns check)
- **Purpose:** Processed/calculated data for Cirrus machines
- **Current Columns:**
  - ✅ Has `voltage` column (line 31) - **VOLTAGE EXISTS!**
  - ✅ Has `current`, `power`
  - ✅ Has all operational states
  - ✅ Has calculated status fields
- **Status:** ✅ Keep - voltage column already exists

#### 8. **coolbreeze** ✅ KEEP (but needs voltage columns check)
- **Purpose:** Processed/calculated data for CoolBreeze machines
- **Current Columns:**
  - ✅ Has `voltage` column (line 32) - **VOLTAGE EXISTS!**
  - ✅ Has pickup voltages: `exhaust_voltage`, `fan_voltage`, `pump_voltage`, `drain_voltage`
  - ✅ Has all operational states
- **Status:** ✅ Keep - voltage columns already exist

---

### **Configuration Tables**

#### 9. **machine_voltage_config** ✅ KEEP
- **Purpose:** Maps voltage inputs (1-4) to functions per machine
- **Columns:** id, machine_id, voltage_input_1_function, voltage_input_2_function, voltage_input_3_function, voltage_input_4_function, voltage_active_threshold
- **Status:** ✅ Essential for processing raw readings

#### 10. **machine_alert_config** ✅ KEEP
- **Purpose:** Customizable alert thresholds per machine
- **Columns:** Many threshold fields (motor_temp_warning, motor_temp_critical, etc.)
- **Status:** ✅ Essential for alert system

---

### **Notification & Alert Tables**

#### 11. **machine_notification_preferences** ✅ KEEP
- **Purpose:** Per-user notification settings per machine
- **Columns:** id, machine_id, user_id, enabled, created_at, updated_at
- **Status:** ✅ Essential

#### 12. **alert_states** ✅ KEEP
- **Purpose:** Currently active alert conditions
- **Columns:** id, machine_id, alert_type, severity, condition_started_at, etc.
- **Status:** ✅ Essential

#### 13. **alert_history** ✅ KEEP
- **Purpose:** Permanent log of all alert emails sent
- **Columns:** id, machine_id, alert_type, severity, message, recipients, etc.
- **Status:** ✅ Essential

#### 14. **email_subscriptions** ❓ **CHECK IF EXISTS**
- **Purpose:** User email subscription preferences (GDPR)
- **Status:** Added to `profiles` table as `email_subscribed` column

---

### **API & Security Tables**

#### 15. **api_keys** ✅ KEEP
- **Purpose:** API keys for ESP32 authentication
- **Columns:** id, key, machine_id, created_by, created_at, last_used_at, is_active, description
- **Status:** ✅ Essential

#### 16. **edge_function_rate_limit** ⚠️ **REVIEW**
- **Purpose:** Rate limiting for edge function calls
- **Columns:** machine_id, last_call_at, call_count, created_at, updated_at
- **Status:** ⚠️ Might be unnecessary if using pg_cron or other rate limiting
- **Question:** Are you using this? If not, can be removed.

---

## 🚨 Issues Identified

### **1. Missing Historical Raw Data** ⚠️ **CRITICAL**
- **Problem:** `readings_raw` is deleted immediately after processing
- **Impact:** Can't access old raw sensor data for debugging/analysis
- **Solution:** Create `cirrus_raw` and `coolbreeze_raw` tables with 2-week retention

### **2. Voltage Columns** ✅ **RESOLVED**
- **Status:** Both `cirrus` and `coolbreeze` tables **DO have voltage columns**
- **Cirrus:** Has `voltage` column (line 31)
- **CoolBreeze:** Has `voltage` + pickup voltages (`exhaust_voltage`, `fan_voltage`, `pump_voltage`, `drain_voltage`)

### **3. Unnecessary Columns** ⚠️ **NEEDS REVIEW**
- **machines.notifications_enabled:** Might be redundant (we have `machine_notification_preferences`)
- **readings_raw:** Many old records that should be cleaned
- **edge_function_rate_limit:** Check if actually used

### **4. System Not Expansion-Friendly** ⚠️ **CRITICAL**
- **Problem:** Adding new manufacturer requires code changes in multiple places
- **Current Flow:** `readings_raw` → trigger → `cirrus`/`coolbreeze`
- **Proposed Flow:** `manufacturer_raw` → trigger → `manufacturer_calculated`

---

## 💡 Proposed Architecture

### **New Pattern: Manufacturer-Specific Tables**

Instead of:
```
readings_raw → [trigger] → cirrus/coolbreeze
```

Use:
```
cirrus_raw (2 weeks) → [trigger] → cirrus_calculated
coolbreeze_raw (2 weeks) → [trigger] → coolbreeze_calculated
[future] brandx_raw (2 weeks) → [trigger] → brandx_calculated
```

### **Benefits:**
1. ✅ **Expansion-Friendly:** Add new manufacturer = add 2 tables
2. ✅ **Historical Data:** 2 weeks of raw data for debugging
3. ✅ **Cleaner:** No shared `readings_raw` table
4. ✅ **Better Organization:** Each manufacturer has its own data

---

## 📋 Proposed Changes

### **Phase 1: Create New Tables** (No data loss)

1. **Create `cirrus_raw` table**
   - Store raw readings for 2 weeks
   - Auto-delete older than 14 days
   - Same structure as current `readings_raw`

2. **Create `coolbreeze_raw` table**
   - Store raw readings for 2 weeks
   - Auto-delete older than 14 days
   - Same structure as current `readings_raw`

3. **Rename existing tables:**
   - `cirrus` → `cirrus_calculated`
   - `coolbreeze` → `coolbreeze_calculated`

### **Phase 2: Update Triggers** (No data loss)

1. **Update processing triggers:**
   - `cirrus_raw` → `cirrus_calculated`
   - `coolbreeze_raw` → `coolbreeze_calculated`

2. **Add cleanup jobs:**
   - pg_cron job to delete data older than 14 days from `*_raw` tables

### **Phase 3: Migrate Data** (Optional)

1. **Backfill `cirrus_calculated` from existing `cirrus` data**
2. **Backfill `coolbreeze_calculated` from existing `coolbreeze` data**

### **Phase 4: Cleanup** (After migration confirmed working)

1. **Delete `readings_raw` table** (after confirming new system works)
2. **Remove `machines.notifications_enabled`** (if redundant)
3. **Remove `edge_function_rate_limit`** (if not used)

---

## 🗑️ Cleanup Tasks

### **Immediate Cleanup (Safe to do now):**

1. **Clean old `readings_raw` data:**
   ```sql
   -- Delete readings_raw older than 1 day (they're processed anyway)
   DELETE FROM readings_raw WHERE created_at < NOW() - INTERVAL '1 day';
   ```

2. **Check for unused columns:**
   - Review `machines.notifications_enabled` usage
   - Review `edge_function_rate_limit` usage

### **After New System is Working:**

1. **Drop `readings_raw` table**
2. **Remove redundant columns**
3. **Clean up old migration files** (keep only final state)

---

## 📝 Minimal SQL Rebuild Script

For future private Supabase instance, here's the minimal SQL needed:

### **Core Tables (User Management)**
- `profiles` - User profiles
- `user_roles` - Role assignments
- `installer_company_assignments` - Installer-company links
- `client_admin_assignments` - Client-installer links
- `machines` - Machine registry

### **Manufacturer Tables (Per Manufacturer)**
- `{manufacturer}_raw` - 2-week raw data storage
- `{manufacturer}_calculated` - Processed/calculated data

### **Configuration Tables**
- `machine_voltage_config` - Voltage input mappings
- `machine_alert_config` - Alert thresholds

### **Notification Tables**
- `machine_notification_preferences` - User notification settings
- `alert_states` - Active alerts
- `alert_history` - Alert log

### **Security Tables**
- `api_keys` - API key management

---

## ❓ Questions for You

1. **Are you using `edge_function_rate_limit`?** If not, we can remove it.

2. **Is `machines.notifications_enabled` used anywhere?** Or is it redundant with `machine_notification_preferences`?

3. **Do you want to keep old `readings_raw` data?** Or can we delete everything older than 1 day?

4. **When should we implement the new `*_raw` → `*_calculated` pattern?**
   - Now (with migration)
   - Later (after testing)

5. **Should I create the new tables and migration scripts now?** Or do you want to review this first?

---

## 🎯 Next Steps

**Before I make any changes, please confirm:**

1. ✅ Review this analysis
2. ✅ Answer the questions above
3. ✅ Approve the proposed architecture
4. ✅ Confirm which cleanup tasks to proceed with

**I will NOT delete or modify anything until you approve!**

---

## 📚 Documentation Status

**Current Documentation:**
- ❌ No comprehensive database schema documentation found
- ❌ No table purpose documentation found
- ✅ Migration files exist but are scattered

**Proposed:**
- Create `DATABASE_SCHEMA.md` with all tables explained
- Create `MIGRATION_GUIDE.md` for future rebuilds
- Clean up old migration files (keep only final state)

---

**Ready for your review and approval!** 🚀

