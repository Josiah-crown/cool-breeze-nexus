# Cirrus 12V Firmware Update - November 10, 2025

## Changes Made

### 1. Edge Function Integration
- **Old**: Direct POST to `/rest/v1/readings_raw` using anon key
- **New**: POST to `/functions/v1/esp32-data-receiver` with machine API key validation

### 2. Hardcoded Supabase Credentials
- Added constants for `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- Same credentials across all Cirrus devices
- Only machine UUID and API key need to be configured per-device

### 3. Reduced HTTP Timeout
- **Old**: 60 seconds
- **New**: 8 seconds (prevents watchdog timeout)

### 4. Simplified WiFiManager
- Removed Supabase URL and Anon Key from config portal
- Only prompts for:
  - Machine UUID (from dashboard)
  - Machine API Key (from dashboard)

## Installation Steps

1. **Create machine in dashboard**
   - Navigate to machine management
   - Create new machine (type: evaporative or appropriate)
   - Generate API key for the machine
   - Copy UUID and API key

2. **Flash firmware**
   - Open `ESP32_Cirrus_12V_V2.ino` in Arduino IDE
   - Select board: ESP32 Dev Module
   - Upload to device

3. **Configure device**
   - On first boot, device creates AP: `ESP32_Cirrus_Setup`
   - Connect to AP (no password)
   - Portal opens at 192.168.4.1
   - Enter:
     - WiFi SSID
     - WiFi Password
     - Machine UUID (from dashboard)
     - Machine API Key (from dashboard)
   - Click Save

4. **Verify operation**
   - Serial Monitor (115200 baud)
   - Watch for "HTTP Code: 201" (success)
   - Check dashboard for live data

## Differences from HVAC Version

- **Device ID**: "CIRRUS" (vs "R32")
- **Firmware Version**: 2.1.0-12V
- **Voltage Logic**: 12V thresholds (lower than 24V)
- **Fan Speed**: Non-inverted (lower voltage = lower speed)

## Troubleshooting

### HTTP 401 - Unauthorized
- Check API key is active in dashboard
- Verify machine UUID matches database
- Confirm edge function is deployed

### HTTP 404 - Not Found
- Edge function not deployed
- Run: `supabase functions deploy esp32-data-receiver`

### No data on dashboard
- Check Serial Monitor for errors
- Verify machine exists in database
- Check `last_seen` timestamp in machines table

## Security Notes

This firmware now uses the secure edge function endpoint that:
- Validates machine API key
- Prevents unauthorized data injection
- Tracks API key usage
- Enables RLS on readings_raw table

The old direct REST endpoint (with RLS disabled) should no longer be used.





