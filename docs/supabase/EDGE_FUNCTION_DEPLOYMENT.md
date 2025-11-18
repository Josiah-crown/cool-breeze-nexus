# 🚀 Edge Function Deployment Guide

## What is `index.ts`?

The `index.ts` file at `supabase/functions/esp32-data-receiver/index.ts` is your **Edge Function** code. This is the serverless function that:
- Receives data from ESP32 devices
- Validates API keys
- Enforces rate limiting (2-minute minimum)
- Inserts raw data into `readings_raw` table
- Triggers automatic processing into `cirrus` table

---

## ✅ Good News: The File is Already Updated!

The `index.ts` file has already been updated with:
- ✅ Rate limiting support (2-minute minimum interval)
- ✅ Support for both Cirrus and CoolBreeze data formats
- ✅ Raw data insertion only (no calculations)
- ✅ `sensor_read_count` field support
- ✅ Proper error handling

**You don't need to edit the file - just deploy it!**

---

## 📋 Step-by-Step Deployment

### **Option 1: Using Supabase CLI** (Recommended)

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link to your project** (if not already linked):
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```
   - Find your project ref in Supabase Dashboard → Settings → General
   - It looks like: `abcdefghijklmnop`

4. **Deploy the function**:
   ```bash
   supabase functions deploy esp32-data-receiver
   ```

5. **Verify deployment**:
   - Check Supabase Dashboard → Edge Functions
   - You should see `esp32-data-receiver` listed
   - Status should be "Active"

---

### **Option 2: Using Supabase Dashboard** (Easier, No CLI)

1. **Open Supabase Dashboard**:
   - Go to: https://supabase.com/dashboard
   - Select your project

2. **Navigate to Edge Functions**:
   - Click **Edge Functions** in the left sidebar
   - Or go to: https://supabase.com/dashboard/project/YOUR_PROJECT/edge-functions

3. **Create/Update Function**:
   - If `esp32-data-receiver` doesn't exist, click **Create Function**
   - If it exists, click on it to edit

4. **Copy the code**:
   - Open `supabase/functions/esp32-data-receiver/index.ts` in your editor
   - Copy the entire file contents

5. **Paste and Deploy**:
   - Paste the code into the Supabase Dashboard editor
   - Click **Deploy** or **Save**

6. **Set Environment Variables** (if needed):
   - The function uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
   - These are usually auto-configured, but check:
     - Settings → Edge Functions → Secrets
     - Make sure these are set:
       - `SUPABASE_URL` (or `EDGE_SUPABASE_URL`)
       - `SUPABASE_SERVICE_ROLE_KEY` (or `EDGE_SUPABASE_SERVICE_ROLE_KEY`)

---

## 🔍 Verify Deployment

### **Check Function Status**:
1. Go to Supabase Dashboard → Edge Functions
2. Find `esp32-data-receiver`
3. Status should be **"Active"** (green)

### **Test the Function**:
You can test it by sending a request (after migrations are complete):

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/esp32-data-receiver \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "machine_id": "YOUR_MACHINE_UUID",
    "motor_temp": 25.5,
    "inside_temp": 22.0,
    "outside_temp": 30.0,
    "current": 5.2,
    "voltage": 230.0,
    "has_water": true,
    "voltage_input_1": 12.0,
    "voltage_input_2": 0.0,
    "voltage_input_3": 12.0,
    "voltage_input_4": 0.0,
    "sensor_read_count": 5
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "machine_id": "...",
    ...
  }
}
```

---

## ⚠️ Important Notes

### **When to Deploy**:
- **Deploy AFTER running migrations** (especially Migration 2 - processor function)
- The function needs the `check_rate_limit` RPC function to exist
- The function needs the `readings_raw` table to exist

### **What Happens After Deployment**:
1. ESP32 sends data → Edge Function receives it
2. Edge Function validates API key
3. Edge Function checks rate limit (2-minute minimum)
4. Edge Function inserts into `readings_raw`
5. Database trigger automatically processes into `cirrus` table
6. Raw data is deleted after processing

### **Rate Limiting**:
- The function enforces a 2-minute minimum between calls
- If called too frequently, returns HTTP 429 (Too Many Requests)
- ESP32 should already be configured for 2-minute intervals

---

## 🐛 Troubleshooting

### **Function Not Deploying**:
- Check Supabase CLI is logged in: `supabase status`
- Verify project ref is correct
- Check for syntax errors in `index.ts`

### **Function Returns 500 Error**:
- Check Supabase Dashboard → Logs → Edge Functions
- Verify environment variables are set
- Check that `readings_raw` table exists
- Verify `check_rate_limit` function exists (from Migration 3)

### **Rate Limiting Not Working**:
- Verify Migration 3 was run (`edge_function_rate_limit` table exists)
- Check `check_rate_limit` RPC function exists
- Check Supabase logs for errors

### **Data Not Processing**:
- Verify Migration 2 was run (processor trigger exists)
- Check machine type is `evaporative` or manufacturer is `Cirrus`
- Check Supabase logs for trigger errors

---

## 📝 Summary

**What to do with `index.ts`:**
1. ✅ **Nothing!** The file is already updated and ready
2. 📤 **Deploy it** using Supabase CLI or Dashboard
3. ✅ **Verify** it's active in Dashboard
4. 🧪 **Test** with a sample request (optional)

**The file doesn't need any changes - just deployment!**

---

## 🔗 Related Files

- **Edge Function Code:** `supabase/functions/esp32-data-receiver/index.ts`
- **Rate Limiting Migration:** `supabase/migrations/20250108000002_optimize_edge_function_rate_limit.sql`
- **Processor Migration:** `supabase/migrations/20250108000001_create_cirrus_processor.sql`

---

**Last Updated:** November 13, 2025

