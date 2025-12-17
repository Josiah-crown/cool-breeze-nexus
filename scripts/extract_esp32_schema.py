#!/usr/bin/env python3
"""
ESP32 Schema Contract Generator
Automatically extracts schema information from ESP32 .ino files
and generates schema contract markdown documents.

Usage:
    python scripts/extract_esp32_schema.py hardware/esp32/ESP32_Cirrus_Optimized_2Min/ESP32_Cirrus_Optimized_2Min.ino

Output:
    Generates or updates: docs/machine_parameters/[manufacturer]/ESP32_SCHEMA_CONTRACT.md
"""

import re
import sys
import os
from datetime import datetime
from pathlib import Path


def extract_firmware_version(content):
    """Extract firmware version from ESP32 code."""
    match = re.search(r'const String FIRMWARE_VERSION\s*=\s*"([^"]+)"', content)
    if match:
        return match.group(1)
    
    # Try alternative pattern
    match = re.search(r'VERSION:\s*([^\s]+)', content, re.MULTILINE)
    if match:
        return match.group(1)
    
    return "Unknown"


def extract_device_id(content):
    """Extract device ID/manufacturer name from ESP32 code."""
    match = re.search(r'const String DEVICE_ID\s*=\s*"([^"]+)"', content)
    if match:
        return match.group(1)
    return "Unknown"


def extract_json_payload(content):
    """Extract JSON payload structure from ESP32 code."""
    # Find the sendToSupabase or similar function
    payload_pattern = r'doc\["([^"]+)"\]\s*=\s*([^;]+);'
    matches = re.findall(payload_pattern, content)
    
    payload = {}
    for field, value in matches:
        # Clean up value
        value = value.strip()
        payload[field] = {
            'value': value,
            'type': infer_type(value)
        }
    
    return payload


def infer_type(value):
    """Infer data type from variable name or value."""
    value_lower = value.lower()
    
    if 'temp' in value_lower:
        return 'float (°C)'
    elif 'current' in value_lower:
        return 'float (A)'
    elif 'voltage' in value_lower:
        return 'float (V)'
    elif 'power' in value_lower:
        return 'float (W)'
    elif 'water' in value_lower or 'tank' in value_lower:
        return 'boolean'
    elif 'count' in value_lower:
        return 'integer'
    elif 'id' in value_lower:
        return 'string (UUID)'
    else:
        return 'unknown'


def extract_gpio_pins(content):
    """Extract GPIO pin definitions from ESP32 code."""
    gpio_pattern = r'const int\s+(\w+)\s*=\s*(\d+);'
    matches = re.findall(gpio_pattern, content)
    
    gpios = []
    for name, pin in matches:
        if 'GPIO' in name or 'PIN' in name or 'CT' in name or 'FLOAT' in name:
            gpios.append({
                'name': name,
                'pin': pin,
                'function': extract_function_from_name(name)
            })
    
    return gpios


def extract_function_from_name(name):
    """Extract function description from GPIO variable name."""
    name_lower = name.lower()
    
    if 'motor' in name_lower and 'temp' in name_lower:
        return 'Motor Temperature Sensor'
    elif 'exterior' in name_lower or 'outside' in name_lower:
        return 'Exterior/Ambient Temperature Sensor'
    elif 'interior' in name_lower or 'inside' in name_lower:
        return 'Interior/Duct Temperature Sensor'
    elif 'ct' in name_lower:
        return 'Current Transformer (CT Clamp)'
    elif 'float' in name_lower:
        return 'Water Float Switch'
    elif 'fan' in name_lower:
        return 'Fan Control Signal'
    elif 'pump' in name_lower:
        return 'Pump Control Signal'
    elif 'drain' in name_lower:
        return 'Drain Control Signal'
    elif 'exhaust' in name_lower:
        return 'Exhaust Control Signal'
    else:
        return 'Unknown Function'


def extract_constants(content):
    """Extract important constants from ESP32 code."""
    constants = {}
    
    # Timing constants
    patterns = {
        'sensor_read_interval': r'const unsigned long SENSOR_READ_INTERVAL\s*=\s*(\d+)',
        'data_send_interval': r'const unsigned long DATA_SEND_INTERVAL\s*=\s*(\d+)',
        'auto_reset_interval': r'const unsigned long AUTO_RESET_INTERVAL\s*=\s*(\d+)',
        'watchdog_timeout': r'const unsigned long WATCHDOG_TIMEOUT\s*=\s*(\d+)',
    }
    
    for key, pattern in patterns.items():
        match = re.search(pattern, content)
        if match:
            constants[key] = int(match.group(1))
    
    # Calibration constants
    cal_patterns = {
        'ct_calibration': r'const float (?:CT_)?CALIBRATION\s*=\s*([0-9.]+)',
        'line_voltage': r'const float LINE_VOLTAGE\s*=\s*([0-9.]+)',
    }
    
    for key, pattern in cal_patterns.items():
        match = re.search(pattern, content)
        if match:
            constants[key] = float(match.group(1))
    
    return constants


def extract_supabase_config(content):
    """Extract Supabase configuration from ESP32 code."""
    config = {}
    
    url_match = re.search(r'const char\*\s+SUPABASE_URL\s*=\s*"([^"]+)"', content)
    if url_match:
        config['url'] = url_match.group(1)
    
    # Extract function endpoint
    func_patterns = [
        r'supabaseFunction\s*=\s*"([^"]+)"',
        r'/functions/v1/([^"]+)"',
    ]
    for pattern in func_patterns:
        match = re.search(pattern, content)
        if match:
            config['function'] = match.group(1)
            break
    
    return config


def generate_schema_contract_md(ino_file, output_file):
    """Generate schema contract markdown from .ino file."""
    
    print(f"📖 Reading: {ino_file}")
    with open(ino_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract all information
    firmware_version = extract_firmware_version(content)
    device_id = extract_device_id(content)
    payload = extract_json_payload(content)
    gpios = extract_gpio_pins(content)
    constants = extract_constants(content)
    supabase_config = extract_supabase_config(content)
    
    print(f"✅ Extracted:")
    print(f"   - Firmware: {firmware_version}")
    print(f"   - Device: {device_id}")
    print(f"   - Payload fields: {len(payload)}")
    print(f"   - GPIO pins: {len(gpios)}")
    
    # Generate markdown
    md = f"""# {device_id} ESP32 ↔ Database Schema Contract

**Auto-Generated from:** `{os.path.relpath(ino_file)}`  
**Firmware Version:** {firmware_version}  
**Schema Version:** 1.0  
**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  
**Compatibility:** ✅ COMPATIBLE (if no breaking changes)

---

## 📡 ESP32 Output Format

### Endpoint:
```
POST {supabase_config.get('url', 'Unknown')}/functions/v1/{supabase_config.get('function', 'esp32-data-receiver')}
```

### Headers:
```
Content-Type: application/json
apikey: [SUPABASE_ANON_KEY]
Authorization: Bearer [machine-api-key]
```

### JSON Payload Structure:
```json
{{
"""
    
    # Add payload fields
    for field, info in payload.items():
        md += f'  "{field}": {info["value"]},  // {info["type"]}\n'
    
    md += """}
```

---

## 📍 GPIO Pin Assignments

| GPIO Pin | Variable Name | Function |
|----------|---------------|----------|
"""
    
    # Add GPIO pins
    for gpio in sorted(gpios, key=lambda x: int(x['pin'])):
        md += f"| **GPIO {gpio['pin']}** | {gpio['name']} | {gpio['function']} |\n"
    
    md += """
---

## ⏱️ Timing Configuration

"""
    
    if constants:
        md += "| Setting | Value | Description |\n"
        md += "|---------|-------|--------------|\n"
        
        if 'sensor_read_interval' in constants:
            val = constants['sensor_read_interval']
            md += f"| Sensor Read Interval | {val}ms ({val/1000}s) | How often sensors are read |\n"
        
        if 'data_send_interval' in constants:
            val = constants['data_send_interval']
            md += f"| Data Send Interval | {val}ms ({val/1000}s) | How often data is transmitted |\n"
        
        if 'auto_reset_interval' in constants:
            val = constants['auto_reset_interval']
            md += f"| Auto Reset Interval | {val}ms ({val/3600000}hrs) | Automatic restart interval |\n"
        
        if 'watchdog_timeout' in constants:
            val = constants['watchdog_timeout']
            md += f"| Watchdog Timeout | {val}s | Watchdog timer duration |\n"
    
    md += """
---

## 🔧 Calibration Constants

"""
    
    if 'ct_calibration' in constants:
        md += f"- **CT Calibration:** {constants['ct_calibration']}\n"
    
    if 'line_voltage' in constants:
        md += f"- **Line Voltage:** {constants['line_voltage']}V (hardcoded)\n"
    
    md += """
---

## ✅ Compatibility Checklist

Before deploying ESP32 firmware changes:

- [ ] All fields in JSON payload match database columns
- [ ] Field names are identical (case-sensitive)
- [ ] Data types match
- [ ] GPIO pin assignments documented
- [ ] Version numbers updated
- [ ] This contract updated
- [ ] Database migration created (if schema changed)
- [ ] Frontend updated (if new fields to display)
- [ ] Tested end-to-end

---

## 📝 Change Log

| Date | Firmware | Changes |
|------|----------|---------|
| {datetime.now().strftime('%Y-%m-%d')} | {firmware_version} | Auto-generated from source code |

---

**⚠️ This document was auto-generated from the ESP32 source code.**  
**To regenerate: `python scripts/extract_esp32_schema.py {os.path.relpath(ino_file)}`**  
**Manual edits may be overwritten!**
"""
    
    # Write output
    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(md)
    
    print(f"📝 Generated: {output_file}")
    print(f"✅ Schema contract created successfully!")


def main():
    if len(sys.argv) < 2:
        print("Usage: python extract_esp32_schema.py <path_to_ino_file>")
        print("\nExample:")
        print("  python scripts/extract_esp32_schema.py hardware/esp32/ESP32_Cirrus_Optimized_2Min/ESP32_Cirrus_Optimized_2Min.ino")
        sys.exit(1)
    
    ino_file = sys.argv[1]
    
    if not os.path.exists(ino_file):
        print(f"❌ Error: File not found: {ino_file}")
        sys.exit(1)
    
    # Determine manufacturer from file path or content
    device_id = None
    with open(ino_file, 'r', encoding='utf-8') as f:
        content = f.read()
        match = re.search(r'const String DEVICE_ID\s*=\s*"([^"]+)"', content)
        if match:
            device_id = match.group(1).lower()
    
    if not device_id:
        print("❌ Error: Could not determine device ID from .ino file")
        print("   Make sure the file contains: const String DEVICE_ID = \"...\"")
        sys.exit(1)
    
    # Determine output file
    output_file = f"docs/machine_parameters/{device_id}/ESP32_SCHEMA_CONTRACT_AUTO.md"
    
    print(f"\n🔍 ESP32 Schema Extractor")
    print(f"=" * 50)
    
    generate_schema_contract_md(ino_file, output_file)
    
    print(f"\n" + "=" * 50)
    print(f"✅ Done! Schema contract saved to: {output_file}")
    print(f"\n💡 Next steps:")
    print(f"   1. Review the generated contract")
    print(f"   2. Compare with database schema")
    print(f"   3. Update database if needed")
    print(f"   4. Update frontend if new fields added")


if __name__ == "__main__":
    main()

