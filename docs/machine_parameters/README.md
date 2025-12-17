# Machine Parameters Documentation

This folder contains machine-specific parameters and configurations, plus a complete **Manufacturer Template System** for adding new machine types.

---

## 🚀 Quick Start: Adding a New Manufacturer

**Want to add a new manufacturer?** → Start here: [`QUICK_START.md`](./QUICK_START.md)

**3-Step Process:**
1. Open `NEW_MANUFACTURER_TEMPLATE.txt`
2. Fill in all sections (5-10 minutes)
3. Submit to AI for automated implementation (2 hours)

---

## 📁 Folder Structure

```
machine_parameters/
├── README.md (this file)
├── QUICK_START.md ⭐ START HERE to add new manufacturers
├── NEW_MANUFACTURER_TEMPLATE.txt ⭐ Fill this out
├── MANUFACTURER_TEMPLATE_SYSTEM.md (Complete technical reference)
├── IMPLEMENTATION_AUTOMATION_GUIDE.md (Detailed implementation steps)
│
├── cirrus/ (Example manufacturer)
│   ├── default_parameters.json
│   └── README.md
│
├── [future manufacturers]/
│   ├── default_parameters.json
│   └── README.md
```

---

## 📚 Documentation Files

| File | Purpose | Audience | Time |
|------|---------|----------|------|
| **QUICK_START.md** | Fast guide to adding manufacturers | Everyone | 2 min |
| **NEW_MANUFACTURER_TEMPLATE.txt** | Fill-in template | Implementation | 10 min |
| **MANUFACTURER_TEMPLATE_SYSTEM.md** | Complete technical specification | Technical | 15 min |
| **IMPLEMENTATION_AUTOMATION_GUIDE.md** | Step-by-step implementation details | Developers | 10 min |

---

## 🏭 Existing Manufacturers

### Currently Supported:

#### Cirrus (Evaporative Coolers)
- **Documentation**: [`cirrus/README.md`](./cirrus/README.md)
- **Defaults**: [`cirrus/default_parameters.json`](./cirrus/default_parameters.json)
- **Sensors**: Motor temp, ambient temp, duct temp, current, 4 voltage inputs, water float
- **Alerts**: 7 total (motor overheating, overcurrent, fan failure, ineffective cooling, low water, dump valve, pump failure)

### Coming Soon:
- CoolBreeze (Evaporative Coolers & Air Conditioners)
- Alliance (Heat Pumps)

---

## 📊 Parameter Types

### 1. Alert Thresholds
**Stored in:** `machine_alert_config` table  
**Configurable per machine via UI**

- Temperature thresholds (motor, compressor)
- Current thresholds (motor amps, compressor amps)
- Delta T thresholds (min/max)
- Duration thresholds (how long before alerting)
- Email settings (reminder interval, recovery emails)

**Default values** come from manufacturer's `default_parameters.json`

### 2. Voltage Input Configuration
**Stored in:** `machine_voltage_config` table  
**Configurable per machine**

- Maps `voltage_input_1` through `voltage_input_6` to functions
- Functions: fan, pump, drain, exhaust, compressor, etc.
- Voltage active threshold (default 6.0V for 12V logic)
- Used to calculate: `fan_active`, `pump_active`, `is_cooling`, etc.

### 3. Machine-Specific Defaults
**Stored in:** JSON files per manufacturer  
**Used as templates when creating new machines**

- Default alert thresholds
- Default voltage mappings
- Default operational parameters (connection timeout, data retention, update interval)
- Sensor validation ranges

### 4. Historical Graph Configuration
**Defined in:** Manufacturer template  
**Rendered by:** `MachineDetailView.tsx`

- Line plots (temperature, current, power, etc.)
- Status bars (fan, cooling, water, etc.)
- Colors, labels, units
- Y-axis configuration

### 5. UI Customizations
**Defined in:** Manufacturer template  
**Implemented in:** Frontend components

- Machine card layout (status lights, primary display)
- Expanded card sections (fields, labels, formatting)
- Alert thresholds editor layout

---

## 🔧 Adding a New Manufacturer

### Prerequisites
- Understanding of machine's sensors and logic
- Knowledge of alert conditions
- Desired historical graph layout

### Process

1. **Fill Template** (10 minutes)
   - Open `NEW_MANUFACTURER_TEMPLATE.txt`
   - Fill in all 7 sections
   - Save as `[ManufacturerName]_TEMPLATE_FILLED.txt`

2. **Submit for Implementation** (30 seconds)
   ```
   @[ManufacturerName]_TEMPLATE_FILLED.txt
   Implement this new manufacturer
   ```

3. **Automated Implementation** (~2 hours)
   - Database tables created
   - Configuration files updated
   - Frontend components modified
   - Alert system configured
   - Documentation generated

4. **Testing** (15 minutes)
   - Create test machine
   - Verify data ingestion
   - Check graph display
   - Test alert configuration

### What Gets Created

**Database:**
- `[manufacturer]_raw` table (raw sensor data)
- `[manufacturer]_calculated` table (processed data)
- Processing trigger (raw → calculated)
- RLS policies
- Default alert configuration

**Frontend:**
- Manufacturer in dropdown (`AddMachineDialog.tsx`)
- Custom alert sections (`AlertThresholdsEditor.tsx`)
- Status lights layout (`MachineCard.tsx`)
- Historical graph config (`MachineDetailView.tsx`)
- Data fetching logic (`historicalData.ts`)

**Configuration:**
- `machineConfig.ts` updated
- `default_parameters.json` created
- `README.md` created

**Alert System:**
- Alert monitoring function/trigger
- Email notification templates
- Duration tracking logic

### Example: Minimal Template

Here's what you need for a basic evaporative cooler:

```
Manufacturer: SimpleCooler
Sensors: motor_temp, ambient_temp, duct_temp, current, fan, pump, has_water
Logic: delta_t = ABS(ambient - duct), fan_active = voltage_1 > 6V
Alerts: Motor overheating (>70°C for 15min), Ineffective cooling (delta_t <2°C for 30min)
Graph: 4 lines (temps, current), 3 bars (fan, cooling, water)
```

**Total time:** 3 minutes to define → 2 hours to implement → Fully functional!

---

## 🎯 Template Sections Explained

| Section | What to Define | Example |
|---------|----------------|---------|
| **1. Metadata** | Name, type, description | "Acme CoolMaster, evaporative" |
| **2. Sensors** | All physical sensors and voltage inputs | motor_temp (°C, -20 to 120) |
| **3. Logic** | Calculated fields and formulas | delta_t = ABS(ambient - duct) |
| **4. Alerts** | Alert conditions, thresholds, durations | motor_temp > 70°C for 15 min |
| **5. Graph** | Lines, bars, colors, positions | Red line for motor temp at top |
| **6. UI** | Card layout, expanded view sections | Show Delta T large in center |
| **7. Notes** | Special requirements or behavior | Uses custom pump algorithm |

---

## 💡 Real-World Examples

### Cirrus Evaporative Cooler
- **Sensors**: 3 temps, 1 current, 4 voltage inputs, 1 boolean
- **Logic**: Fan/pump detection via voltage, delta T calculation
- **Alerts**: 7 types (overheating, overcurrent, inefficiency, water system)
- **Graph**: 5 lines, 4 status bars
- **Special**: Dump valve and pump monitoring

### Future: Alliance Heat Pump
- **Sensors**: Compressor temp, inlet/outlet temps, compressor current
- **Logic**: Heating detection, setpoint tracking, excessive heating check
- **Alerts**: 6 types (overheating, inefficiency, setpoint deviation)
- **Graph**: Temperature lines with setpoint reference, heating status bar
- **Special**: Setpoint tolerance zone visualization

---

## 🔍 How Parameters Are Used

### During Machine Creation
1. User selects manufacturer
2. System loads `default_parameters.json`
3. Creates entry in `machine_alert_config` with defaults
4. Creates entry in `machine_voltage_config` with defaults
5. User can customize before saving

### During Operation
1. ESP32 sends raw data → `[manufacturer]_raw` table
2. Trigger processes → `[manufacturer]_calculated` table
3. Alert system checks calculated data against thresholds
4. Frontend fetches calculated data for display
5. Graph renders using manufacturer's configuration

### During Alert Evaluation
1. Alert monitoring checks calculated table every 5 minutes
2. Compares values against `machine_alert_config` thresholds
3. Tracks duration of threshold breaches
4. Triggers email when duration exceeded
5. Resolves alert when condition clears

---

## 🗄️ Database Tables

### Shared Tables (All Manufacturers)
- `machines` - Machine registry
- `machine_alert_config` - Per-machine alert thresholds
- `machine_voltage_config` - Per-machine voltage input mappings
- `machine_notification_preferences` - Who gets notified
- `machine_connection_status` - Connection tracking

### Manufacturer-Specific Tables
- `[manufacturer]_raw` - Raw sensor data (2 weeks retention)
- `[manufacturer]_calculated` - Processed data (1 year retention)

### Data Flow
```
ESP32 → [manufacturer]_raw → Trigger → [manufacturer]_calculated → Frontend
                               ↓
                          Alert System → Emails
```

---

## 📖 Related Documentation

### Supabase
- [`supabase/migrations/000_COMPLETE_DATABASE_SCHEMA.sql`](../../supabase/migrations/000_COMPLETE_DATABASE_SCHEMA.sql) - Complete database schema
- [`docs/supabase/DATA_FLOW_ARCHITECTURE.md`](../supabase/DATA_FLOW_ARCHITECTURE.md) - Data flow and triggers

### Frontend
- [`docs/frontend/MACHINE_SUBCATEGORY_SETUP.md`](../frontend/MACHINE_SUBCATEGORY_SETUP.md) - Adding new subcategories
- [`docs/frontend/HISTORICAL_DATA_SETUP.md`](../frontend/HISTORICAL_DATA_SETUP.md) - Historical graph setup

### Alerts
- [`docs/general/COMPLETE_ALERT_PARAMETERS.md`](../general/COMPLETE_ALERT_PARAMETERS.md) - All alert types documented
- [`docs/general/SESSION_PROGRESS_2025-11-08.md`](../general/SESSION_PROGRESS_2025-11-08.md) - Alert system implementation

---

## 🚀 Getting Started

**New to the system?**
1. Read [`QUICK_START.md`](./QUICK_START.md) (2 minutes)
2. Review [`cirrus/README.md`](./cirrus/README.md) as example (5 minutes)
3. Open `NEW_MANUFACTURER_TEMPLATE.txt` and start filling (10 minutes)

**Want to understand the system deeply?**
1. Read [`MANUFACTURER_TEMPLATE_SYSTEM.md`](./MANUFACTURER_TEMPLATE_SYSTEM.md) (15 minutes)
2. Read [`IMPLEMENTATION_AUTOMATION_GUIDE.md`](./IMPLEMENTATION_AUTOMATION_GUIDE.md) (10 minutes)
3. Study existing code in `src/components/AlertThresholdsEditor.tsx`

**Ready to add a manufacturer?**
```
Open NEW_MANUFACTURER_TEMPLATE.txt and fill it out!
```

---

## ❓ FAQ

**Q: How long does it take to add a manufacturer?**  
A: 10 minutes to fill template + 2 hours automated implementation.

**Q: Can I customize the graph later?**  
A: Yes! Just provide updated graph configuration.

**Q: What if my machine has unique sensors?**  
A: Template is flexible - add any sensors your machine uses.

**Q: Can multiple manufacturers share the same database tables?**  
A: No, each manufacturer gets separate tables for data isolation.

**Q: How do I test before deploying to production?**  
A: Create a test machine, send sample data, verify all displays work.

---

## 📞 Support

Need help? Ask:
- "Show me how to fill the manufacturer template"
- "What sensors should I include for [machine type]?"
- "How do I define a custom alert?"
- "Can you show me the Cirrus example?"

---

**Ready to add a new manufacturer?** → [`QUICK_START.md`](./QUICK_START.md) ⭐


