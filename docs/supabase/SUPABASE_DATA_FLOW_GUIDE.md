# 🔄 Supabase Data Flow & Trigger Chain Guide

**Last Updated:** December 1, 2025  
**Status:** Active Reference

---

## 📋 Overview

This document describes the complete data flow from ESP32 devices through Supabase to the frontend, including all database triggers and processing functions.

---

## 🔄 Data Flow Diagram

```
ESP32 Device
    │
    │ POST /api/readings (Edge Function)
    ▼
readings_raw table
    │
    │ TRIGGER: trigger_process_{manufacturer}_reading
    ▼
{manufacturer}_calculated table (cirrus, coolbreeze, alliance)
    │
    │ TRIGGER: trigger_update_machine_on_{manufacturer}_insert (optional)
    ▼
machines table (updated with latest values)
    │
    │ Frontend queries
    ▼
React Components (Dashboard, MachineCard, etc.)
```

---

## 📥 Step 1: Data Ingestion

### **ESP32 → Edge Function**

ESP32 devices POST sensor data to the edge function:

**Endpoint:** `POST /api/readings`

**Request Body:**
```json
{
  "api_key": "your-api-key",
  "machine_id": "uuid",
  "voltage_input_1": 3.3,
  "voltage_input_2": 0.0,
  "voltage_input_3": 2.5,
  "voltage_input_4": 0.0,
  "voltage_input_5": 3.3,
  "voltage_input_6": 0.0,
  "ct_current": 2.5,
  "temp_inside": 25.5,
  "temp_outside": 30.2,
  "temp_machine": 28.0
}
```

**Edge Function Actions:**
1. Validates API key
2. Verifies machine ownership
3. Inserts into `readings_raw` table
4. Returns success/error response

---

## 🔀 Step 2: Raw Data Processing

### **Trigger: `trigger_process_{manufacturer}_reading`**

**Triggered On:** `INSERT` into `readings_raw` table

**Function:** `process_{manufacturer}_reading()`

**Manufacturers:**
- `process_cirrus_reading()` - For Cirrus evaporative coolers
- `process_coolbreeze_reading()` - For CoolBreeze evaporative coolers
- `process_alliance_reading()` - For Alliance heatpumps

### **Processing Logic**

Each processing function:

1. **Reads Machine Configuration:**
   - Machine type (evaporative, heatpump, airconditioner)
   - Manufacturer-specific voltage mappings
   - Alert thresholds
   - Temperature setpoints

2. **Maps Voltage Inputs:**
   - Uses `{manufacturer}_voltage_config` table
   - Maps `voltage_input_1-6` to `Custom_1-6` functions
   - Determines sensor readings (motor temp, ambient temp, duct temp, etc.)

3. **Calculates Derived Values:**
   - `fan_active` - Based on voltage thresholds
   - `is_cooling` - Based on current and temperature
   - `is_heating` - For heatpumps (current > 1A)
   - `pump_active` - For heatpumps (GPIO5 relay)
   - `has_water` - For evaporative coolers (GPIO5 float switch)
   - `delta_t` - Temperature difference
   - `power` - Voltage × Current
   - `compressor_status` - For heatpumps (good/warning/failed)

4. **Determines Connection Status:**
   - `is_connected` = true if reading is recent (< 5 minutes old)

5. **Inserts into Processing Table:**
   - `cirrus` table (for Cirrus machines)
   - `coolbreeze` table (for CoolBreeze machines)
   - `alliance` table (for Alliance machines)

### **Example: Cirrus Processing**

```sql
CREATE TRIGGER trigger_process_cirrus_reading
  AFTER INSERT ON public.readings_raw
  FOR EACH ROW
  WHEN (NEW.machine_id IN (
    SELECT id FROM machines 
    WHERE manufacturer = 'Cirrus' OR (manufacturer IS NULL AND type = 'evaporative')
  ))
  EXECUTE FUNCTION public.process_cirrus_reading();
```

**Function Flow:**
1. Get machine type and manufacturer
2. Load voltage config (maps inputs to sensors)
3. Calculate: fan_active, is_cooling, has_water, motor_temp, etc.
4. Insert into `cirrus` table with calculated values

---

## 🔄 Step 3: Machine Table Updates

### **Trigger: `trigger_update_machine_on_{manufacturer}_insert`** (Optional)

**Triggered On:** `INSERT` into `{manufacturer}_calculated` table

**Function:** `trigger_update_machine_on_{manufacturer}_insert()`

**Purpose:** Keep `machines` table synchronized with latest readings

**Updates:**
- `machines.is_connected` - Based on latest timestamp
- `machines.fan_active` - Latest fan status
- `machines.is_cooling` - Latest cooling status
- `machines.motor_temp` - Latest motor temperature
- `machines.outside_temp` - Latest ambient temperature
- `machines.inside_temp` - Latest duct temperature
- `machines.current` - Latest current reading
- `machines.voltage` - Latest voltage reading
- `machines.power` - Calculated power
- `machines.updated_at` - Timestamp of update

**Note:** Frontend calculates connection status independently, so this trigger is optional but recommended for consistency.

---

## 📊 Step 4: Frontend Data Fetching

### **Connection Status Calculation**

Frontend calculates connection status in `src/hooks/useMachineData.tsx`:

1. **Fetches Latest Timestamps:**
   ```typescript
   // Check all processing tables
   const latestReadingsRaw = await supabase
     .from('readings_raw')
     .select('machine_id, created_at')
     .in('machine_id', machineIds)
     .order('created_at', { ascending: false });
   
   const latestCirrus = await supabase
     .from('cirrus')
     .select('machine_id, timestamp')
     .in('machine_id', machineIds)
     .order('timestamp', { ascending: false });
   
   // ... similar for coolbreeze, alliance
   ```

2. **Finds Most Recent Reading:**
   ```typescript
   // Take most recent timestamp from any table
   const readingsByMachine = new Map<string, Date>();
   // Merge all timestamps, keeping most recent per machine
   ```

3. **Calculates Connection Status:**
   ```typescript
   const calculateConnectionStatus = (machineId: string, latestTimestamps: Map<string, Date>): boolean => {
     const latestTimestamp = latestTimestamps.get(machineId);
     if (!latestTimestamp) return false;
     
     const minutesSinceLastReading = (now.getTime() - latestTimestamp.getTime()) / (1000 * 60);
     return minutesSinceLastReading <= 5; // 5-minute threshold
   };
   ```

### **Historical Data Fetching**

Frontend uses `get_historical_data()` function:

```sql
SELECT * FROM get_historical_data(
  p_machine_id := 'uuid',
  p_period := '24h',
  p_table_name := 'cirrus'
);
```

**Function Aggregates:**
- `24h`: All readings (no aggregation)
- `7d`: 10-minute averages
- `30d`: 1-hour averages
- `1y`: 1-day averages

---

## 🔗 Complete Trigger Chain

### **Chain 1: Cirrus Data Flow**

```
readings_raw (INSERT)
    │
    ├─→ trigger_process_cirrus_reading
    │       │
    │       └─→ process_cirrus_reading()
    │               │
    │               └─→ cirrus (INSERT calculated values)
    │                       │
    │                       └─→ trigger_update_machine_on_cirrus_insert (optional)
    │                               │
    │                               └─→ machines (UPDATE latest values)
```

### **Chain 2: CoolBreeze Data Flow**

```
readings_raw (INSERT)
    │
    ├─→ trigger_process_coolbreeze_reading
    │       │
    │       └─→ process_coolbreeze_reading()
    │               │
    │               └─→ coolbreeze (INSERT calculated values)
    │                       │
    │                       └─→ trigger_update_machine_on_coolbreeze_insert (optional)
    │                               │
    │                               └─→ machines (UPDATE latest values)
```

### **Chain 3: Alliance Data Flow**

```
readings_raw (INSERT)
    │
    ├─→ trigger_process_alliance_reading
    │       │
    │       └─→ process_alliance_reading()
    │               │
    │               └─→ alliance (INSERT calculated values)
    │                       │
    │                       └─→ trigger_update_machine_on_alliance_insert (optional)
    │                               │
    │                               └─→ machines (UPDATE latest values)
```

---

## 🔧 Trigger Functions Reference

### **Processing Functions**

#### **`process_cirrus_reading()`**
- **Input:** `NEW` row from `readings_raw`
- **Output:** Calculated row in `cirrus` table
- **Logic:**
  - Maps voltage inputs to sensors (motor temp, ambient temp, duct temp)
  - Calculates fan_active, is_cooling, has_water
  - Determines connection status
  - Calculates power, delta_t

#### **`process_coolbreeze_reading()`**
- **Input:** `NEW` row from `readings_raw`
- **Output:** Calculated row in `coolbreeze` table
- **Logic:** Similar to Cirrus, with CoolBreeze-specific mappings

#### **`process_alliance_reading()`**
- **Input:** `NEW` row from `readings_raw`
- **Output:** Calculated row in `alliance` table
- **Logic:**
  - Heatpump-specific logic
  - GPIO5 = pump relay (like float switch)
  - Current > 1A = heating active
  - Compressor status with 5-minute delay
  - Complex health check logic

### **Machine Update Functions**

#### **`trigger_update_machine_on_cirrus_insert()`**
- **Input:** `NEW` row from `cirrus` table
- **Output:** `UPDATE` to `machines` table
- **Updates:** All machine status fields

#### **`trigger_update_machine_on_coolbreeze_insert()`**
- **Input:** `NEW` row from `coolbreeze` table
- **Output:** `UPDATE` to `machines` table
- **Updates:** All machine status fields

#### **`trigger_update_machine_on_alliance_insert()`**
- **Input:** `NEW` row from `alliance` table
- **Output:** `UPDATE` to `machines` table
- **Updates:** All machine status fields including compressor_status

---

## 📝 Trigger Definitions

### **Processing Triggers**

```sql
-- Cirrus
CREATE TRIGGER trigger_process_cirrus_reading
  AFTER INSERT ON public.readings_raw
  FOR EACH ROW
  WHEN (NEW.machine_id IN (
    SELECT id FROM machines 
    WHERE manufacturer = 'Cirrus' OR (manufacturer IS NULL AND type = 'evaporative')
  ))
  EXECUTE FUNCTION public.process_cirrus_reading();

-- CoolBreeze
CREATE TRIGGER trigger_process_coolbreeze_reading
  AFTER INSERT ON public.readings_raw
  FOR EACH ROW
  WHEN (NEW.machine_id IN (
    SELECT id FROM machines 
    WHERE manufacturer = 'CoolBreeze'
  ))
  EXECUTE FUNCTION public.process_coolbreeze_reading();

-- Alliance
CREATE TRIGGER trigger_process_alliance_reading
  AFTER INSERT ON public.readings_raw
  FOR EACH ROW
  WHEN (NEW.machine_id IN (
    SELECT id FROM machines 
    WHERE manufacturer = 'Alliance' AND type = 'heatpump'
  ))
  EXECUTE FUNCTION public.process_alliance_reading();
```

### **Machine Update Triggers** (Optional)

```sql
-- Cirrus
CREATE TRIGGER trigger_update_machine_on_cirrus_insert
  AFTER INSERT ON public.cirrus
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_machine_on_cirrus_insert();

-- CoolBreeze
CREATE TRIGGER trigger_update_machine_on_coolbreeze_insert
  AFTER INSERT ON public.coolbreeze
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_machine_on_coolbreeze_insert();

-- Alliance
CREATE TRIGGER trigger_update_machine_on_alliance_insert
  AFTER INSERT ON public.alliance
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_machine_on_alliance_insert();
```

---

## 🔍 Troubleshooting

### **Issue: Data Not Appearing in Processing Tables**

**Check:**
1. Is trigger enabled?
   ```sql
   SELECT tgname, tgenabled FROM pg_trigger 
   WHERE tgname LIKE '%process_%';
   ```

2. Is function defined?
   ```sql
   SELECT proname FROM pg_proc 
   WHERE proname LIKE 'process_%_reading';
   ```

3. Check trigger conditions:
   ```sql
   -- Verify machine manufacturer matches trigger condition
   SELECT id, name, type, manufacturer 
   FROM machines 
   WHERE id = 'YOUR_MACHINE_ID';
   ```

### **Issue: Machines Table Not Updating**

**Check:**
1. Are machine update triggers enabled?
   ```sql
   SELECT tgname, tgenabled FROM pg_trigger 
   WHERE tgname LIKE '%update_machine%';
   ```

2. Check function permissions:
   ```sql
   SELECT proname, prosecdef 
   FROM pg_proc 
   WHERE proname LIKE 'trigger_update_machine%';
   -- Should be SECURITY DEFINER
   ```

---

## 📚 Related Documentation

- **[CONNECTION_STATUS_TROUBLESHOOTING.md](./CONNECTION_STATUS_TROUBLESHOOTING.md)** - Connection status issues
- **[SCHEMA.md](./SCHEMA.md)** - Complete database schema
- **[MAINTENANCE.md](./MAINTENANCE.md)** - Database maintenance

---

## 🎯 Key Points

1. **Data flows:** `readings_raw` → `{manufacturer}_calculated` → `machines` (optional)
2. **Triggers are manufacturer-specific:** Each manufacturer has its own processing function
3. **Connection status:** Calculated independently by frontend (5-minute threshold)
4. **Historical data:** Aggregated by `get_historical_data()` function
5. **Real-time updates:** Frontend uses Supabase real-time subscriptions

---

**Last Updated:** December 1, 2025  
**Maintained By:** Development Team
