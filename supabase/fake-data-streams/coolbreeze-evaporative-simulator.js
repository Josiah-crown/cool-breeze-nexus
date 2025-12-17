/**
 * CoolBreeze Evaporative Cooler Data Simulator
 * 
 * Simulates realistic data for a CoolBreeze evaporative cooler
 * Posts data every 30 seconds to the Supabase edge function
 * 
 * CoolBreeze Evaporative Logic:
 * - Water yes/no: has_water + GPIO5 (voltage_input_5) = float switch
 * - Temperature 1 (in): outside_temp = inlet/ambient
 * - Temperature 2 (out): inside_temp = outlet/duct  
 * - Temperature 3 (fan motor): motor_temp = fan motor temp
 * - CT readings: current + voltage
 * - Fan: voltage_input_1 (voltage pickup)
 * - Exhaust (reverse): voltage_input_4 (voltage pickup)
 * - Pump: voltage_input_2 (voltage pickup, cooling indicator)
 * - Solenoid (dump valve): voltage_input_3 (voltage pickup, drain)
 */

// ========================================
// CONFIGURATION - UPDATE THESE VALUES
// ========================================
const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // e.g., https://xxxxx.supabase.co
const MACHINE_ID = 'YOUR_MACHINE_UUID';
const API_KEY = 'YOUR_API_KEY';
const POST_INTERVAL = 30000; // 30 seconds

// ========================================
// DATA GENERATION
// ========================================

/**
 * Generates realistic sensor data for CoolBreeze evaporative cooler
 */
function generateCoolBreezeEvaporativeData() {
  // Time-based simulation for realistic cycles
  const now = Date.now();
  const cycleTime = (now / 1000) % 1200; // 20-minute cycle
  
  // Simulate cooling cycles (on for 15 minutes, off for 5 minutes)
  const isCooling = cycleTime < 900;
  
  // Water cycles (simulate filling/draining)
  const waterCycleTime = (now / 1000) % 1800; // 30-minute water cycle
  const hasWater = waterCycleTime < 1620; // Water for 27 minutes, empty for 3 minutes
  
  // Temperature readings
  const outsideTemp = 35 + Math.random() * 5; // 35-40°C (hot day)
  
  // Inside temp drops when cooling with water
  const insideTemp = isCooling && hasWater
    ? outsideTemp - 8 - Math.random() * 4  // Cooling: -8 to -12°C delta
    : outsideTemp - Math.random() * 2;      // Not cooling: minimal delta
  
  const motorTemp = isCooling
    ? 50 + Math.random() * 10  // 50-60°C when running
    : 35 + Math.random() * 5;   // 35-40°C when idle
  
  // Electrical readings
  const current = isCooling
    ? 3 + Math.random() * 2      // 3-5A when running
    : 0.2 + Math.random() * 0.3;  // 0.2-0.5A when idle
  
  const voltage = 230 + Math.random() * 10 - 5; // 225-235V
  
  // Voltage inputs (12V logic)
  // CoolBreeze format uses named voltages that get mapped
  const fanActive = isCooling;
  const pumpActive = isCooling && hasWater; // Pump only runs when water available
  const drainActive = !hasWater && (waterCycleTime > 1620 && waterCycleTime < 1650); // Drain for 30 seconds
  
  // Exhaust (reverse) is typically used less frequently - simulate occasional use
  const exhaustCycleTime = (now / 1000) % 3600; // 1-hour cycle
  const exhaustActive = exhaustCycleTime < 300; // Active for 5 minutes per hour
  
  // Using voltage_input naming (edge function maps both formats)
  const voltage_input_1 = fanActive ? 11 + Math.random() : 0.1; // Fan
  const voltage_input_2 = pumpActive ? 11.5 + Math.random() * 0.5 : 0.1; // Pump (cooling)
  const voltage_input_3 = drainActive ? 11 + Math.random() * 0.5 : 0.1; // Solenoid/Drain
  const voltage_input_4 = exhaustActive ? 11.2 + Math.random() * 0.5 : 0.1; // Exhaust (reverse)
  const voltage_input_5 = hasWater ? 11.8 + Math.random() * 0.5 : 0.2; // GPIO5 - Float switch
  
  return {
    machine_id: MACHINE_ID,
    motor_temp: parseFloat(motorTemp.toFixed(2)),
    inside_temp: parseFloat(insideTemp.toFixed(2)),    // Duct temp (cool air)
    outside_temp: parseFloat(outsideTemp.toFixed(2)),  // Ambient temp (hot air)
    current: parseFloat(current.toFixed(2)),
    voltage: parseFloat(voltage.toFixed(2)),
    power: parseFloat((voltage * current).toFixed(2)),
    has_water: hasWater,
    voltage_input_1: parseFloat(voltage_input_1.toFixed(2)), // Fan
    voltage_input_2: parseFloat(voltage_input_2.toFixed(2)), // Pump (cooling)
    voltage_input_3: parseFloat(voltage_input_3.toFixed(2)), // Solenoid/Drain
    voltage_input_4: parseFloat(voltage_input_4.toFixed(2)), // Exhaust (reverse)
    voltage_input_5: parseFloat(voltage_input_5.toFixed(2)), // GPIO5 - Float switch (water yes/no)
    sensor_read_count: 10 // Number of readings averaged
  };
}

/**
 * Posts data to Supabase edge function
 */
async function postData() {
  const data = generateCoolBreezeEvaporativeData();
  
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] Posting CoolBreeze Evaporative data...`);
  console.log('Data:', JSON.stringify(data, null, 2));
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/esp32-data-receiver`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Success:', result);
    } else {
      console.error('❌ Error:', response.status, result);
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

/**
 * Starts the data streaming loop
 */
function startStreaming() {
  console.log('========================================');
  console.log('CoolBreeze Evaporative Cooler Data Simulator');
  console.log('========================================');
  console.log(`Machine ID: ${MACHINE_ID}`);
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Posting interval: ${POST_INTERVAL / 1000} seconds`);
  console.log('========================================\n');
  
  // Post immediately
  postData();
  
  // Then post every 30 seconds
  setInterval(postData, POST_INTERVAL);
}

// ========================================
// ENTRY POINT
// ========================================

// Validate configuration
if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || MACHINE_ID === 'YOUR_MACHINE_UUID' || API_KEY === 'YOUR_API_KEY') {
  console.error('❌ Please update the configuration values at the top of this script:');
  console.error('   - SUPABASE_URL');
  console.error('   - MACHINE_ID');
  console.error('   - API_KEY');
  process.exit(1);
}

// Start streaming
startStreaming();

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n========================================');
  console.log('Stopping CoolBreeze Evaporative simulator...');
  console.log('========================================');
  process.exit(0);
});

