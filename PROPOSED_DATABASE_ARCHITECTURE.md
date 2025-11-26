# 🏗️ Proposed Database Architecture

**Date:** 2025-01-23  
**Purpose:** Manufacturer-agnostic, expansion-friendly database design

---

## 🎯 Core Principles

1. **Each manufacturer is self-contained** - All tables are manufacturer-specific
2. **Shared tables only for generic functions** - Connection status, user management
3. **Configurable per manufacturer** - Voltage mappings, notification thresholds
4. **Scalable** - Adding new manufacturer = add 4 tables (raw, calculated, notifications, voltage_config)

---

## 📊 Proposed Table Structure

### **Shared Tables (All Manufacturers)**

#### 1. **User Management** (Existing - Keep)
- `profiles` - User profiles
- `user_roles` - Role assignments  
- `installer_company_assignments` - Installer-company links
- `client_admin_assignments` - Client-installer links

#### 2. **Machine Registry** (Existing - Keep)
- `machines` - Main machine registry
  - Columns: id, name, type, manufacturer, owner_id, location, api_key, etc.
  - **Status columns removed** - Status comes from `{manufacturer}_calculated` table

#### 3. **Connection Status** (NEW - Shared)
- `machine_connection_status` - Generic connection tracking for all manufacturers
  - Columns: machine_id, last_seen_at, is_connected, connection_quality, etc.
  - **Why shared:** Connection logic is the same for all manufacturers

#### 4. **API Keys** (Existing - Keep)
- `api_keys` - API key management

---

### **Per-Manufacturer Tables** (Pattern: `{manufacturer}_{type}`)

For each manufacturer (Cirrus, CoolBreeze, FutureBrandX, etc.):

#### 1. **`{manufacturer}_raw`** - Raw Sensor Readings
- **Purpose:** Store raw readings from ESP32
- **Retention:** Configurable (default 2 weeks, eventually configurable from frontend)
- **Columns:**
  - `id`, `machine_id`, `timestamp`
  - `motor_temp`, `inside_temp`, `outside_temp` (raw sensor values)
  - `current`, `voltage` (main line voltage from CT)
  - `voltage_input_1` through `voltage_input_6` (up to 6 configurable voltage pickups)
  - `has_water` (raw boolean from float switch)
  - `sensor_read_count`, `api_key_used`
- **Auto-cleanup:** pg_cron job deletes data older than retention period

#### 2. **`{manufacturer}_calculated`** - Processed/Calculated Data
- **Purpose:** Processed status and historical data for frontend
- **Retention:** 1 year (fixed)
- **Columns:**
  - `id`, `machine_id`, `timestamp`
  - **Temperatures:** `ambient_temp`, `duct_temp`, `motor_temp`, `delta_t`
  - **Pickup Voltages:** `exhaust_voltage`, `fan_voltage`, `pump_voltage`, `drain_voltage`, `voltage_5`, `voltage_6` (all 6 configurable)
  - **Main Electrical:** `voltage` (line voltage from CT), `current`, `power`
  - **Operational States:** `fan_active`, `pump_active`, `drain_active`, `exhaust_active`, `is_cooling`, `is_on`
  - **Water:** `has_water`, `water_level` (if applicable)
  - **Calculated Status:** `overall_status`, `motor_status`, `water_status`, `cooling_status`
  - **Parameter Compliance:** `motor_temp_within_parameters`, `current_within_parameters`, etc.
  - `status_details` (JSONB for flexible data)
- **Auto-cleanup:** pg_cron job deletes data older than 1 year

#### 3. **`{manufacturer}_notifications`** - Notification Configuration
- **Purpose:** Per-manufacturer notification thresholds and settings
- **Columns:**
  - `id`, `machine_id`
  - **Temperature Thresholds:** `motor_temp_warning`, `motor_temp_critical`, etc.
  - **Current Thresholds:** `motor_amps_warning`, `compressor_amps_warning`, etc.
  - **Voltage Thresholds:** `voltage_min`, `voltage_max`, `pickup_voltage_min`, etc.
  - **Delta T Thresholds:** `delta_t_min_cooling`, `delta_t_max_heating`, etc.
  - **Duration Thresholds:** `duration_motor_temp_critical`, `duration_fan_failure`, etc.
  - **Alert Settings:** `reminder_interval_hours`, `send_recovery_emails`
  - `created_at`, `updated_at`
- **Why separate:** Different manufacturers have different parameters/alert types

#### 4. **`{manufacturer}_voltage_config`** - Voltage Input Mappings
- **Purpose:** Maps which voltage_input (1-6) corresponds to which function
- **Columns:**
  - `id`, `machine_id`
  - `voltage_input_1_function` through `voltage_input_6_function`
  - `voltage_active_threshold` (e.g., 6.0V for 12V logic)
  - `created_at`, `updated_at`
- **Why separate:** Different manufacturers may use different voltage mappings

---

## 🔄 Data Flow

### **Current Flow (To Be Replaced):**
```
ESP32 → readings_raw → [trigger] → cirrus/coolbreeze → machines (status update)
```

### **New Flow:**
```
ESP32 → {manufacturer}_raw → [trigger] → {manufacturer}_calculated → machines (status update)
                                    ↓
                            machine_connection_status (update)
```

### **Processing Trigger Logic:**
1. **Insert into `{manufacturer}_raw`** (based on `machines.manufacturer`)
2. **Trigger fires:** `process_{manufacturer}_reading()`
3. **Read `{manufacturer}_voltage_config`** to map voltage inputs
4. **Calculate states:** Determine fan_active, pump_active, etc. from pickup voltages
5. **Insert into `{manufacturer}_calculated`** with all processed data
6. **Update `machines` table** with latest status (from calculated table)
7. **Update `machine_connection_status`** with last_seen_at

---

## 📋 Example: Cirrus Tables

### **`cirrus_raw`**
```sql
CREATE TABLE cirrus_raw (
  id UUID PRIMARY KEY,
  machine_id UUID REFERENCES machines(id),
  timestamp TIMESTAMPTZ NOT NULL,
  
  -- Raw sensor readings
  motor_temp NUMERIC(5,2),
  inside_temp NUMERIC(5,2),
  outside_temp NUMERIC(5,2),
  current NUMERIC(6,2),
  voltage NUMERIC(6,2),  -- Main line voltage from CT
  
  -- Configurable voltage pickups (up to 6)
  voltage_input_1 NUMERIC(5,2),
  voltage_input_2 NUMERIC(5,2),
  voltage_input_3 NUMERIC(5,2),
  voltage_input_4 NUMERIC(5,2),
  voltage_input_5 NUMERIC(5,2),
  voltage_input_6 NUMERIC(5,2),
  
  -- Raw water status
  has_water BOOLEAN,
  
  -- Metadata
  sensor_read_count INTEGER,
  api_key_used TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **`cirrus_calculated`**
```sql
CREATE TABLE cirrus_calculated (
  id UUID PRIMARY KEY,
  machine_id UUID REFERENCES machines(id),
  timestamp TIMESTAMPTZ NOT NULL,
  
  -- Processed temperatures
  ambient_temp NUMERIC(5,2),
  duct_temp NUMERIC(5,2),
  motor_temp NUMERIC(5,2),
  delta_t NUMERIC(5,2),
  
  -- Main electrical (from CT)
  voltage NUMERIC(6,2),  -- Line voltage
  current NUMERIC(6,2),
  power NUMERIC(7,2),
  
  -- Pickup voltages (mapped from voltage_inputs via voltage_config)
  exhaust_voltage NUMERIC(5,2),  -- From voltage_input_X based on config
  fan_voltage NUMERIC(5,2),
  pump_voltage NUMERIC(5,2),
  drain_voltage NUMERIC(5,2),
  voltage_5 NUMERIC(5,2),  -- Additional configurable pickup
  voltage_6 NUMERIC(5,2),  -- Additional configurable pickup
  
  -- Operational states (calculated from pickup voltages)
  fan_active BOOLEAN,
  pump_active BOOLEAN,
  drain_active BOOLEAN,
  exhaust_active BOOLEAN,
  is_cooling BOOLEAN,
  is_on BOOLEAN,
  
  -- Water status
  has_water BOOLEAN,
  
  -- Calculated status
  overall_status TEXT,
  motor_status TEXT,
  water_status TEXT,
  cooling_status TEXT,
  
  -- Parameter compliance
  motor_temp_within_parameters BOOLEAN,
  current_within_parameters BOOLEAN,
  voltage_within_parameters BOOLEAN,
  
  status_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **`cirrus_notifications`**
```sql
CREATE TABLE cirrus_notifications (
  id UUID PRIMARY KEY,
  machine_id UUID REFERENCES machines(id) UNIQUE,
  
  -- Temperature thresholds
  motor_temp_warning DECIMAL(5,2) DEFAULT 60.0,
  motor_temp_critical DECIMAL(5,2) DEFAULT 70.0,
  
  -- Current thresholds
  motor_amps_warning DECIMAL(6,2) DEFAULT 15.0,
  
  -- Voltage thresholds
  voltage_min DECIMAL(6,2) DEFAULT 200.0,
  voltage_max DECIMAL(6,2) DEFAULT 250.0,
  pickup_voltage_min DECIMAL(5,2) DEFAULT 6.0,  -- For pickup voltages
  
  -- Delta T thresholds
  delta_t_min_cooling DECIMAL(5,2) DEFAULT 2.0,
  
  -- Duration thresholds
  duration_motor_temp_critical INTEGER DEFAULT 15,
  duration_fan_failure INTEGER DEFAULT 10,
  
  -- Alert settings
  reminder_interval_hours INTEGER DEFAULT 24,
  send_recovery_emails BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **`cirrus_voltage_config`**
```sql
CREATE TABLE cirrus_voltage_config (
  id UUID PRIMARY KEY,
  machine_id UUID REFERENCES machines(id) UNIQUE,
  
  -- Map voltage inputs to functions
  voltage_input_1_function TEXT CHECK (voltage_input_1_function IN ('fan', 'pump', 'drain', 'exhaust', 'unused', 'custom_1', 'custom_2')),
  voltage_input_2_function TEXT CHECK (voltage_input_2_function IN ('fan', 'pump', 'drain', 'exhaust', 'unused', 'custom_1', 'custom_2')),
  voltage_input_3_function TEXT CHECK (voltage_input_3_function IN ('fan', 'pump', 'drain', 'exhaust', 'unused', 'custom_1', 'custom_2')),
  voltage_input_4_function TEXT CHECK (voltage_input_4_function IN ('fan', 'pump', 'drain', 'exhaust', 'unused', 'custom_1', 'custom_2')),
  voltage_input_5_function TEXT CHECK (voltage_input_5_function IN ('fan', 'pump', 'drain', 'exhaust', 'unused', 'custom_1', 'custom_2')),
  voltage_input_6_function TEXT CHECK (voltage_input_6_function IN ('fan', 'pump', 'drain', 'exhaust', 'unused', 'custom_1', 'custom_2')),
  
  -- Voltage threshold for "active" state
  voltage_active_threshold NUMERIC(4,2) DEFAULT 6.0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔧 Migration Strategy

### **Phase 1: Create New Tables** (No data loss)
1. Create `cirrus_raw`, `cirrus_calculated`, `cirrus_notifications`, `cirrus_voltage_config`
2. Create `coolbreeze_raw`, `coolbreeze_calculated`, `coolbreeze_notifications`, `coolbreeze_voltage_config`
3. Create `machine_connection_status` (shared)

### **Phase 2: Migrate Existing Data**
1. Copy data from `cirrus` → `cirrus_calculated`
2. Copy data from `coolbreeze` → `coolbreeze_calculated`
3. Migrate `machine_alert_config` → `cirrus_notifications` and `coolbreeze_notifications`
4. Migrate `machine_voltage_config` → `cirrus_voltage_config` and `coolbreeze_voltage_config`

### **Phase 3: Update Triggers & Functions**
1. Create new processing triggers: `cirrus_raw` → `cirrus_calculated`
2. Create new processing triggers: `coolbreeze_raw` → `coolbreeze_calculated`
3. Update `machines` table update logic to read from `{manufacturer}_calculated`

### **Phase 4: Update Frontend**
1. Update frontend to read from `{manufacturer}_calculated` instead of `cirrus`/`coolbreeze`
2. Update historical data queries

### **Phase 5: Cleanup** (After everything works)
1. Drop old `cirrus` table
2. Drop old `coolbreeze` table
3. Drop `readings_raw` table
4. Drop `machine_alert_config` table
5. Drop `machine_voltage_config` table

---

## ✅ Benefits of This Architecture

1. **Expansion-Friendly:** Add new manufacturer = add 4 tables
2. **Self-Contained:** Each manufacturer has all its data/config in one place
3. **Configurable:** Voltage mappings and notifications per manufacturer
4. **Historical Data:** Raw data stored for 2 weeks (configurable)
5. **Clean Separation:** Raw → Calculated → Frontend
6. **Shared Logic:** Connection status shared (generic function)

---

## ❓ Questions

1. **Voltage Input Functions:** Should we support custom names (e.g., `custom_1`, `custom_2`) or just the standard 4 (fan, pump, drain, exhaust)?

2. **Retention Configuration:** For the "eventually configurable from frontend" - should we add a `retention_days` column to `{manufacturer}_raw` now, or add it later?

3. **Notifications:** Should `{manufacturer}_notifications` replace `machine_alert_config` and `alert_states`/`alert_history`, or work alongside them?

4. **Migration Timing:** When should we start? Now or after MVP?

---

**Ready to create the migration scripts once you approve!** 🚀

