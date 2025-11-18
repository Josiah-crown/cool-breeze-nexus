# Troubleshooting Connection Status

**Last Updated:** November 17, 2025

## Issue: Connected LED Not Showing Green

If the Connected LED is not showing green even though data is being received:

### Step 1: Check if Migration 20/21 Has Been Run
The auto-update trigger requires Migration 20 or 21 to be run.

### Step 2: Verify Data is Being Processed
Run this SQL to check if data is in the processing tables:
```sql
-- Check Cirrus table
SELECT machine_id, timestamp, is_connected, current, voltage
FROM public.cirrus
WHERE machine_id = 'YOUR_MACHINE_ID'
ORDER BY timestamp DESC
LIMIT 5;

-- Check CoolBreeze table
SELECT machine_id, timestamp, is_connected, current, voltage
FROM public.coolbreeze
WHERE machine_id = 'YOUR_MACHINE_ID'
ORDER BY timestamp DESC
LIMIT 5;
```

### Step 3: Check Machines Table Status
```sql
SELECT id, name, is_connected, current, voltage, updated_at
FROM public.machines
WHERE id = 'YOUR_MACHINE_ID';
```

### Step 4: Manually Trigger Update
```sql
-- Manually update the machine
SELECT public.update_machine_from_latest_reading('YOUR_MACHINE_ID');

-- Check if it worked
SELECT id, name, is_connected, updated_at
FROM public.machines
WHERE id = 'YOUR_MACHINE_ID';
```

### Step 5: Check Trigger is Active
```sql
-- Check if triggers exist
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table IN ('cirrus', 'coolbreeze')
AND trigger_name LIKE '%update_machine%';
```

### Step 6: Check Last Reading Time
```sql
-- Check when last reading was received
SELECT 
  m.id,
  m.name,
  m.is_connected,
  GREATEST(
    COALESCE(MAX(c.timestamp), '1970-01-01'::timestamptz),
    COALESCE(MAX(cb.timestamp), '1970-01-01'::timestamptz)
  ) as last_reading,
  EXTRACT(EPOCH FROM (NOW() - GREATEST(
    COALESCE(MAX(c.timestamp), '1970-01-01'::timestamptz),
    COALESCE(MAX(cb.timestamp), '1970-01-01'::timestamptz)
  )))/60 as minutes_ago
FROM public.machines m
LEFT JOIN public.cirrus c ON c.machine_id = m.id
LEFT JOIN public.coolbreeze cb ON cb.machine_id = m.id
WHERE m.id = 'YOUR_MACHINE_ID'
GROUP BY m.id, m.name, m.is_connected;
```

---

## Issue: Current Showing 22.41A When No CT Connected

If you're seeing a current reading (like 22.41A) but have no CT sensor connected:

### Possible Causes:
1. **Old Data in Database**: Previous readings before CT was removed
2. **ESP32 Reading Noise**: ADC picking up electrical noise
3. **Wrong Pin Configuration**: ESP32 reading from wrong pin
4. **Database Calculation**: Power calculation using old current value

### Solution 1: Check Current Value in Database
```sql
-- Check latest readings
SELECT timestamp, current, voltage, power
FROM public.cirrus
WHERE machine_id = 'YOUR_MACHINE_ID'
ORDER BY timestamp DESC
LIMIT 10;

-- Check machines table
SELECT current, voltage, power, updated_at
FROM public.machines
WHERE id = 'YOUR_MACHINE_ID';
```

### Solution 2: Clear Old Current Data
If the current value is from old data, you can manually set it to 0:
```sql
-- Set current to 0 in machines table
UPDATE public.machines
SET current = 0, power = 0
WHERE id = 'YOUR_MACHINE_ID';

-- Note: This will be overwritten when new data arrives
-- The ESP32 code fix (0.1A threshold) should prevent future false readings
```

### Solution 3: Verify ESP32 Code
Make sure you've uploaded the updated ESP32 code with the 0.1A threshold filter:
- `ESP32_Cirrus_Optimized_2Min.ino` - line 682
- `ESP32_HVAC_CoolBreezeNexus_V2_Optimized.ino` - line 929

### Solution 4: Check CT Pin Configuration
Verify the CT pin is not accidentally connected to a voltage source or reading from the wrong GPIO.

---

## Quick Fix: Force Update All Machines

If connection status is not updating, run this to force update all machines:
```sql
SELECT public.update_machines_from_latest_readings();
```

Then check the machines table:
```sql
SELECT id, name, is_connected, current, updated_at
FROM public.machines
ORDER BY updated_at DESC;
```

