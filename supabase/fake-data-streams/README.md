# 🤖 Fake Data Stream Simulators

This directory contains scripts to simulate ESP32 devices posting data to your Supabase instance.

## 📋 Available Simulators

### 1. **Alliance Heatpump** (`alliance-heatpump-simulator.js`)
Simulates an Alliance heatpump with realistic heating cycles.

**Features:**
- Heating cycles (6 minutes on, 4 minutes off)
- GPIO5 (voltage_input_5) = pump relay
- Current > 1A indicates heating active
- Realistic temperature deltas during heating
- Compressor status simulation

**Data Posted:**
- Ambient temp: 15-18°C (inlet)
- Duct temp: Ambient + 8-12°C when heating
- Motor temp: 45-55°C when running, 30-35°C idle
- Current: 8-12A when heating, 0.3-0.7A idle
- Voltage: 225-235V
- GPIO5 voltage: 12V when pump active, 0V when off

### 2. **CoolBreeze Evaporative Cooler** (`coolbreeze-evaporative-simulator.js`)
Simulates a CoolBreeze evaporative cooler with cooling and water cycles.

**Features:**
- Cooling cycles (15 minutes on, 5 minutes off)
- Water cycles (27 minutes full, 3 minutes empty)
- Fan, pump, and drain simulation
- GPIO5 (voltage_input_5) = float switch (water level)
- Realistic cooling delta T

**Data Posted:**
- Outside temp: 35-40°C (hot day)
- Inside temp: Outside - 8-12°C when cooling
- Motor temp: 50-60°C when running, 35-40°C idle
- Current: 3-5A when running, 0.2-0.5A idle
- Voltage: 225-235V
- Fan, pump, drain voltages based on state
- GPIO5 voltage: 12V when water present, 0V when empty

## 🚀 Setup

### Prerequisites
- Node.js installed
- Supabase project with edge function deployed
- Machine UUIDs and API keys from your Supabase database

### Installation

1. Navigate to this directory:
```bash
cd supabase/scripts/fake-data-streams
```

2. No dependencies needed - uses native Node.js `fetch` API (Node 18+)

### Configuration

Edit the scripts and update these values at the top:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // e.g., https://xxxxx.supabase.co
const MACHINE_ID = 'YOUR_MACHINE_UUID';   // From machines table
const API_KEY = 'YOUR_API_KEY';           // From api_keys table
```

## 🎮 Usage

### Run Alliance Heatpump Simulator
```bash
node alliance-heatpump-simulator.js
```

### Run CoolBreeze Evaporative Simulator
```bash
node coolbreeze-evaporative-simulator.js
```

### Run Both Simultaneously
Open two terminal windows and run each script in a separate window.

**Linux/Mac:**
```bash
# Terminal 1
node alliance-heatpump-simulator.js

# Terminal 2
node coolbreeze-evaporative-simulator.js
```

**Windows PowerShell:**
```powershell
# Terminal 1
node alliance-heatpump-simulator.js

# Terminal 2
node coolbreeze-evaporative-simulator.js
```

### Stop Simulators
Press `Ctrl+C` in each terminal to stop the simulators gracefully.

## 📊 What Happens

1. **Data Generation**: Scripts generate realistic sensor data based on time-based cycles
2. **Edge Function**: Data is posted to `/functions/v1/esp32-data-receiver`
3. **Validation**: Edge function validates API key and machine ID
4. **Raw Data**: Data is inserted into `readings_raw` table
5. **Processing**: Database triggers process the data:
   - Alliance → `process_alliance_reading()` → `alliance` table
   - CoolBreeze → `process_coolbreeze_reading()` → `coolbreeze` table
6. **Frontend**: Your website displays the data in real-time

## 🔍 Monitoring

### Check Data Arrival
```sql
-- Check readings_raw
SELECT machine_id, timestamp, current, voltage 
FROM readings_raw 
ORDER BY timestamp DESC 
LIMIT 10;

-- Check alliance processed data
SELECT machine_id, timestamp, is_heating, pump_active, compressor_status
FROM alliance
ORDER BY timestamp DESC 
LIMIT 10;

-- Check coolbreeze processed data
SELECT machine_id, timestamp, fan_active, is_cooling, has_water
FROM coolbreeze
ORDER BY timestamp DESC 
LIMIT 10;
```

### Check API Key Usage
```sql
SELECT key, machine_id, last_used_at 
FROM api_keys 
WHERE machine_id IN ('YOUR_MACHINE_ID_1', 'YOUR_MACHINE_ID_2');
```

## 🎨 Customization

### Adjust Posting Interval
Change `POST_INTERVAL` in the script:
```javascript
const POST_INTERVAL = 30000; // 30 seconds (default)
const POST_INTERVAL = 60000; // 1 minute
const POST_INTERVAL = 10000; // 10 seconds
```

### Modify Data Ranges
Edit the data generation functions to customize:
- Temperature ranges
- Current ranges
- Cycle durations
- Voltage thresholds

### Add Anomalies
You can simulate issues by modifying the data:
```javascript
// Simulate motor overheating
const motorTemp = 85 + Math.random() * 10; // 85-95°C (critical)

// Simulate low current (compressor failure)
const current = 0.5 + Math.random() * 0.3; // 0.5-0.8A (too low)

// Simulate no water
const hasWater = false;
```

## 🐛 Troubleshooting

### Error: "Missing or invalid Authorization header"
- Check that `API_KEY` matches the key in your `api_keys` table
- Verify the key is active (`is_active = true`)

### Error: "Invalid or inactive Machine API Key"
- Ensure `MACHINE_ID` matches the `machine_id` in the `api_keys` table
- Check that the machine exists in the `machines` table

### Error: "Rate limit exceeded"
- The edge function has a 2-minute rate limit
- Wait 2 minutes or adjust `POST_INTERVAL` to be >= 120000 (2 minutes)
- Note: Default is 30 seconds, which may trigger rate limiting if enabled

### No Data Appearing in Frontend
1. Check Supabase logs: Dashboard → Edge Functions → Logs
2. Verify triggers are enabled:
```sql
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname LIKE '%process_%';
```
3. Check for errors in database logs

### Connection Issues
- Verify `SUPABASE_URL` is correct (include https://)
- Check that edge function is deployed
- Ensure firewall/network allows outbound connections

## 📝 Notes

- Simulators use Node.js native `fetch` (requires Node 18+)
- Data generation is deterministic based on time cycles
- Both simulators can run simultaneously without conflicts
- Scripts handle Ctrl+C gracefully for clean shutdown
- Rate limiting may be enforced by the edge function (2-minute minimum)

## 🔗 Related Documentation

- [Supabase Edge Functions](../../functions/esp32-data-receiver/index.ts)
- [Data Flow Architecture](../../../docs/supabase/DATA_FLOW_ARCHITECTURE.md)
- [Database Schema](../../../docs/supabase/SCHEMA.md)
- [Alliance Heatpump Logic](../../migrations/20250201_alliance_heatpump_logic.sql)

## 📧 Support

If you encounter issues, check:
1. Supabase dashboard logs
2. Database trigger logs
3. Frontend console for errors
4. This README for troubleshooting steps

