# 📊 Database Schema Documentation

**Last Updated:** 2025-01-23  
**Purpose:** Complete documentation of the database structure for the IoT Nexus platform

---

## 🏗️ Architecture Overview

The database follows a **manufacturer-agnostic, expansion-friendly** design:

- **Shared Tables:** User management, machine registry, connection status (generic functions)
- **Per-Manufacturer Tables:** Each manufacturer has 4 tables (raw, calculated, notifications, voltage_config)
- **Pattern:** `{manufacturer}_{type}` (e.g., `cirrus_raw`, `cirrus_calculated`, `cirrus_notifications`, `cirrus_voltage_config`)

### **Data Flow:**
```
ESP32 → {manufacturer}_raw → [trigger] → {manufacturer}_calculated → machines (status update)
                                              ↓
                                  machine_connection_status (update)
```

---

## 📋 Table Catalog

### **1. User Management Tables**

#### **`profiles`**
- **Purpose:** User profile information
- **Columns:**
  - `id` (UUID, PK, FK → auth.users)
  - `name` (TEXT, UNIQUE)
  - `email` (TEXT)
  - `cell_number` (TEXT)
  - `country`, `state`, `city`, `street`, `suburb`, `po_box` (TEXT)
  - `full_name_business` (TEXT)
  - `email_subscribed` (BOOLEAN) - GDPR compliance
  - `created_at`, `updated_at` (TIMESTAMPTZ)

#### **`user_roles`**
- **Purpose:** Maps users to their roles
- **Columns:**
  - `id` (UUID, PK)
  - `user_id` (UUID, FK → auth.users)
  - `role` (app_role ENUM: 'super_admin', 'company', 'installer', 'client')
  - `created_by` (UUID, FK → auth.users)
  - `created_at` (TIMESTAMPTZ)
- **Unique Constraint:** (user_id, role)

#### **`installer_company_assignments`**
- **Purpose:** Links installers to companies
- **Columns:**
  - `id` (UUID, PK)
  - `installer_id` (UUID, FK → auth.users)
  - `company_id` (UUID, FK → auth.users)
  - `assigned_by` (UUID, FK → auth.users)
  - `assigned_at` (TIMESTAMPTZ)

#### **`client_admin_assignments`**
- **Purpose:** Links clients to installers (who manages them)
- **Columns:**
  - `id` (UUID, PK)
  - `client_id` (UUID, FK → auth.users, UNIQUE)
  - `admin_id` (UUID, FK → auth.users) - The installer who manages this client
  - `assigned_at` (TIMESTAMPTZ)
  - `assigned_by` (UUID, FK → auth.users)

---

### **2. Machine Registry**

#### **`machines`**
- **Purpose:** Main machine registry - basic info only (status comes from `{manufacturer}_calculated` tables)
- **Columns:**
  - `id` (UUID, PK)
  - `name` (TEXT)
  - `type` (TEXT) - CHECK: 'evaporative', 'heatpump', 'airconditioner'
  - `manufacturer` (TEXT) - e.g., 'Cirrus', 'CoolBreeze'
  - `owner_id` (UUID, FK → auth.users)
  - `location` (TEXT)
  - `api_key` (TEXT) - For ESP32 authentication
  - `api_endpoint` (TEXT)
  - `temperature_setpoint` (NUMERIC) - For heat pumps (0-75°C)
  - `created_at`, `updated_at` (TIMESTAMPTZ)
- **Note:** Status columns (is_on, fan_active, etc.) are NOT stored here - they come from `{manufacturer}_calculated` tables

---

### **3. Connection Status (Shared)**

#### **`machine_connection_status`**
- **Purpose:** Generic connection tracking for all manufacturers
- **Columns:**
  - `id` (UUID, PK)
  - `machine_id` (UUID, FK → machines, UNIQUE)
  - `last_seen_at` (TIMESTAMPTZ) - Last time machine sent data
  - `is_connected` (BOOLEAN) - Calculated: last_seen_at within 15 minutes
  - `connection_quality` (TEXT) - 'excellent', 'good', 'fair', 'poor', 'disconnected'
  - `last_reading_timestamp` (TIMESTAMPTZ) - Timestamp of last reading
  - `consecutive_failures` (INTEGER) - Count of consecutive missed readings
  - `created_at`, `updated_at` (TIMESTAMPTZ)
- **Why Shared:** Connection logic is the same for all manufacturers

---

### **4. API Keys**

#### **`api_keys`**
- **Purpose:** API keys for ESP32 authentication
- **Columns:**
  - `id` (UUID, PK)
  - `key` (TEXT, UNIQUE) - The API key string
  - `machine_id` (UUID, FK → machines)
  - `created_by` (UUID, FK → auth.users)
  - `created_at` (TIMESTAMPTZ)
  - `last_used_at` (TIMESTAMPTZ)
  - `is_active` (BOOLEAN)
  - `description` (TEXT)

---

### **5. Notification Preferences (Shared)**

#### **`machine_notification_preferences`**
- **Purpose:** Per-user notification settings per machine
- **Columns:**
  - `id` (UUID, PK)
  - `machine_id` (UUID, FK → machines)
  - `user_id` (UUID, FK → profiles)
  - `enabled` (BOOLEAN) - Whether this user receives notifications for this machine
  - `created_at`, `updated_at` (TIMESTAMPTZ)
- **Unique Constraint:** (machine_id, user_id)

---

### **6. Per-Manufacturer Tables**

For each manufacturer (Cirrus, CoolBreeze, FutureBrandX, etc.), there are 4 tables:

#### **6.1 `{manufacturer}_raw`** - Raw Sensor Readings
- **Purpose:** Store raw readings from ESP32
- **Retention:** 2 weeks (configurable, eventually from frontend)
- **Columns:**
  - `id` (UUID, PK)
  - `machine_id` (UUID, FK → machines)
  - `timestamp` (TIMESTAMPTZ)
  - **Raw Sensors:**
    - `motor_temp`, `inside_temp`, `outside_temp` (NUMERIC(5,2))
    - `current`, `voltage` (NUMERIC(6,2)) - Main line voltage from CT
  - **Voltage Pickups:** `voltage_input_1` through `voltage_input_6` (NUMERIC(5,2))
  - **Water:** `has_water` (BOOLEAN)
  - **Metadata:** `sensor_read_count` (INTEGER), `api_key_used` (TEXT)
  - `created_at` (TIMESTAMPTZ)
- **Auto-cleanup:** pg_cron job deletes data older than retention period

#### **6.2 `{manufacturer}_calculated`** - Processed/Calculated Data
- **Purpose:** Processed status and historical data for frontend
- **Retention:** 1 year (fixed)
- **Columns:**
  - `id` (UUID, PK)
  - `machine_id` (UUID, FK → machines)
  - `timestamp` (TIMESTAMPTZ)
  - **Temperatures:** `ambient_temp`, `duct_temp`, `motor_temp`, `delta_t` (NUMERIC(5,2))
  - **Main Electrical:** `voltage` (line voltage from CT), `current`, `power` (NUMERIC)
  - **Pickup Voltages:** `voltage_1` through `voltage_6` (NUMERIC(5,2)) - Mapped from voltage_inputs via voltage_config
  - **Operational States:** `fan_active`, `fan_speed` (INTEGER, 0-100%), `pump_active`, `drain_active`, `exhaust_active`, `is_cooling`, `is_on`, `is_connected` (BOOLEAN)
  - **Water:** `has_water` (BOOLEAN), `water_level` (NUMERIC, if applicable)
  - **Status:** `overall_status`, `motor_status`, `water_status`, `cooling_status` (TEXT)
  - **Compliance:** `motor_temp_within_parameters`, `current_within_parameters`, etc. (BOOLEAN)
  - `status_details` (JSONB)
  - `created_at`, `updated_at` (TIMESTAMPTZ)
- **Auto-cleanup:** pg_cron job deletes data older than 1 year

#### **6.3 `{manufacturer}_notifications`** - Notification Configuration
- **Purpose:** Per-manufacturer notification thresholds and settings
- **Columns:**
  - `id` (UUID, PK)
  - `machine_id` (UUID, FK → machines, UNIQUE)
  - **Temperature Thresholds:** `motor_temp_warning`, `motor_temp_critical` (DECIMAL)
  - **Current Thresholds:** `motor_amps_warning`, `compressor_amps_warning` (DECIMAL)
  - **Voltage Thresholds:** `voltage_min`, `voltage_max`, `pickup_voltage_min` (DECIMAL)
  - **Delta T Thresholds:** `delta_t_min_cooling`, `delta_t_min_heating`, `delta_t_max_heating` (DECIMAL)
  - **Duration Thresholds:** `duration_motor_temp_critical`, `duration_fan_failure`, etc. (INTEGER, minutes)
  - **Alert Settings:** `reminder_interval_hours` (INTEGER), `send_recovery_emails` (BOOLEAN)
  - `created_at`, `updated_at` (TIMESTAMPTZ)

#### **6.4 `{manufacturer}_voltage_config`** - Voltage Input Mappings
- **Purpose:** Maps which voltage_input (1-6) corresponds to which function
- **Columns:**
  - `id` (UUID, PK)
  - `machine_id` (UUID, FK → machines, UNIQUE)
  - **Mappings:** `voltage_input_1_function` through `voltage_input_6_function` (TEXT)
    - Values: 'Custom_1', 'Custom_2', 'Custom_3', 'Custom_4', 'Custom_5', 'Custom_6', 'unused'
  - `voltage_active_threshold` (NUMERIC(4,2)) - Voltage threshold for "active" state (default 6.0V)
  - `created_at`, `updated_at` (TIMESTAMPTZ)

---

## 🔄 Data Processing Flow

### **Step-by-Step:**

1. **ESP32 sends data** → POST to `{manufacturer}_raw` table
2. **Trigger fires** → `process_{manufacturer}_reading()` function
3. **Read voltage_config** → Map voltage_inputs to Custom_1-6
4. **Calculate states** → Determine fan_active, pump_active, etc. from pickup voltages
5. **Insert into calculated** → Store processed data in `{manufacturer}_calculated`
6. **Update machines** → Update `machines` table with latest status (from calculated)
7. **Update connection_status** → Update `machine_connection_status` with last_seen_at

---

## 📊 Example: Cirrus Tables

### **Cirrus Raw**
- Stores raw sensor readings for 2 weeks
- Includes: temperatures, current, voltage (CT), voltage_input_1-6, has_water

### **Cirrus Calculated**
- Stores processed data for 1 year
- Includes: all temperatures, electrical readings, voltage_1-6 (mapped), operational states, calculated status

### **Cirrus Notifications**
- Stores alert thresholds for Cirrus machines
- Configurable per machine

### **Cirrus Voltage Config**
- Maps voltage_input_1-6 to Custom_1-6
- Configurable per machine

---

## 🔧 Adding a New Manufacturer

To add a new manufacturer (e.g., "BrandX"):

1. **Create 4 tables:**
   - `brandx_raw`
   - `brandx_calculated`
   - `brandx_notifications`
   - `brandx_voltage_config`

2. **Create processing trigger:**
   - `process_brandx_reading()` function
   - Trigger: `brandx_raw` INSERT → calls function → inserts into `brandx_calculated`

3. **Update frontend:**
   - Add to `PROCESSING_TABLE_MAP` in `src/lib/machineConfig.ts`
   - Update historical data queries

4. **That's it!** The system automatically handles the new manufacturer.

---

## 🔐 Row Level Security (RLS)

All tables have RLS enabled. Policies follow this pattern:

- **Super Admin:** Can view/edit all
- **Company:** Can view/edit their machines and installer/client machines
- **Installer:** Can view/edit their machines and client machines
- **Client:** Can view/edit only their machines
- **Service Role:** Can insert/update for processing triggers

---

## 📈 Indexes

All tables have appropriate indexes:
- Primary keys (id)
- Foreign keys (machine_id, user_id, etc.)
- Timestamp indexes (for time-based queries)
- Composite indexes (machine_id + timestamp for historical queries)

---

## 🗑️ Data Retention

- **`{manufacturer}_raw`:** 2 weeks (configurable, eventually from frontend)
- **`{manufacturer}_calculated`:** 1 year (fixed)
- **Auto-cleanup:** pg_cron jobs delete old data automatically

---

## 📝 Notes

- **Voltage Distinction:**
  - `voltage` = Main line voltage from Current Transformer (CT)
  - `voltage_1` through `voltage_6` = Pickup voltages from voltage dividers (12V logic)

- **Status Storage:**
  - Machine status (is_on, fan_active, etc.) is NOT stored in `machines` table
  - Status comes from latest row in `{manufacturer}_calculated` table
  - `machines` table only stores basic info (name, type, manufacturer, owner, location)

- **Expansion:**
  - Adding new manufacturer = add 4 tables
  - No changes needed to shared tables
  - Frontend automatically handles new manufacturers via `PROCESSING_TABLE_MAP`

---

## 🔗 Related Files

- **Complete Schema SQL:** `supabase/migrations/000_COMPLETE_DATABASE_SCHEMA.sql`
- **Frontend Config:** `src/lib/machineConfig.ts`
- **Historical Data:** `src/lib/historicalData.ts`
- **Architecture Proposal:** `PROPOSED_DATABASE_ARCHITECTURE.md`

---

**Last Updated:** 2025-01-23

