# ✅ Migration Checklist

## Pre-Migration

- [ ] **BACKUP EXISTING DATA**
  ```sql
  CREATE TABLE readings_raw_backup AS SELECT * FROM readings_raw;
  ```

- [ ] Review all migration files
- [ ] Understand the changes
- [ ] Plan downtime if needed

---

## Migration Steps (Run in Order)

### **Step 1: Create Clean readings_raw Table**
- [ ] Run: `20250108000006_create_clean_readings_raw.sql`
- [ ] Verify: Table created with correct schema
- [ ] Verify: Old data backed up

### **Step 2: Create Voltage Configuration**
- [ ] Run: `20250108000007_create_machine_voltage_config.sql`
- [ ] Verify: Table created
- [ ] Verify: Default configs created for existing machines

### **Step 3: Add Connection Status**
- [ ] Run: `20250108000008_add_connection_status_calculation.sql`
- [ ] Verify: Functions created
- [ ] Verify: View created

### **Step 4: Update Processor**
- [ ] Run: `20250108000001_create_cirrus_processor.sql` (updated version)
- [ ] Verify: Function updated
- [ ] Verify: Uses machine_voltage_config
- [ ] Verify: Uses machine_alert_config

### **Step 5: Update CIRRUS Table**
- [ ] Run: `20250108000000_create_cirrus_table.sql` (updated with is_connected)
- [ ] Verify: Column added

---

## Code Updates

### **Step 6: Update Edge Function**
- [ ] Deploy: `supabase/functions/esp32-data-receiver/index.ts`
- [ ] Verify: No calculations in code
- [ ] Verify: Only inserts raw data
- [ ] Test: Send test data

### **Step 7: Update ESP32 Code**
- [ ] Upload: `hardware/esp32/ESP32_Cirrus_Optimized_2Min/ESP32_Cirrus_Optimized_2Min.ino`
- [ ] Verify: No calculations in code
- [ ] Verify: Only sends raw data
- [ ] Test: Send test data

---

## Configuration

### **Step 8: Configure Voltage Mappings**
- [ ] For each machine, set voltage input mappings:
  ```sql
  UPDATE machine_voltage_config
  SET voltage_input_1_function = 'fan',
      voltage_input_2_function = 'pump',
      voltage_input_3_function = 'drain',
      voltage_input_4_function = 'exhaust'
  WHERE machine_id = 'your-machine-id';
  ```

### **Step 9: Verify Alert Thresholds**
- [ ] Check: `machine_alert_config` has entries for all machines
- [ ] Update: Thresholds if needed
- [ ] Verify: Defaults are correct

---

## Testing

### **Step 10: Test Data Flow**
- [ ] ESP32 sends data
- [ ] Data appears in `readings_raw` (raw only)
- [ ] Data processes into `cirrus` (calculated)
- [ ] Raw data deleted after processing
- [ ] Calculations are correct

### **Step 11: Verify Calculations**
- [ ] Delta T calculated correctly
- [ ] Voltage inputs mapped correctly
- [ ] Fan/pump/drain/exhaust active states correct
- [ ] Power calculated correctly
- [ ] Status calculations use thresholds
- [ ] Connection status calculated correctly

### **Step 12: Verify Connection Status**
- [ ] Check: `machine_connection_status` view
- [ ] Verify: Shows connected/disconnected correctly
- [ ] Test: Wait 10+ minutes, verify shows disconnected

---

## Post-Migration

- [ ] Monitor for 24 hours
- [ ] Check for errors in logs
- [ ] Verify data quality
- [ ] Update documentation if needed
- [ ] Remove backup table (after confirming everything works)

---

## Rollback Plan

If something goes wrong:

1. **Restore readings_raw:**
   ```sql
   DROP TABLE readings_raw;
   ALTER TABLE readings_raw_backup RENAME TO readings_raw;
   ```

2. **Revert edge function** to previous version
3. **Revert ESP32 code** to previous version
4. **Review logs** to identify issue

---

## Success Criteria

✅ Raw data in `readings_raw` (no calculations)  
✅ Processed data in `cirrus` (all calculations)  
✅ Raw data deleted after processing  
✅ Connection status working  
✅ All calculations correct  
✅ No errors in logs  
✅ ESP32 sending data successfully  

---

## Notes

- Keep backup for at least 1 week
- Monitor closely for first 48 hours
- Document any issues encountered
- Update this checklist if needed


