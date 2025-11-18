# 📈 Historical Data Tracking Setup

## Overview

Historical data is fetched from device-specific processing tables (`cirrus` or `coolbreeze`) instead of `readings_raw`, since raw data is deleted immediately after processing.

---

## Data Flow

```
ESP32 → readings_raw → Processing Trigger → cirrus/coolbreeze → Website Charts
                                                      ↓
                                            (1 year retention)
```

---

## Implementation

### **1. Historical Data Fetching (`src/lib/historicalData.ts`)**

**Key Changes:**
- ✅ Determines machine type to select correct processing table
- ✅ Fetches from `cirrus` or `coolbreeze` tables (not `readings_raw`)
- ✅ Transforms processed data to chart format

**Function:**
```typescript
fetchHistoricalData(machineId: string, period: Period)
```

**Table Selection Logic:**
- `evaporative` type OR `Cirrus` manufacturer → `cirrus` table
- `airconditioner`/`heatpump` type OR `CoolBreeze` manufacturer → `coolbreeze` table

---

### **2. Data Transformation**

**Processing tables use different field names:**
- `ambient_temp` (instead of `outside_temp`)
- `duct_temp` (instead of `inside_temp`)
- `delta_t` (pre-calculated)
- `fan_active`, `is_cooling`, `has_water` (boolean flags)
- `power`, `current`, `voltage` (calculated values)

**Historical data function maps these correctly:**
```typescript
// Outside temp
if (reading.ambient_temp != null) {
  outsideTemp.push({ timestamp, value: reading.ambient_temp });
}

// Inside temp
if (reading.duct_temp != null) {
  insideTemp.push({ timestamp, value: reading.duct_temp });
}

// Delta T (pre-calculated)
if (reading.delta_t != null) {
  deltaT.push({ timestamp, value: reading.delta_t });
}
```

---

## Time Periods

**Supported Periods:**
- `24h` - Last 24 hours
- `7d` - Last 7 days
- `30d` - Last 30 days
- `1y` - Last 1 year (matches data retention policy)

**Data Retention:**
- ✅ Processing tables keep 1 year of data
- ✅ Automatic cleanup removes older records
- ✅ Historical charts can display up to 1 year

---

## Usage

### **In Components:**

```typescript
import { fetchHistoricalData } from '@/lib/historicalData';

// Fetch historical data
const data = await fetchHistoricalData(machineId, '24h');

// Use in charts
<LineChart data={formatChartData(data)}>
  <Line dataKey="motorTemp" />
  <Line dataKey="current" />
  // ...
</LineChart>
```

### **In MachineDetailView:**

```typescript
useEffect(() => {
  const loadHistoricalData = async () => {
    setLoadingHistoricalData(true);
    try {
      const data = await fetchHistoricalData(machine.id, selectedPeriod);
      setHistoricalData(data);
    } catch (error) {
      console.error('Error loading historical data:', error);
    } finally {
      setLoadingHistoricalData(false);
    }
  };
  loadHistoricalData();
}, [machine.id, selectedPeriod]);
```

---

## Data Points Available

**All Processing Tables Provide:**
- ✅ `motor_temp` - Motor/compressor temperature
- ✅ `ambient_temp` - Outside/ambient temperature
- ✅ `duct_temp` - Inside/duct temperature
- ✅ `delta_t` - Temperature difference (calculated)
- ✅ `current` - Current (Amps)
- ✅ `voltage` - Voltage (Volts)
- ✅ `power` - Power (Watts)
- ✅ `fan_active` - Fan status (boolean)
- ✅ `is_cooling` - Cooling status (boolean)
- ✅ `has_water` - Water status (boolean)

**CoolBreeze Additional:**
- ✅ `fan_speed` - Fan speed percentage (0-100)
- ✅ `exhaust_status`, `fan_status`, `pump_status`, `drain_status` - Pickup statuses

---

## Performance Considerations

### **Indexing:**
- ✅ `idx_cirrus_machine_timestamp` - Fast queries by machine and time
- ✅ `idx_coolbreeze_machine_timestamp` - Fast queries by machine and time

### **Query Optimization:**
- ✅ Filters by `machine_id` and `timestamp >= startTime`
- ✅ Orders by `timestamp ASC` for chronological display
- ✅ Only fetches required time period

### **Caching:**
- Historical data is fetched on-demand
- Consider adding caching for frequently accessed periods
- Data updates every 2 minutes (ESP32 transmission interval)

---

## Troubleshooting

### **No Data Showing:**
1. Check machine type is correct (`evaporative`, `airconditioner`, or `heatpump`)
2. Verify manufacturer is set (`Cirrus` or `CoolBreeze`)
3. Check if data exists in processing table:
   ```sql
   SELECT COUNT(*) FROM cirrus WHERE machine_id = '...';
   SELECT COUNT(*) FROM coolbreeze WHERE machine_id = '...';
   ```
4. Verify data is within time period (check `timestamp` column)

### **Wrong Table Selected:**
- Check `machines.type` and `machines.manufacturer`
- Update if incorrect:
  ```sql
  UPDATE machines SET type = 'evaporative', manufacturer = 'Cirrus' WHERE id = '...';
  ```

### **Missing Fields:**
- Processing tables should have all required fields
- Check trigger is running correctly
- Verify raw data is being processed

---

## Future Enhancements

1. **Real-time Updates:**
   - Use Supabase Realtime subscriptions
   - Update charts automatically when new data arrives

2. **Data Aggregation:**
   - Average data points for longer periods
   - Reduce data points for smoother charts

3. **Export Functionality:**
   - Export historical data to CSV
   - Generate reports for specific time periods

4. **Multiple Machines:**
   - Compare historical data across machines
   - Aggregate statistics across device types

---

## Files Modified

- ✅ `src/lib/historicalData.ts` - Updated to fetch from processing tables
- ✅ `src/components/MachineDetailView.tsx` - Uses updated historical data
- ✅ `src/hooks/useMachineData.tsx` - Fetches historical data for multiple machines

---

## Verification Checklist

- [x] Historical data fetches from correct processing table
- [x] Machine type detection works correctly
- [x] Data transformation maps all fields
- [x] Time periods work correctly
- [x] Charts display data properly
- [x] No errors when no data available
- [x] Performance is acceptable

---

## Summary

✅ **Historical data now fetches from processing tables** (`cirrus` or `coolbreeze`)  
✅ **Raw data is deleted after processing** (no longer available for historical charts)  
✅ **1 year of processed data is retained** (matches retention policy)  
✅ **All device types supported** (Cirrus and CoolBreeze)  
✅ **Time periods work correctly** (24h, 7d, 30d, 1y)


