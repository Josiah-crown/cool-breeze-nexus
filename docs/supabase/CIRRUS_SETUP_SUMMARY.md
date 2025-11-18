# 🎯 CIRRUS Setup - Quick Summary

## ✅ What We've Created

### **Database Migrations:**
1. ✅ `20250108000000_create_cirrus_table.sql` - Creates CIRRUS table
2. ✅ `20250108000001_create_cirrus_processor.sql` - Auto-processes readings_raw → CIRRUS
3. ✅ `20250108000002_optimize_edge_function_rate_limit.sql` - Rate limiting system
4. ✅ `20250108000003_add_manufacturer_column.sql` - Optional manufacturer column

### **Code Updates:**
1. ✅ `supabase/functions/esp32-data-receiver/index.ts` - Added rate limiting
2. ✅ `hardware/esp32/ESP32_Cirrus_Optimized_2Min/ESP32_Cirrus_Optimized_2Min.ino` - 2-minute updates

### **Documentation:**
1. ✅ `docs/CIRRUS_SETUP_GUIDE.md` - Complete step-by-step guide

---

## 🚀 Quick Start (5 Steps)

### **1. Run Migrations (Supabase Dashboard → SQL Editor)**
```sql
-- Run these in order:
1. 20250108000000_create_cirrus_table.sql
2. 20250108000001_create_cirrus_processor.sql
3. 20250108000002_optimize_edge_function_rate_limit.sql
4. 20250108000003_add_manufacturer_column.sql (optional)
```

### **2. Deploy Edge Function**
```bash
supabase functions deploy esp32-data-receiver
```

### **3. Upload ESP32 Code**
- Open `hardware/esp32/ESP32_Cirrus_Optimized_2Min/ESP32_Cirrus_Optimized_2Min.ino`
- Upload to ESP32
- Configure via WiFiManager

### **4. Verify Data Flow**
- Check `readings_raw` table (should update every 2 minutes)
- Check `cirrus` table (should auto-populate)

### **5. Test Rate Limiting**
- Try sending data twice within 2 minutes
- Second call should return 429 (rate limited)

---

## 📊 Key Features

### **CIRRUS Table:**
- Stores processed status for each Cirrus machine
- Calculates: overall_status, motor_status, water_status, cooling_status
- Tracks historical data with timestamps
- One record per machine per timestamp

### **Auto-Processing:**
- Trigger automatically processes `readings_raw` → `CIRRUS`
- Only processes machines with `type='evaporative'`
- Calculates status based on sensor readings

### **Rate Limiting:**
- Prevents duplicate calls within 2 minutes
- Returns 429 status if called too frequently
- Tracks in `edge_function_rate_limit` table

### **Optimization:**
- ESP32 sends data every 2 minutes (was 30 seconds)
- 75% reduction in bandwidth and edge function calls
- Lower power consumption

---

## 🔍 How It Works

```
ESP32 (every 2 min)
    ↓
Edge Function (rate limited)
    ↓
readings_raw table
    ↓
Database Trigger (auto-processes)
    ↓
CIRRUS table (processed status)
    ↓
Website Dashboard
```

---

## ⚠️ Important Notes

1. **Machine Type:** Ensure your machines have `type='evaporative'` for processing
2. **Manufacturer:** Optional - can set `manufacturer='Cirrus'` if you ran migration 4
3. **Rate Limiting:** Edge function enforces 2-minute minimum between calls
4. **Backward Compatible:** Existing code continues to work

---

## 📈 Expected Savings

- **Before:** 2,880 calls/day per machine
- **After:** 720 calls/day per machine
- **Savings:** 75% reduction! 🎉

---

## 🆘 Troubleshooting

### **CIRRUS table not populating?**
- Check machine `type` is 'evaporative'
- Verify trigger exists: `trigger_process_cirrus_reading`
- Check function exists: `process_cirrus_reading()`

### **Rate limiting not working?**
- Verify `edge_function_rate_limit` table exists
- Check `check_rate_limit` function exists
- Ensure edge function is deployed

### **ESP32 not sending?**
- Check WiFi connection
- Verify Supabase URL and API key
- Monitor Serial Monitor for errors

---

## 📚 Full Documentation

See `docs/CIRRUS_SETUP_GUIDE.md` for complete details.


