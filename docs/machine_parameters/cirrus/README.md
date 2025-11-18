# Cirrus Evaporative Cooler Parameters

## Default Configuration

### Voltage Input Mapping
- **Input 1**: Fan (Green wire - GPIO 35)
- **Input 2**: Pump (Brown wire - GPIO 32)
- **Input 3**: Drain (Black wire - GPIO 33)
- **Input 4**: Exhaust (Yellow wire - GPIO 34)
- **Active Threshold**: 6.0V (12V logic)

### Alert Thresholds
- **Motor Temp Warning**: 60°C
- **Motor Temp Critical**: 70°C
- **Motor Amps Warning**: 15A
- **Delta T Min Cooling**: 2°C (minimum for effective cooling)
- **Connection Timeout**: 10 minutes (no data = disconnected)

### Operational Parameters
- **Update Interval**: 120 seconds (2 minutes)
- **Data Retention**: 365 days (1 year)
- **Connection Timeout**: 10 minutes

## Calculations Performed in Supabase

1. **Delta T**: `ABS(outside_temp - inside_temp)`
2. **Fan Active**: `voltage_input_1 > voltage_active_threshold`
3. **Pump Active**: `voltage_input_2 > voltage_active_threshold`
4. **Drain Active**: `voltage_input_3 > voltage_active_threshold`
5. **Exhaust Active**: `voltage_input_4 > voltage_active_threshold`
6. **Is On**: `pump_active = true`
7. **Is Cooling**: `pump_active = true OR drain_active = true`
8. **Power**: `voltage × current` (if not provided)
9. **Connection Status**: Last reading within 10 minutes = connected

## Status Calculations

- **Overall Status**: Based on water, motor temp, and cooling efficiency
- **Motor Status**: Based on motor_temp vs thresholds
- **Water Status**: Based on has_water boolean
- **Cooling Status**: Based on delta_t and active components


