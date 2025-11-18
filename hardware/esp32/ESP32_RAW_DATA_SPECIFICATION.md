# ESP32 Raw Data Specification

**Document Version:** 1.0  
**Last Updated:** 2025-11-11  
**Applies To:** ESP32_Cirrus_12V_V2 firmware

---

## Philosophy

The ESP32 devices send **raw sensor measurements only** to Supabase. All business logic—status determination, delta calculations, cooling detection, alerting—happens **server-side** for:

- **Consistency**: All devices, dashboards, and alerts use the same rules
- **Flexibility**: Update thresholds/logic without reflashing devices
- **Auditability**: Historical data can be reprocessed with new rules
- **Security**: Machine API key validated by Edge Function before insertion

---

## Data Flow

```
ESP32 Device
    ↓ (every 30s)
    ↓ HTTP POST with Bearer token (machineAPIKey)
    ↓
Supabase Edge Function: esp32-data-receiver
    ↓ validates API key
    ↓ inserts raw reading
    ↓
Table: readings_raw
    ↓ (trigger after INSERT)
    ↓
Server-Side Logic
    ↓ computes: delta_t, overall_status, is_cooling, fan_active, etc.
    ↓
Table: machines (updated)
    ↓
Dashboard / Alerts / Analytics
```

---

## Raw Payload Schema

### Endpoint
```
POST https://wjyanxstvbiqefmgpccb.supabase.co/functions/v1/esp32-data-receiver
```

### Headers
```
Content-Type: application/json
apikey: {SUPABASE_ANON_KEY}
Authorization: Bearer {MACHINE_API_KEY}
```

### JSON Body

```json
{
  "machine_id": "uuid-of-machine",
  
  "motor_temp": 23.5,       // °C - Temperature sensor 1
  "outside_temp": 22.8,     // °C - Temperature sensor 2
  "inside_temp": 24.1,      // °C - Temperature sensor 3
  
  "current": 1.25,          // Amps - CT sensor
  "voltage": 230,           // Volts - Line voltage (constant)
  "power": 287.5,           // Watts - Calculated (V × I)
  
  "has_water": true,        // Boolean - Float switch (true = tank full)
  
  "exhaust_voltage": 11.2,  // Volts - Yellow wire pickup (GPIO 34)
  "fan_voltage": 8.7,       // Volts - Green wire pickup (GPIO 35)
  "pump_voltage": 0.3,      // Volts - Brown wire pickup (GPIO 32)
  "drain_voltage": 0.2      // Volts - Black wire pickup (GPIO 33)
}
```

---

## Field Descriptions

| Field | Type | Unit | Source | Description |
|-------|------|------|--------|-------------|
| `machine_id` | UUID | - | Config | Machine identifier from dashboard |
| `motor_temp` | float | °C | DS18B20 (GPIO 21) | Motor/compressor temperature |
| `outside_temp` | float | °C | DS18B20 (GPIO 22) | Ambient/exterior temperature |
| `inside_temp` | float | °C | DS18B20 (GPIO 23) | Interior/return air temperature |
| `current` | float | A | SCT-013 (GPIO 36) | AC current draw |
| `voltage` | integer | V | Constant | Line voltage (230V) |
| `power` | float | W | Calculated | Apparent power (V × I) |
| `has_water` | boolean | - | Float switch (GPIO 5) | Tank status (true = full, false = empty) |
| `exhaust_voltage` | float | V | Voltage divider (GPIO 34) | Exhaust damper control voltage |
| `fan_voltage` | float | V | Voltage divider (GPIO 35) | Fan motor control voltage |
| `pump_voltage` | float | V | Voltage divider (GPIO 32) | Water pump control voltage |
| `drain_voltage` | float | V | Voltage divider (GPIO 33) | Drain valve control voltage |

---

## Server-Side Processing (To Be Implemented)

### In Edge Function or Database Trigger:

#### 1. Voltage Interpretation (12V Logic, Non-Inverted)
```typescript
// Thresholds for 12V pickups
const VOLTAGE_ON_THRESHOLD = 6.0;  // > 6V = relay ON

function interpretPickups(voltages: {
  exhaust: number,
  fan: number,
  pump: number,
  drain: number
}) {
  return {
    exhaust_active: voltages.exhaust > VOLTAGE_ON_THRESHOLD,
    fan_active: voltages.fan > VOLTAGE_ON_THRESHOLD,
    pump_active: voltages.pump > VOLTAGE_ON_THRESHOLD,
    drain_active: voltages.drain > VOLTAGE_ON_THRESHOLD
  };
}
```

#### 2. Fan Speed Calculation (Non-Inverted for Cirrus)
```typescript
const FAN_VOLTAGE_0_SPEED = 0.5;    // 0V = 0% speed
const FAN_VOLTAGE_100_SPEED = 10.0; // 10V = 100% speed

function calculateFanSpeed(fanVoltage: number): number {
  if (fanVoltage >= FAN_VOLTAGE_0_SPEED && fanVoltage <= FAN_VOLTAGE_100_SPEED) {
    return Math.round(
      ((fanVoltage - FAN_VOLTAGE_0_SPEED) / 
       (FAN_VOLTAGE_100_SPEED - FAN_VOLTAGE_0_SPEED)) * 100
    );
  }
  return fanVoltage > FAN_VOLTAGE_100_SPEED ? 100 : 0;
}
```

#### 3. Derived Status Fields
```typescript
function computeDerivedFields(raw: RawReading) {
  const pickups = interpretPickups({
    exhaust: raw.exhaust_voltage,
    fan: raw.fan_voltage,
    pump: raw.pump_voltage,
    drain: raw.drain_voltage
  });
  
  return {
    // Temperature differential
    delta_t: Math.abs(raw.outside_temp - raw.inside_temp),
    
    // System states
    is_on: pickups.pump_active,  // Pump running = system ON
    fan_active: pickups.fan_active,
    exhaust_active: pickups.exhaust_active,
    pump_active: pickups.pump_active,
    drain_active: pickups.drain_active,
    
    // Cooling cycle detection
    is_cooling: pickups.pump_active || pickups.drain_active,
    
    // Fan speed percentage
    fan_speed: calculateFanSpeed(raw.fan_voltage),
    
    // Overall health status
    overall_status: determineOverallStatus(raw, pickups),
    
    // Connection tracking
    is_connected: true,
    last_seen: new Date().toISOString()
  };
}
```

#### 4. Status Determination
```typescript
function determineOverallStatus(
  raw: RawReading,
  pickups: PickupStates
): 'good' | 'warning' | 'error' {
  
  // CRITICAL ERRORS
  if (raw.motor_temp > 70.0) return 'error';  // Overheating
  if (raw.motor_temp < -50.0) return 'error'; // Sensor disconnected
  if (pickups.fan_active && raw.current < 0.5) return 'error'; // Motor failure
  if (pickups.pump_active && !raw.has_water) return 'error'; // Pump dry run
  
  // WARNINGS
  if (raw.motor_temp > 60.0) return 'warning'; // Running hot
  if (raw.motor_temp === -999.0) return 'warning'; // Sensor error
  
  // ALL GOOD
  return 'good';
}
```

---

## Implementation Checklist

### Phase 1: ESP32 (✅ Complete)
- [x] Remove all business logic from firmware
- [x] Send only raw sensor readings
- [x] Reduce JSON payload size
- [x] Update serial monitor output

### Phase 2: Server-Side (⏳ Pending)
- [ ] Update Edge Function to compute derived fields
- [ ] Update database trigger to handle raw-only inserts
- [ ] Add configurable thresholds table
- [ ] Implement voltage interpretation logic
- [ ] Add fan speed calculation
- [ ] Add overall status determination

### Phase 3: Dashboard (⏳ Pending)
- [ ] Ensure UI reads from `machines` table (not `readings_raw`)
- [ ] Add real-time connection status
- [ ] Add voltage graph visualization
- [ ] Test with live Cirrus device

### Phase 4: Advanced Features (📋 Future)
- [ ] Per-client threshold configuration
- [ ] Alert rules engine
- [ ] Historical data reprocessing
- [ ] Anomaly detection
- [ ] Predictive maintenance

---

## Example Server-Side Implementation

```sql
-- Supabase Database Trigger (replaces current trigger)
CREATE OR REPLACE FUNCTION process_raw_reading()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_delta_t FLOAT;
  v_fan_active BOOLEAN;
  v_pump_active BOOLEAN;
  v_drain_active BOOLEAN;
  v_exhaust_active BOOLEAN;
  v_is_on BOOLEAN;
  v_is_cooling BOOLEAN;
  v_fan_speed INT;
  v_overall_status TEXT;
BEGIN
  -- Interpret pickup voltages (12V logic)
  v_exhaust_active := NEW.exhaust_voltage > 6.0;
  v_fan_active := NEW.fan_voltage > 6.0;
  v_pump_active := NEW.pump_voltage > 6.0;
  v_drain_active := NEW.drain_voltage > 6.0;
  
  -- Compute derived fields
  v_delta_t := ABS(NEW.outside_temp - NEW.inside_temp);
  v_is_on := v_pump_active;
  v_is_cooling := v_pump_active OR v_drain_active;
  
  -- Calculate fan speed (non-inverted for Cirrus)
  IF NEW.fan_voltage >= 0.5 AND NEW.fan_voltage <= 10.0 THEN
    v_fan_speed := ROUND(((NEW.fan_voltage - 0.5) / (10.0 - 0.5)) * 100);
  ELSIF NEW.fan_voltage > 10.0 THEN
    v_fan_speed := 100;
  ELSE
    v_fan_speed := 0;
  END IF;
  
  -- Determine overall status
  IF NEW.motor_temp > 70.0 OR NEW.motor_temp < -50.0 THEN
    v_overall_status := 'error';
  ELSIF (v_fan_active AND NEW.current < 0.5) OR (v_pump_active AND NOT NEW.has_water) THEN
    v_overall_status := 'error';
  ELSIF NEW.motor_temp > 60.0 OR NEW.motor_temp = -999.0 THEN
    v_overall_status := 'warning';
  ELSE
    v_overall_status := 'good';
  END IF;
  
  -- Update machines table with computed values
  UPDATE machines
  SET 
    motor_temp = NEW.motor_temp,
    outside_temp = NEW.outside_temp,
    inside_temp = NEW.inside_temp,
    current = NEW.current,
    voltage = NEW.voltage,
    power = NEW.power,
    delta_t = v_delta_t,
    is_on = v_is_on,
    fan_active = v_fan_active,
    is_connected = true,
    overall_status = v_overall_status,
    is_cooling = v_is_cooling,
    has_water = NEW.has_water,
    exhaust_active = v_exhaust_active,
    pump_active = v_pump_active,
    drain_active = v_drain_active,
    fan_speed = v_fan_speed,
    exhaust_voltage = NEW.exhaust_voltage,
    fan_voltage = NEW.fan_voltage,
    pump_voltage = NEW.pump_voltage,
    drain_voltage = NEW.drain_voltage,
    last_seen = NOW(),
    updated_at = NOW()
  WHERE id = NEW.machine_id;
  
  RETURN NEW;
END;
$$;
```

---

## Testing Raw Data Flow

### 1. Verify ESP32 Payload
Connect serial monitor (115200 baud) and observe:
```
POST to Supabase (RAW DATA):
  URL: https://wjyanxstvbiqefmgpccb.supabase.co/functions/v1/esp32-data-receiver
  Machine ID: c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42
  Temps: Motor=23.5°C, Out=22.8°C, In=24.1°C
  Current: 1.25 A
```

### 2. Check Supabase readings_raw
```sql
SELECT 
  created_at,
  machine_id,
  motor_temp,
  current,
  fan_voltage,
  pump_voltage
FROM readings_raw
WHERE machine_id = 'your-machine-uuid'
ORDER BY created_at DESC
LIMIT 5;
```

### 3. Verify machines Table Update
```sql
SELECT 
  overall_status,
  is_connected,
  fan_speed,
  delta_t,
  last_seen
FROM machines
WHERE id = 'your-machine-uuid';
```

---

## Notes

- **Backward Compatibility**: Edge function currently expects old schema with computed fields. Update it to accept raw-only payloads.
- **HVAC Firmware**: Apply same raw-data-only changes to `ESP32_HVAC_CoolBreezeNexus_V2.ino` for consistency.
- **Voltage Calibration**: If pickups read incorrectly, adjust thresholds in server logic, not firmware.
- **Historical Reprocessing**: With raw data preserved, you can backfill `machines` by replaying `readings_raw` through updated logic.

---

## Quick Reference: 9 Raw Sensor Values

1. **Amps**: `current` (CT sensor)
2. **Temp 1**: `motor_temp` (DS18B20 #1)
3. **Temp 2**: `outside_temp` (DS18B20 #2)
4. **Temp 3**: `inside_temp` (DS18B20 #3)
5. **Water**: `has_water` (Float switch, boolean)
6. **Voltage 1**: `exhaust_voltage` (Yellow pickup)
7. **Voltage 2**: `fan_voltage` (Green pickup)
8. **Voltage 3**: `pump_voltage` (Brown pickup)
9. **Voltage 4**: `drain_voltage` (Black pickup)

*(Plus `voltage` = 230V constant and `power` = V×I)*

---

**End of Document**

