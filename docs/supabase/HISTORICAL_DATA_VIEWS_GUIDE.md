# Historical Data Views & Functions Guide

**Created:** January 26, 2025  
**Purpose:** Optimized database functions for fetching historical data by time period

---

## 🎯 Problem Solved

**Issue:** When viewing 1-year data, only seeing data from 11/17-11/19 instead of full year range.

**Root Cause:** 
- Machine only started sending data on 11/17/2025
- Query was working correctly, but there's no older data
- For 1-year view, fetching all readings would be inefficient (millions of rows)

**Solution:** Database functions that aggregate data appropriately for each time period.

---

## 📊 How It Works

### **Database Function: `get_historical_data()`**

This function automatically:
- **24h**: Returns all readings (no aggregation)
- **7d**: Returns 10-minute averages
- **30d**: Returns 1-hour averages
- **1y**: Returns 1-day averages

### **Benefits:**
1. ✅ **Performance**: Aggregation happens at database level (faster)
2. ✅ **Efficiency**: Returns manageable number of data points (365 for 1y instead of millions)
3. ✅ **Simplicity**: Frontend just calls one function
4. ✅ **Scalability**: Handles large datasets efficiently

---

## 🚀 Usage

### **1. Run the Migration**

```sql
-- Run in Supabase SQL Editor:
-- File: supabase/migrations/20250126000000_create_historical_data_views.sql
```

### **2. Check Available Data**

```sql
-- See what data exists for each machine:
SELECT * FROM public.historical_data_summary 
WHERE machine_id = 'your-machine-id';
```

This shows:
- Earliest data date
- Latest data date
- Total readings
- Readings in last year

### **3. Use in Frontend**

The function is called from `src/lib/historicalData.ts`:

```typescript
const { data, error } = await supabase.rpc('get_historical_data', {
  p_machine_id: machineId,
  p_period: '1y', // '24h' | '7d' | '30d' | '1y'
  p_table_name: 'cirrus' // or 'coolbreeze' | 'alliance'
});
```

---

## 📈 Data Aggregation Details

### **24h View**
- **Interval**: All readings (no aggregation)
- **Expected Points**: ~480 (if reading every 3 minutes)
- **Use Case**: Detailed view of last 24 hours

### **7d View**
- **Interval**: 10-minute buckets
- **Aggregation**: Averages for numeric values, BOOL_OR for booleans
- **Expected Points**: ~1,008 (7 days × 24 hours × 6 buckets/hour)
- **Use Case**: Weekly trends

### **30d View**
- **Interval**: 1-hour buckets
- **Aggregation**: Averages for numeric values, BOOL_OR for booleans
- **Expected Points**: ~720 (30 days × 24 hours)
- **Use Case**: Monthly patterns

### **1y View**
- **Interval**: 1-day buckets
- **Aggregation**: Daily averages
- **Expected Points**: 365 (one per day)
- **Use Case**: Yearly trends, seasonal patterns

---

## 🔍 Troubleshooting

### **"No data showing for 1y view"**

1. **Check if data exists:**
   ```sql
   SELECT * FROM public.historical_data_summary 
   WHERE machine_id = 'your-machine-id';
   ```

2. **Check earliest data date:**
   - If machine started on 11/17/2025, you'll only see data from that date forward
   - The function will return data from 11/17 to now, not a full year

3. **Verify function exists:**
   ```sql
   SELECT proname FROM pg_proc 
   WHERE proname = 'get_historical_data';
   ```

### **"Function returns empty results"**

1. **Check RLS policies:**
   - Function uses `SECURITY DEFINER`, so it should bypass RLS
   - But verify the underlying table has proper RLS policies

2. **Check table name:**
   - Must match exactly: 'cirrus', 'coolbreeze', or 'alliance'
   - Case-sensitive

3. **Check machine_id:**
   - Must be valid UUID
   - Machine must exist in `machines` table

---

## 🔄 Migration Path

### **Current Implementation:**
- Frontend queries tables directly
- No aggregation
- Fetches all readings in time range

### **New Implementation (Recommended):**
- Frontend calls `get_historical_data()` function
- Database handles aggregation
- Returns optimized data points

### **To Switch:**
1. Run migration: `20250126000000_create_historical_data_views.sql`
2. Update `src/lib/historicalData.ts` to use `supabase.rpc()` instead of direct table query
3. Test each time period (24h, 7d, 30d, 1y)

---

## 📝 Notes

- **Data Retention**: `{manufacturer}_calculated` tables keep 1 year of data
- **Auto-cleanup**: pg_cron jobs delete data older than retention period
- **Performance**: Aggregation at database level is much faster than frontend aggregation
- **Scalability**: This approach scales to millions of readings

---

## 🔗 Related Files

- **Migration**: `supabase/migrations/20250126000000_create_historical_data_views.sql`
- **Frontend Code**: `src/lib/historicalData.ts`
- **Database Schema**: `DATABASE_SCHEMA.md`


