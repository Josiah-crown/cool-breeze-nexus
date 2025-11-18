# Quick Check: Is Historical Data Showing?

## Yes, historical data SHOULD be showing on the website!

When you click on a machine card in the dashboard, it should open the `MachineDetailView` which includes a "Historical Data" section with a chart showing sensor readings over time.

## How to Check

1. **Open your website** and log in
2. **Click on your Cirrus machine card** to open the detail view
3. **Scroll down** to the "Historical Data" section
4. **You should see:**
   - A chart with time period buttons (24h, 7d, 30d, 1y)
   - Lines showing temperature, current, and other sensor readings
   - If no data exists, you'll see "No historical data available for the selected period"

## If Historical Data is NOT Showing

### Step 1: Check Browser Console
Open browser DevTools (F12) and check the Console tab. Look for:
- `[Historical Data]` log messages
- Any error messages
- Check if data is being fetched

### Step 2: Verify Data Exists in Database
Run this SQL query in Supabase SQL Editor:

```sql
-- Find your machine
SELECT id, name, type, manufacturer 
FROM public.machines 
WHERE name LIKE '%Cirrus%' OR manufacturer = 'Cirrus';

-- Check if data exists (replace YOUR_MACHINE_ID with actual ID)
SELECT COUNT(*) as record_count
FROM public.cirrus
WHERE machine_id = 'YOUR_MACHINE_ID'
  AND timestamp >= NOW() - INTERVAL '24 hours';
```

### Step 3: Check Machine Manufacturer
The machine MUST have `manufacturer = 'Cirrus'` set in the machines table. If it's NULL or missing, the system won't know which table to query.

```sql
-- Check manufacturer
SELECT id, name, type, manufacturer 
FROM public.machines 
WHERE id = 'YOUR_MACHINE_ID';

-- If manufacturer is NULL, set it:
UPDATE public.machines 
SET manufacturer = 'Cirrus' 
WHERE id = 'YOUR_MACHINE_ID' AND manufacturer IS NULL;
```

### Step 4: Verify Data Flow
Check if data is being processed:
1. ESP32 posts to `readings_raw` table
2. Trigger processes data into `cirrus` table
3. Frontend queries `cirrus` table

```sql
-- Check recent raw data
SELECT COUNT(*) FROM public.readings_raw 
WHERE created_at >= NOW() - INTERVAL '1 hour';

-- Check processed data
SELECT COUNT(*) FROM public.cirrus 
WHERE timestamp >= NOW() - INTERVAL '1 hour';
```

## Common Issues

### Issue 1: Machine has no manufacturer set
**Solution:** Set `manufacturer = 'Cirrus'` in the machines table

### Issue 2: No data in cirrus table
**Possible causes:**
- Trigger not firing (check trigger exists)
- Data not being posted from ESP32
- Data being deleted before processing

**Check:**
```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname LIKE '%cirrus%';

-- Check recent readings_raw
SELECT * FROM public.readings_raw 
ORDER BY created_at DESC 
LIMIT 5;
```

### Issue 3: RLS (Row Level Security) blocking access
**Solution:** Check RLS policies allow your user to read from `cirrus` table

### Issue 4: Data exists but chart shows empty
**Check:**
- Browser console for errors
- Network tab to see if API calls are failing
- Verify timestamp format is correct

## Debugging Steps

1. **Open browser DevTools (F12)**
2. **Go to Console tab**
3. **Click on your machine** to open detail view
4. **Look for log messages:**
   - `[Historical Data] Machine ...: type=..., manufacturer=...`
   - `[Historical Data] Determined processing table: cirrus`
   - `[Historical Data] Fetching from cirrus for machine ...`
   - `[Historical Data] Fetched X readings from cirrus`

5. **If you see errors, check:**
   - Machine has manufacturer set
   - Data exists in cirrus table
   - RLS policies allow access

## Quick Fix Script

Run this in Supabase SQL Editor to check everything at once:

```sql
-- Complete diagnostic
WITH machine_info AS (
  SELECT id, name, type, manufacturer 
  FROM public.machines 
  WHERE manufacturer = 'Cirrus' OR name LIKE '%Cirrus%'
  LIMIT 1
)
SELECT 
  m.id as machine_id,
  m.name,
  m.type,
  m.manufacturer,
  (SELECT COUNT(*) FROM public.cirrus WHERE machine_id = m.id) as total_cirrus_records,
  (SELECT COUNT(*) FROM public.cirrus 
   WHERE machine_id = m.id 
   AND timestamp >= NOW() - INTERVAL '24 hours') as records_last_24h,
  (SELECT MAX(timestamp) FROM public.cirrus WHERE machine_id = m.id) as latest_reading
FROM machine_info m;
```

This will show you:
- Machine ID and details
- Total records in cirrus table
- Records in last 24 hours
- Latest reading timestamp

