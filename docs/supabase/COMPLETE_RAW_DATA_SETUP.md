# ✅ Complete Raw Data Setup Summary

## What We've Done

### **1. Clean readings_raw Table**
- ✅ Created new schema with ONLY raw sensor data
- ✅ Removed all calculated fields
- ✅ Fields: motor_temp, inside_temp, outside_temp, current, voltage, power, has_water, voltage_input_1-4

### **2. Machine Parameters System**
- ✅ Created `machine_voltage_config` table (maps voltage inputs to functions)
- ✅ Uses existing `machine_alert_config` table (thresholds)
- ✅ Created `docs/machine_parameters/` folder structure
- ✅ Default parameters for Cirrus machines

### **3. Updated ESP32 Code**
- ✅ Removed all calculations
- ✅ Sends only raw sensor readings
- ✅ Maps voltage inputs correctly

### **4. Updated Edge Function**
- ✅ Removed all calculations
- ✅ Inserts only raw data
- ✅ Tracks API key used

### **5. Updated Processor**
- ✅ All calculations done in Supabase
- ✅ Uses machine_voltage_config for voltage mapping
- ✅ Uses machine_alert_config for thresholds
- ✅ Calculates: delta_t, fan_active, pump_active, etc.
- ✅ Calculates connection status (10 minute timeout)

### **6. Connection Status**
- ✅ Added `is_connected` to CIRRUS table
- ✅ Calculates based on last reading time (10 minutes)
- ✅ View: `machine_connection_status`

---

## Migration Order

### **Step 1: Backup (IMPORTANT!)**
```sql
-- Backup existing data
CREATE TABLE readings_raw_backup AS SELECT * FROM readings_raw;
```

### **Step 2: Run Migrations (in order)**
1. `20250108000006_create_clean_readings_raw.sql`
2. `20250108000007_create_machine_voltage_config.sql`
3. `20250108000008_add_connection_status_calculation.sql`
4. Update processor: `20250108000001_create_cirrus_processor.sql` (already updated)

### **Step 3: Update Code**
1. Deploy updated edge function
2. Upload updated ESP32 code

### **Step 4: Configure Machines**
1. Set voltage input mappings in `machine_voltage_config` table
2. Verify alert thresholds in `machine_alert_config` table

---

## Key Features

### **Raw Data Only**
- ESP32 sends: temperatures, current, voltage inputs, has_water
- No calculations in ESP32
- No calculations in edge function

### **All Calculations in Supabase**
- Delta T: `ABS(outside_temp - inside_temp)`
- Voltage mapping: Uses `machine_voltage_config`
- Power: `voltage × current` (if voltage provided)
- Status: Uses `machine_alert_config` thresholds
- Connection: Last reading within 10 minutes

### **Per-Machine Configuration**
- Voltage input mapping (which input = which function)
- Alert thresholds (temperature, current, etc.)
- Voltage active threshold (default 6.0V)

---

## Files Created/Updated

### **Migrations:**
- `20250108000006_create_clean_readings_raw.sql`
- `20250108000007_create_machine_voltage_config.sql`
- `20250108000008_add_connection_status_calculation.sql`
- Updated: `20250108000001_create_cirrus_processor.sql`

### **Code:**
- Updated: `supabase/functions/esp32-data-receiver/index.ts`
- Updated: `hardware/esp32/ESP32_Cirrus_Optimized_2Min/ESP32_Cirrus_Optimized_2Min.ino`

### **Documentation:**
- `docs/machine_parameters/README.md`
- `docs/machine_parameters/cirrus/default_parameters.json`
- `docs/machine_parameters/cirrus/README.md`
- `docs/RAW_DATA_MIGRATION_GUIDE.md`
- `docs/COMPLETE_RAW_DATA_SETUP.md` (this file)

---

## Next Steps

1. ✅ Review all migrations
2. ✅ Backup existing data
3. ✅ Run migrations in order
4. ✅ Deploy updated edge function
5. ✅ Upload updated ESP32 code
6. ✅ Configure voltage mappings per machine
7. ✅ Test end-to-end data flow
8. ✅ Verify calculations are correct

---

## Testing

### **Verify Raw Data:**
```sql
SELECT * FROM readings_raw ORDER BY created_at DESC LIMIT 10;
-- Should see only raw sensor readings, no calculated fields
```

### **Verify Processed Data:**
```sql
SELECT * FROM cirrus ORDER BY timestamp DESC LIMIT 10;
-- Should see processed data with all calculations
```

### **Verify Connection Status:**
```sql
SELECT * FROM machine_connection_status;
-- Should show connection status for all machines
```

---

## Questions?

See:
- `docs/RAW_DATA_MIGRATION_GUIDE.md` - Detailed migration steps
- `docs/machine_parameters/cirrus/README.md` - Cirrus parameters
- `docs/CIRRUS_SETUP_GUIDE.md` - Original setup guide


