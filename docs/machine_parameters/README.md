# Machine Parameters Documentation

This folder contains machine-specific parameters and configurations.

## Structure

```
machine_parameters/
├── README.md (this file)
├── cirrus/
│   ├── default_parameters.json
│   └── README.md
├── heatpump/
│   ├── default_parameters.json
│   └── README.md
└── airconditioner/
    ├── default_parameters.json
    └── README.md
```

## Parameter Types

### 1. Alert Thresholds
Stored in: `machine_alert_config` table
- Temperature thresholds (motor, compressor)
- Current thresholds (motor amps, compressor amps)
- Delta T thresholds
- Duration thresholds

### 2. Voltage Input Configuration
Stored in: `machine_voltage_config` table
- Maps voltage_input_1-4 to functions (fan, pump, drain, exhaust)
- Voltage active threshold (default 6.0V for 12V logic)

### 3. Machine-Specific Defaults
Stored in: JSON files per machine type
- Default alert thresholds
- Default voltage mappings
- Default operational parameters

## Usage

Parameters are stored in the database and can be:
1. Set per-machine via UI
2. Loaded from default JSON files
3. Updated via API

## See Also

- `supabase/migrations/20251108000001_add_alert_system.sql` - Alert thresholds
- `supabase/migrations/20250108000007_create_machine_voltage_config.sql` - Voltage config


