# 🔍 DEBUG_MODE Explanation

## What DEBUG_MODE Does

**DEBUG_MODE = 1 (Enabled):**
- Shows detailed sensor readings every second
- Shows temperature validation messages
- Shows full JSON payload being sent
- Shows HTTP response details
- More verbose output for troubleshooting

**DEBUG_MODE = 0 (Disabled):**
- Hides detailed sensor readings
- Hides temperature validation messages
- Hides full JSON payload
- Hides detailed HTTP response
- Still shows important messages (errors, connection status, etc.)

---

## What Serial Output is ALWAYS Shown (Regardless of DEBUG_MODE)

These messages are **always printed** even when DEBUG_MODE = 0:

✅ **Connection Status:**
- "WiFi connected!"
- "IP: ..."
- "Connecting to WiFi..."
- "WiFi connection failed!"

✅ **Data Transmission:**
- "Sending data to Supabase..."
- "URL: ..."
- "Response code: ..."
- "Data sent successfully!"
- "Data send failed - will retry in 2 minutes"

✅ **Errors & Warnings:**
- "⚠️ WARNING: HTTP POST took longer than timeout!"
- "WiFi not connected!"
- "Invalid temp reading: ..."
- "All temp readings failed, using last valid: ..."

✅ **System Status:**
- "Setup complete. Starting main loop..."
- "Hold BOOT button for 5 seconds to enter WiFi config mode"
- "Auto reset triggered (6 hours)"
- "WiFi stuck - forcing reset!"

✅ **Boot Button:**
- "Boot button pressed - hold for 5 seconds..."
- "BOOT BUTTON HELD - Entering WiFi Config Mode"

---

## What Serial Output is HIDDEN When DEBUG_MODE = 0

❌ **Detailed Sensor Readings:**
- "Sensor read #X - Motor: ...°C, Exterior: ...°C..."
- "Temps - Motor: ...°C, Exterior: ...°C, Interior: ...°C"

❌ **Temperature Validation:**
- "Invalid temp reading: -127"
- "All temp readings failed, using last valid: 25.0"

❌ **Full JSON Payload:**
- "Payload: {...full JSON...}"

❌ **Detailed HTTP Response:**
- "Response: {...full response...}"

---

## Summary

**DEBUG_MODE = 0:**
- ✅ Still shows all important status messages
- ✅ Still shows errors and warnings
- ✅ Still shows connection status
- ❌ Hides detailed sensor readings (every second)
- ❌ Hides full JSON payloads
- ❌ Hides verbose debugging info

**Use DEBUG_MODE = 0 for:**
- Production deployments
- Reducing Serial output noise
- Better performance (slightly less Serial overhead)

**Use DEBUG_MODE = 1 for:**
- Development and testing
- Troubleshooting issues
- Verifying sensor readings
- Debugging data transmission

---

## Performance Impact

- **DEBUG_MODE = 1:** More Serial output = slightly more CPU usage
- **DEBUG_MODE = 0:** Less Serial output = slightly better performance
- **Difference:** Minimal - Serial output is fast, but every bit helps in production

---

## Recommendation

- **Development:** Keep DEBUG_MODE = 1
- **Production:** Set DEBUG_MODE = 0
- **Troubleshooting:** Temporarily set DEBUG_MODE = 1

