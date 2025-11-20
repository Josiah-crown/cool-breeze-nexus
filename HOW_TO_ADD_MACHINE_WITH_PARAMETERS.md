# How to Add a New Machine with Custom Parameters

## ✅ Yes, You Can Add Machines from the Frontend!

The website has a built-in "Add Machine" dialog that you can use.

---

## 📋 Step-by-Step: Adding a Machine

### 1. **Open the Add Machine Dialog**

**From Dashboard:**
- Click the **"Add Machine"** button in the top navigation bar
- Or if you're a Super Admin/Company/Installer, you'll see it in your dashboard

### 2. **Fill in Basic Information**

The dialog asks for:
- **Machine Name** - Give it a descriptive name (e.g., "Main Office Cooler")
- **Machine Type** - Select from:
  - Evaporative Cooler
  - Heat Pump
  - Air Conditioner
- **Manufacturer** - If multiple manufacturers available for the type, select one:
  - Cirrus (for evaporative)
  - CoolBreeze (for evaporative)
  - Or others depending on type
- **API Endpoint** (Optional) - If the machine can receive API commands
- **Assign To** - Assign to yourself or another user (if you have permission)

### 3. **Create the Machine**

- Click **"Create Machine"**
- The system will:
  - Generate an API key (save this for your ESP32!)
  - Create the machine record
  - **Automatically create default voltage config** (via trigger)
  - Create default alert thresholds (if configured)

---

## ⚙️ Configuring Parameters After Creation

After creating a machine, you can configure custom parameters:

### **1. Alert Thresholds** (Per-Machine Settings)

**How to Access:**
1. Click on the machine card to open the detail view
2. Look for **"Alert Thresholds"** panel (usually on the right side)
3. Click to expand it

**What You Can Configure:**
- **Motor Temperature:**
  - Warning threshold (e.g., 60°C)
  - Critical threshold (e.g., 70°C)
- **Current/Amps:**
  - Motor amps warning (e.g., 15A)
  - Compressor amps warning (for AC/Heat Pump)
- **Delta T (Temperature Difference):**
  - Minimum cooling delta (e.g., 2°C)
  - Minimum/maximum heating delta (for heat pumps)
- **Setpoint Tolerance** (for heat pumps)
- **Duration Thresholds:**
  - How long before alert triggers (e.g., 5 minutes)
  - For various conditions (motor temp, cooling ineffective, etc.)
- **Email Settings:**
  - Reminder interval (hours)
  - Send recovery emails (when alert resolves)

**How to Save:**
- Click **"Save"** button in the Alert Thresholds panel
- Changes are saved immediately

---

### **2. Voltage Input Configuration** (For Evaporative Coolers)

**What It Does:**
- Maps which voltage input (1-4) corresponds to which function
- Allows different machines to have different GPIO mappings
- Example: Input 1 = Fan, Input 2 = Pump, Input 3 = Drain, Input 4 = Exhaust

**Current Status:**
- ✅ **Auto-created** when machine is created (default mapping)
- ⚠️ **No UI yet** - Currently needs to be updated via Supabase SQL Editor

**Default Mapping (Auto-Created):**
- Input 1 → Fan
- Input 2 → Pump
- Input 3 → Drain
- Input 4 → Exhaust
- Voltage Threshold: 6.0V (12V logic)

**To Change Voltage Mapping (Currently Manual):**

1. Go to Supabase Dashboard → SQL Editor
2. Run this query (replace `MACHINE_ID` and adjust as needed):

```sql
UPDATE public.machine_voltage_config
SET 
  voltage_input_1_function = 'fan',      -- or 'pump', 'drain', 'exhaust', 'unused'
  voltage_input_2_function = 'pump',     -- adjust based on your wiring
  voltage_input_3_function = 'drain',
  voltage_input_4_function = 'exhaust',
  voltage_active_threshold = 6.0         -- voltage above this = active
WHERE machine_id = 'YOUR_MACHINE_ID_HERE';
```

**Note:** We could add a UI for this in the future if needed!

---

### **3. Location** (Can Be Updated)

**How to Update:**
1. Click on machine card → Detail view
2. Look for location field
3. Click to edit
4. Enter new location
5. Save

---

### **4. Temperature Setpoint** (For Heat Pumps)

**How to Set:**
1. Click on machine card → Detail view
2. Look for temperature setpoint field
3. Set desired temperature (0-75°C)
4. Save

---

## 🎯 Complete Workflow Example

### **Scenario: Adding a New Cirrus Evaporative Cooler with Custom Thresholds**

1. **Add Machine:**
   - Click "Add Machine"
   - Name: "Warehouse Unit 3"
   - Type: Evaporative Cooler
   - Manufacturer: Cirrus
   - Assign to: Yourself
   - Click "Create Machine"
   - **Save the API key!**

2. **Configure Alert Thresholds:**
   - Click on the new machine card
   - Open "Alert Thresholds" panel
   - Set custom values:
     - Motor Temp Warning: 65°C (higher than default)
     - Motor Temp Critical: 75°C
     - Motor Amps Warning: 18A (for larger motor)
     - Delta T Min Cooling: 3°C
   - Click "Save"

3. **Update Voltage Mapping (if different wiring):**
   - Go to Supabase SQL Editor
   - Update `machine_voltage_config` for this machine
   - (Or use default if standard wiring)

4. **Set Location:**
   - Click on machine → Edit location
   - Enter: "Warehouse, Bay 3"
   - Save

5. **Configure ESP32:**
   - Use the API key from step 1
   - Point ESP32 to your Supabase endpoint
   - Start sending data!

---

## 📊 What Gets Created Automatically

When you create a machine, these are **automatically created**:

1. ✅ **Machine record** in `machines` table
2. ✅ **API key** (generated automatically)
3. ✅ **Voltage config** in `machine_voltage_config` table (default mapping)
4. ✅ **Alert config** in `machine_alert_config` table (with default thresholds)

**Default Alert Thresholds** (if not customized):
- Motor Temp Warning: 60°C
- Motor Temp Critical: 70°C
- Motor Amps Warning: 15A
- Delta T Min Cooling: 2°C
- (And other defaults based on machine type)

---

## 🔧 Parameters You Can Configure

### **From Frontend (Website):**
- ✅ Machine name
- ✅ Machine type
- ✅ Manufacturer
- ✅ Location
- ✅ Alert thresholds (all of them)
- ✅ Temperature setpoint (heat pumps)
- ✅ Notification settings

### **Currently Manual (SQL Editor):**
- ⚠️ Voltage input mapping (could add UI later)
- ⚠️ Voltage threshold (could add UI later)

---

## 💡 Tips

1. **Save API Key Immediately:**
   - The API key is shown once when creating the machine
   - Copy it right away - you'll need it for ESP32

2. **Configure Thresholds Before Going Live:**
   - Set up alert thresholds before connecting ESP32
   - This ensures alerts work correctly from the start

3. **Test with Defaults First:**
   - Default voltage mapping works for standard Cirrus wiring
   - Only change if your wiring is different

4. **Location is Helpful:**
   - Set location for easy identification
   - Useful when managing many machines

---

## 🚀 Quick Reference

**To Add Machine:**
1. Dashboard → "Add Machine" button
2. Fill in form
3. Save API key
4. Configure thresholds
5. Connect ESP32

**To Configure Parameters:**
1. Click machine card
2. Open detail view
3. Find parameter panel (Alert Thresholds, etc.)
4. Edit values
5. Save

---

**Last Updated:** November 20, 2025  
**Status:** ✅ Frontend machine creation fully functional

