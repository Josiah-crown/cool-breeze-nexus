/**
 * Alliance Heatpump Data Simulator
 * 
 * Simulates realistic data for an Alliance heatpump system
 * Posts data every 30 seconds to the Supabase edge function
 * 
 * Alliance Heatpump Logic:
 * - Pump: GPIO5 (voltage_input_5) = pump relay (water reading)
 * - Temperature 1 (in): outside_temp = inlet/ambient
 * - Temperature 2 (out): inside_temp = outlet/duct
 * - Temperature 3 (compressor): motor_temp = compressor temp
 * - CT readings: current + voltage on entire unit
 * - Current > 1A = heating active
 * - Compressor status based on delta T and current
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
 * Generates realistic sensor data for Alliance heatpump
 */
function generateAllianceHeatpumpData() {
  // Time-based simulation for realistic cycles
  const now = Date.now();
  const cycleTime = (now / 1000) % 600; // 10-minute cycle
  
  // Simulate heating cycles (on for 6 minutes, off for 4 minutes)
  const isHeating = cycleTime < 360;
  
  // Temperature readings
  const ambientTemp = 15 + Math.random() * 3; // 15-18°C (inlet/outside)
  const setpointTemp = 55; // Target water temp
  
  // Duct temp varies based on heating state
  const ductTemp = isHeating 
    ? ambientTemp + 8 + Math.random() * 4  // Heating: +8-12°C delta
    : ambientTemp + Math.random() * 2;      // Not heating: minimal delta
  
  // Temperature 3: Compressor temp (stored as motor_temp in database)
  const compressorTemp = isHeating
    ? 45 + Math.random() * 10  // 45-55°C when running
    : 30 + Math.random() * 5;   // 30-35°C when idle
  
  // Electrical readings - current determines heating state
  const current = isHeating
    ? 8 + Math.random() * 4      // 8-12A when heating (>1A = heating)
    : 0.3 + Math.random() * 0.4;  // 0.3-0.7A when idle (<1A = not heating)
  
  const voltage = 230 + Math.random() * 10 - 5; // 225-235V
  
  // Voltage inputs (12V logic)
  // GPIO5 (voltage_input_5) = pump relay
  const pumpActive = isHeating; // Pump runs when heating
  const voltage_input_5 = pumpActive ? 12 + Math.random() * 0.5 : 0.2; // >6V = active
  
  // Other voltage inputs (can be customized based on your setup)
  const voltage_input_1 = isHeating ? 11.5 + Math.random() : 0.1; // Fan (if used)
  const voltage_input_2 = 0; // Unused
  const voltage_input_3 = 0; // Unused
  const voltage_input_4 = 0; // Unused
  
  return {
    machine_id: MACHINE_ID,
    motor_temp: parseFloat(compressorTemp.toFixed(2)), // Temperature 3: Compressor
    inside_temp: parseFloat(ductTemp.toFixed(2)),      // Temperature 2: Outlet
    outside_temp: parseFloat(ambientTemp.toFixed(2)),  // Temperature 1: Inlet
    current: parseFloat(current.toFixed(2)),
    voltage: parseFloat(voltage.toFixed(2)),
    power: parseFloat((voltage * current).toFixed(2)),
    has_water: true, // Not used for heatpump, but required field
    voltage_input_1: parseFloat(voltage_input_1.toFixed(2)),
    voltage_input_2: parseFloat(voltage_input_2.toFixed(2)),
    voltage_input_3: parseFloat(voltage_input_3.toFixed(2)),
    voltage_input_4: parseFloat(voltage_input_4.toFixed(2)),
    voltage_input_5: parseFloat(voltage_input_5.toFixed(2)), // GPIO5 - Pump relay
    sensor_read_count: 10 // Number of readings averaged
  };
}

/**
 * Posts data to Supabase edge function
 */
async function postData() {
  const data = generateAllianceHeatpumpData();
  
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] Posting Alliance Heatpump data...`);
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
  console.log('Alliance Heatpump Data Simulator');
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
  console.log('Stopping Alliance Heatpump simulator...');
  console.log('========================================');
  process.exit(0);
});

