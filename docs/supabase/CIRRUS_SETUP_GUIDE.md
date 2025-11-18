# 🏭 CIRRUS Evaporative Cooler Setup Guide

## 📋 Overview

This guide will help you set up a dedicated `CIRRUS` table in Supabase to handle evaporative cooler data processing, status calculation, and historical storage. We'll also optimize the system to update every 2 minutes instead of 30 seconds to reduce bandwidth and costs.

---

## 🎯 Goals

1. ✅ Create `CIRRUS` table for processed evaporative cooler data
2. ✅ Set up automatic data processing from `readings_raw` to `CIRRUS`
3. ✅ Support multiple Cirrus machines with proper identification
4. ✅ Optimize ESP32 updates to 2-minute intervals (from 30 seconds)
5. ✅ Minimize edge function calls and bandwidth usage

---

## 📊 Architecture

```
ESP32 Device (every 2 min)
    ↓
Edge Function (esp32-data-receiver)
    ↓
readings_raw table (raw sensor data)
    ↓
Database Trigger (auto-processes)
    ↓
CIRRUS table (processed status + historical data)
    ↓
Website Dashboard (reads from CIRRUS)
```

---

## 📝 Step-by-Step Implementation

### **STEP 1: Create CIRRUS Table Migration**

**File:** `supabase/migrations/[timestamp]_create_cirrus_table.sql`

This table will store:
- Processed status calculations
- Historical data for each Cirrus machine
- Machine identification via `machine_id`
- Timestamped records for trend analysis

**What we'll store:**
- Machine identification
- Calculated status (operational, warning, error)
- Temperature metrics (ambient, duct, motor)
- Operational states (fan, pump, cooling)
- Water level status
- Power consumption
- Delta T calculations
- Timestamps for historical tracking

---

### **STEP 2: Create Database Trigger Function**

**File:** `supabase/migrations/[timestamp]_create_cirrus_processor.sql`

This function will:
- Automatically process new `readings_raw` entries
- Calculate Cirrus-specific status logic
- Insert processed data into `CIRRUS` table
- Only process data for machines with type='evaporative' or manufacturer='Cirrus'

**Status Calculation Logic:**
- **Operational:** All systems normal, temperatures within range
- **Warning:** Minor issues (low water, high temp, etc.)
- **Error:** Critical issues (no water, motor failure, etc.)

---

### **STEP 3: Optimize Edge Function**

**File:** `supabase/functions/esp32-data-receiver/index.ts`

Changes:
- Add rate limiting check (prevent duplicate inserts within 2 minutes)
- Optimize response size
- Add batch processing capability (optional, for future)

---

### **STEP 4: Update ESP32 Code**

**File:** `hardware/esp32/cirrus_optimized.ino`

Changes:
- Update send interval from 30 seconds to 2 minutes (120,000ms)
- Add local buffering (store readings if WiFi fails)
- Optimize JSON payload size
- Add connection retry logic

---

### **STEP 5: Update Frontend to Use CIRRUS Table**

**Files to Update:**
- `src/lib/historicalData.ts` - Add CIRRUS table queries
- `src/hooks/useMachineData.tsx` - Fetch from CIRRUS for Cirrus machines
- `src/components/MachineDetailView.tsx` - Display Cirrus-specific data

---

## 🔧 Implementation Order

1. **Create migration files** (Steps 1-2)
2. **Run migrations in Supabase Dashboard**
3. **Update edge function** (Step 3)
4. **Deploy edge function**
5. **Update ESP32 code** (Step 4)
6. **Update frontend** (Step 5)
7. **Test end-to-end**

---

## 📈 Expected Results

### **Before Optimization:**
- ESP32 sends data: Every 30 seconds
- Edge function calls: ~2,880/day per machine
- Bandwidth: ~2.5 MB/day per machine
- Database writes: ~2,880/day per machine

### **After Optimization:**
- ESP32 sends data: Every 2 minutes
- Edge function calls: ~720/day per machine (75% reduction)
- Bandwidth: ~625 KB/day per machine (75% reduction)
- Database writes: ~720/day per machine (75% reduction)

**Cost Savings:** ~75% reduction in edge function invocations and bandwidth!

---

## ⚠️ Important Notes

1. **Machine Type Detection:** The trigger will only process machines where `machines.type = 'evaporative'` or where manufacturer is 'Cirrus'
2. **Raw Data Deletion:** Raw data in `readings_raw` is automatically deleted immediately after successful processing into `CIRRUS` table
3. **Data Retention:** Only 1 year of processed data is kept in `CIRRUS` table (older data is automatically deleted)
4. **Cleanup:** Run `auto_cleanup_cirrus_data()` function daily (or set up automated schedule via edge function)
5. **Backward Compatibility:** Existing code will continue to work, we're adding a new optimized path
6. **Testing:** Test with one machine first before deploying to all

---

## 🚀 Implementation Steps

### **STEP 1: Run Database Migrations**

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Navigate to **SQL Editor**

2. **✅ Migration 1: Create CIRRUS Table** (ALREADY COMPLETED)
   - ✅ Table `cirrus` has been created
   - ⚠️ **IMPORTANT:** You must manually delete the `water_level` column before proceeding:
     ```sql
     ALTER TABLE public.cirrus DROP COLUMN IF EXISTS water_level;
     ```
   - Verify deletion:
     ```sql
     SELECT column_name FROM information_schema.columns 
     WHERE table_name = 'cirrus' AND column_name = 'water_level';
     -- Should return 0 rows
     ```

3. **Run Migration 2: Create Processor Function** ⚠️ CRITICAL
   - Copy contents of `supabase/migrations/20250108000001_create_cirrus_processor.sql`
   - Paste into SQL Editor
   - Click **Run**
   - Verify: Check **Database** → **Functions** → You should see `calculate_cirrus_status` and `process_cirrus_reading`

4. **Run Migration 3: Rate Limiting**
   - Copy contents of `supabase/migrations/20250108000002_optimize_edge_function_rate_limit.sql`
   - Paste into SQL Editor
   - Click **Run**
   - Verify: Check **Table Editor** → You should see `edge_function_rate_limit` table

5. **Run Migration 4: Add Manufacturer Column** (Recommended)
   - Copy contents of `supabase/migrations/20250108000003_add_manufacturer_column.sql`
   - Paste into SQL Editor
   - Click **Run**
   - **Note:** Needed for subcategory selection on website
   - Set `manufacturer='Cirrus'` for your Cirrus machines

6. **Run Migration 5: Clean readings_raw Table** ⚠️ CHECK FIRST
   - **IMPORTANT:** Check if `readings_raw` table exists and its structure first:
     ```sql
     SELECT column_name, data_type 
     FROM information_schema.columns 
     WHERE table_name = 'readings_raw'
     ORDER BY ordinal_position;
     ```
   - Copy contents of `supabase/migrations/20250108000006_create_clean_readings_raw.sql`
   - Paste into SQL Editor
   - Click **Run**
   - **Note:** Uses `CREATE TABLE IF NOT EXISTS`, so won't overwrite existing table
   - If table exists with wrong structure, you may need to manually alter columns

7. **Run Migration 6: Machine Voltage Config**
   - Copy contents of `supabase/migrations/20250108000007_create_machine_voltage_config.sql`
   - Paste into SQL Editor
   - Click **Run**
   - Creates `machine_voltage_config` table for configuring voltage input mappings

8. **Run Migration 7: Connection Status Calculation**
   - Copy contents of `supabase/migrations/20250108000008_add_connection_status_calculation.sql`
   - Paste into SQL Editor
   - Click **Run**
   - Creates function to calculate connection status (last reading within 10 min)

9. **Run Migration 8: Temperature Validation**
   - Copy contents of `supabase/migrations/20250108000009_add_temperature_validation.sql`
   - Paste into SQL Editor
   - Click **Run**
   - Creates function to validate temperature readings

10. **Run Migration 9: Sensor Read Count** ⚠️ CHECK FIRST
    - **IMPORTANT:** Check if column already exists:
      ```sql
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'readings_raw' 
      AND column_name = 'sensor_read_count';
      ```
    - Copy contents of `supabase/migrations/20250108000010_add_sensor_read_count.sql`
    - Paste into SQL Editor
    - Click **Run**
    - Adds `sensor_read_count` column to `readings_raw` (if not exists)

11. **Run Migration 10: Data Cleanup Functions**
    - Copy contents of `supabase/migrations/20250108000004_add_cirrus_cleanup.sql`
    - Paste into SQL Editor
    - Click **Run**
    - This creates cleanup functions to delete data older than 1 year

12. **Run Migration 11: Setup Automated Cleanup**
    - Copy contents of `supabase/migrations/20250108000005_setup_cirrus_cleanup_schedule.sql`
    - Paste into SQL Editor
    - Click **Run**
    - This sets up the automated cleanup system

---

### **STEP 2: Update Edge Functions**

1. **Deploy Updated Data Receiver Function**
   - ✅ **Good News:** The `index.ts` file is already updated and ready!
   - 📁 **File Location:** `supabase/functions/esp32-data-receiver/index.ts`
   - 📤 **What to do:** Just deploy it (no editing needed)
   
   **Option A: Using Supabase CLI** (Recommended):
   ```bash
   # Install CLI if needed
   npm install -g supabase
   
   # Login
   supabase login
   
   # Link to project (if not already)
   supabase link --project-ref YOUR_PROJECT_REF
   
   # Deploy
   supabase functions deploy esp32-data-receiver
   ```
   
   **Option B: Using Supabase Dashboard** (Easier):
   - Go to Supabase Dashboard → **Edge Functions**
   - Click on `esp32-data-receiver` (or create if doesn't exist)
   - Copy contents of `supabase/functions/esp32-data-receiver/index.ts`
   - Paste into the editor
   - Click **Deploy**
   
   **📖 See `EDGE_FUNCTION_DEPLOYMENT.md` for detailed instructions**

2. **Deploy Cleanup Function (Optional - for automated cleanup)**
   - File: `supabase/functions/cirrus-cleanup/index.ts`
   - Deploy using Supabase CLI:
     ```bash
     supabase functions deploy cirrus-cleanup
     ```
   - **Note:** This is optional. You can also call `auto_cleanup_cirrus_data()` directly from SQL Editor

3. **Verify Rate Limiting**
   - The function now checks `check_rate_limit` RPC function
   - Returns 429 status if called too frequently
   - Allows calls every 2 minutes minimum
   - **Note:** Make sure Migration 3 (rate limiting) is run first!

---

### **STEP 3: Update ESP32 Code**

1. **Upload Optimized Code**
   - Open `hardware/esp32/ESP32_Cirrus_Optimized_2Min/ESP32_Cirrus_Optimized_2Min.ino`
   - Upload to your ESP32 device
   - **Key Change:** `DATA_SEND_INTERVAL = 120000` (2 minutes instead of 30 seconds)

2. **Configure WiFiManager**
   - On first boot, ESP32 creates WiFi AP: "Cirrus-Setup"
   - Connect to it (password: "cirrus123")
   - Configure:
     - Supabase URL
     - Edge Function Name: `esp32-data-receiver`
     - Machine UUID (from your dashboard)
     - API Key (from your dashboard)

3. **Verify Operation**
   - Monitor Serial Monitor (115200 baud)
   - Should see "Data sent successfully!" every 2 minutes
   - Check Supabase Dashboard → `readings_raw` table for new entries
   - Check `cirrus` table for processed data

---

### **STEP 4: Verify Data Flow**

1. **Check readings_raw Table**
   - Should see new entries every 2 minutes
   - **IMPORTANT:** Raw data is automatically deleted after processing
   - You may see entries briefly, then they disappear (this is correct!)

2. **Check CIRRUS Table**
   - Should automatically populate when `readings_raw` gets new data
   - Contains processed status and calculated fields
   - Only for machines with `type='evaporative'` or `manufacturer='Cirrus'`
   - **Raw data is deleted immediately after successful processing**

3. **Check Rate Limiting**
   - Table `edge_function_rate_limit` tracks last call times
   - Prevents duplicate calls within 2 minutes

4. **Verify Data Cleanup**
   - Run this query to check data retention:
     ```sql
     SELECT * FROM public.cirrus_data_retention_info;
     ```
   - Manually test cleanup:
     ```sql
     SELECT public.auto_cleanup_cirrus_data();
     ```

---

### **STEP 5: Update Frontend (Optional)**

The frontend can now query the `CIRRUS` table for optimized data:

```typescript
// Example query
const { data } = await supabase
  .from('cirrus')
  .select('*')
  .eq('machine_id', machineId)
  .order('timestamp', { ascending: false })
  .limit(100);
```

---

## ✅ Verification Checklist

- [ ] CIRRUS table created in Supabase
- [ ] Processor function created and working
- [ ] Rate limiting table created
- [ ] Cleanup functions created
- [ ] Edge function deployed with rate limiting
- [ ] ESP32 code updated to 2-minute intervals
- [ ] ESP32 successfully sending data
- [ ] Data appearing in `readings_raw` table (briefly, then deleted)
- [ ] Data automatically processing into `CIRRUS` table
- [ ] Raw data being deleted after processing (verify `readings_raw` stays empty)
- [ ] Rate limiting preventing duplicate calls
- [ ] Cleanup function tested (run `auto_cleanup_cirrus_data()`)

---

## 🎯 Expected Results

### **Before:**
- Updates: Every 30 seconds
- Calls/day: ~2,880 per machine
- Bandwidth: ~2.5 MB/day per machine

### **After:**
- Updates: Every 2 minutes ✅
- Calls/day: ~720 per machine (75% reduction) ✅
- Bandwidth: ~625 KB/day per machine (75% reduction) ✅

---

## 🚀 Ready to Start!

Follow the steps in order. Each step has detailed SQL/code that you can copy directly.

**Let's begin with Step 1!**

