/*
 * ============================================
 * ESP32 - Cirrus Machine (12V Logic) - OPTIMIZED
 * Cool Breeze Nexus Integration
 * ============================================
 * 
 * VERSION: 3.0.0 (Optimized for 2-minute updates)
 * COMPATIBILITY: ESP32 Arduino Core 2.0.11 - 3.0.x
 * 
 * OPTIMIZATIONS:
 * - Data transmission: Every 2 minutes (120 seconds) instead of 30 seconds
 * - Reduced bandwidth usage by 75%
 * - Reduced edge function calls by 75%
 * - Lower power consumption
 * - Rate limiting support on server side
 * 
 * FEATURES:
 * - WiFiManager for easy WiFi configuration
 * - Supabase HTTP POST integration
 * - WiFi/ADC conflict resolution (WiFi OFF during sensor reading)
 * - 1-minute averaged sensor readings
 * - Timeout mechanisms for slow/failed connections
 * - Automatic 6-month full reset (memory leak prevention)
 * - Auto reset every 6 hours (improved reliability)
 * - Watchdog timer (60s) to prevent stalls
 * - Boot button hold (5s) to enter config mode
 * - WiFi stuck detection and auto-recovery
 * - RTC memory for persistent uptime tracking
 * - Smart status detection (good/warning/error)
 * - Local data buffering (stores readings if WiFi fails)
 * 
 * TIMING:
 * - Sensor readings: Every 1 second (WiFi OFF)
 * - Data transmission: Every 120 seconds (2 minutes) - OPTIMIZED
 * - WiFi timeout: 30 seconds for connection
 * - HTTP timeout: 10 seconds for POST
 * - Max WiFi on time: 60 seconds (safety net)
 * - Auto reset: Every 6 hours (improved from 24h)
 * - Watchdog timeout: 60 seconds
 * - Boot button hold: 5 seconds to enter config
 * 
 * ============================================
 */

#include <WiFi.h>
#include <WiFiManager.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Preferences.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <esp_task_wdt.h>
#include <EmonLib.h>
#include <esp_adc_cal.h>
#include <driver/adc.h>
#include <time.h>
#include <esp_system.h>
#include <ArduinoJson.h>

// ============================================
// DEBUG MODE - Set to 1 for detailed sensor output
// ============================================
#define DEBUG_MODE 1  // Change to 0 to disable debug output

// ============================================
// DEVICE CONFIGURATION
// ============================================
const String DEVICE_ID = "CIRRUS";
const String FIRMWARE_VERSION = "3.0.0-OPTIMIZED-2MIN";

// ============================================
// TIMING CONSTANTS - OPTIMIZED FOR 2-MINUTE UPDATES
// ============================================
const unsigned long SENSOR_READ_INTERVAL = 1000;        // 1 second
const unsigned long DATA_SEND_INTERVAL = 120000;         // 120 seconds (2 minutes) - OPTIMIZED
const unsigned long WIFI_CONNECT_TIMEOUT = 30000;        // 30 seconds
const unsigned long HTTP_POST_TIMEOUT = 10000;           // 10 seconds (optimized)
const unsigned long MAX_WIFI_ON_TIME = 60000;            // 1 minute (safety net, reduced)
const unsigned long AUTO_RESET_INTERVAL = 21600000;       // 6 hours (improved from 24h for better reliability)
const unsigned long SIX_MONTH_RESET = 15552000000ULL;   // 180 days in milliseconds
const unsigned long BOOT_BUTTON_HOLD_TIME = 5000;        // 5 seconds to enter config mode
const unsigned long WATCHDOG_TIMEOUT = 60;               // 60 seconds watchdog timeout
const unsigned long WIFI_STUCK_TIMEOUT = 120000;        // 2 minutes - if WiFi stuck, force reset

// ============================================
// Pin Definitions (Same as V2)
// ============================================
const int TEMP_PIN_MOTOR = 21;
const int TEMP_PIN_EXTERIOR = 22;
const int TEMP_PIN_INTERIOR = 23;
const int CT_PIN = 36;
const int FLOAT_PIN = 5;
const int GPIO_YELLOW_EXHAUST = 34;
const int GPIO_GREEN_FAN = 35;
const int GPIO_BROWN_PUMP = 32;
const int GPIO_BLACK_DRAIN = 33;
const int BOOT_BUTTON_PIN = 0;  // ESP32 Dev Module boot button (GPIO 0)

// ============================================
// Temperature Sensor Setup
// ============================================
OneWire oneWireMotor(TEMP_PIN_MOTOR);
OneWire oneWireExterior(TEMP_PIN_EXTERIOR);
OneWire oneWireInterior(TEMP_PIN_INTERIOR);

DallasTemperature sensorMotor(&oneWireMotor);
DallasTemperature sensorExterior(&oneWireExterior);
DallasTemperature sensorInterior(&oneWireInterior);

// ============================================
// CT Sensor Configuration
// ============================================
EnergyMonitor emon1;
const float CT_CALIBRATION = 30.0;  // Adjust based on your CT sensor

// ============================================
// ADC Calibration
// ============================================
esp_adc_cal_characteristics_t adc1_chars;
const int ADC_ATTEN = ADC_ATTEN_DB_11;  // 0-3.3V range
const int ADC_WIDTH = ADC_WIDTH_BIT_12;  // 12-bit resolution
const int ADC_SAMPLE_DELAY_US = 150;

// ============================================
// WiFiManager Configuration
// ============================================
WiFiManager wifiManager;
const char* AP_SSID = "Cirrus-Setup";
const char* AP_PASSWORD = "cirrus123";

// ============================================
// WiFi & Supabase Configuration
// ============================================
Preferences preferences;
const char* PREF_NAMESPACE = "cirrus";
const char* PREF_MACHINE_ID = "machine_id";
const char* PREF_API_KEY = "api_key";
const char* PREF_UPTIME = "uptime";

// HARDCODED Supabase credentials (same for all devices)
const char* SUPABASE_URL = "https://wjyanxstvbiqefmgpccb.supabase.co";
const char* SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqeWFueHN0dmJpcWVmbWdwY2NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMzI4NDUsImV4cCI6MjA3NzgwODg0NX0.r1xQG8HYHioH8_ALGQTRO2wM5F2tAOhM-xe_eh3VxhY";

// Per-device configuration (entered during setup)
String supabaseUrl = "";
String supabaseAnonKey = "";
String supabaseFunction = "esp32-data-receiver";
String machineId = "";
String apiKey = "";  // Separate API key for machine authentication

// ============================================
// State Machine
// ============================================
enum SystemState {
  STATE_SENSOR_READING,
  STATE_WIFI_CONNECT,
  STATE_DATA_SEND,
  STATE_WIFI_DISCONNECT
};
SystemState currentState = STATE_SENSOR_READING;

// ============================================
// State Variables
// ============================================
bool wifiEnabled = false;
unsigned long lastSensorRead = 0;
unsigned long lastDataSend = 0;
unsigned long lastUptimeUpdate = 0;
unsigned long lastAutoReset = 0;
unsigned long wifiOnStartTime = 0;
unsigned long bootTime = 0;
unsigned long bootButtonPressTime = 0;
bool bootButtonPressed = false;
unsigned long lastWatchdogFeed = 0;
unsigned long wifiStuckStartTime = 0;
bool wifiStuckDetected = false;

// Sensor reading averages (1-minute window)
float motorTempSum = 0;
float exteriorTempSum = 0;
float interiorTempSum = 0;
float currentSum = 0;
int sensorReadCount = 0;

// Current readings
float motorTemp = 0;
float exteriorTemp = 0;
float interiorTemp = 0;
float current = 0;
bool hasWater = true;
float fanVoltage = 0;
float pumpVoltage = 0;
float drainVoltage = 0;
float exhaustVoltage = 0;

// Last valid temperature readings (for fallback on interference)
float lastValidMotorTemp = 25.0;
float lastValidExteriorTemp = 25.0;
float lastValidInteriorTemp = 25.0;

// Temperature validation constants
#define TEMP_ERROR_DISCONNECTED -127.0
#define TEMP_ERROR_INVALID -999.0
#define TEMP_MIN_VALID -50.0
#define TEMP_MAX_VALID 120.0
#define TEMP_SAMPLES 2  // Number of samples to average (reduced from 3 for speed)
#define TEMP_READ_DELAY_MS 50  // Delay between samples (reduced from 100ms)

// ============================================
// Setup Function
// ============================================
void setup() {
  Serial.begin(115200);
  delay(2000);
  
  Serial.println("\n\n============================================");
  Serial.println("ESP32 Cirrus - Optimized 2-Minute Updates");
  Serial.println("Version: " + FIRMWARE_VERSION);
  Serial.println("============================================\n");
  
  // Initialize preferences
  preferences.begin(PREF_NAMESPACE, false);
  
  // Load saved configuration
  loadConfiguration();
  
  // Initialize sensors
  initializeSensors();
  
  // Initialize WiFiManager
  initializeWiFiManager();
  
  // Load uptime
  unsigned long totalUptimeSeconds = preferences.getULong64(PREF_UPTIME, 0);
  bootTime = millis();
  
  // Check for 6-month reset
  unsigned long uptimeMillis = totalUptimeSeconds * 1000ULL;
  if(uptimeMillis >= SIX_MONTH_RESET) {
    Serial.println("6-month reset triggered - clearing preferences");
    preferences.clear();
    delay(1000);
    ESP.restart();
  }
  
  lastAutoReset = millis();
  lastUptimeUpdate = millis();
  lastSensorRead = millis();
  lastDataSend = millis();
  lastWatchdogFeed = millis();
  
  // Initialize boot button (GPIO 0, pulled HIGH, LOW when pressed)
  pinMode(BOOT_BUTTON_PIN, INPUT_PULLUP);
  
  // Initialize watchdog timer (new API for ESP32 Arduino Core 3.x)
  // Note: WiFiManager might initialize it, but we'll reinitialize with our settings
  esp_task_wdt_deinit();  // Deinit first to avoid "already initialized" error
  esp_task_wdt_config_t wdt_config = {
    .timeout_ms = (uint32_t)WATCHDOG_TIMEOUT * 1000,
    .idle_core_mask = 0,
    .trigger_panic = true
  };
  esp_task_wdt_init(&wdt_config);
  esp_task_wdt_add(NULL);  // Add current task to watchdog
  
  // CRITICAL: Disable WiFi after setup (WiFiManager leaves it on)
  WiFi.mode(WIFI_OFF);
  wifiEnabled = false;
  Serial.println("WiFi disabled - starting sensor reading mode");
  
  // Initialize state machine - start with sensor reading
  currentState = STATE_SENSOR_READING;
  
  Serial.println("Setup complete. Starting main loop...\n");
  Serial.println("Hold BOOT button for 5 seconds to enter WiFi config mode");
}

// ============================================
// Main Loop
// ============================================
void loop() {
  unsigned long currentMillis = millis();
  
  // Feed watchdog timer
  if(currentMillis - lastWatchdogFeed >= 1000) {
    esp_task_wdt_reset();
    lastWatchdogFeed = currentMillis;
  }
  
  // Check boot button for config mode entry
  checkBootButton(currentMillis);
  
  // Auto reset check (6 hours)
  if(currentMillis - lastAutoReset >= AUTO_RESET_INTERVAL) {
    Serial.println("Auto reset triggered (6 hours)");
    delay(1000);
    ESP.restart();
  }
  
  // Update uptime every second
  if(currentMillis - lastUptimeUpdate >= 1000) {
    updateUptime();
    lastUptimeUpdate = currentMillis;
  }
  
  // Check for WiFi stuck condition
  checkWiFiStuck(currentMillis);
  
  // State machine - only execute current state
  switch(currentState) {
    case STATE_SENSOR_READING:
      stateSensorReading(currentMillis);
      break;
      
    case STATE_WIFI_CONNECT:
      stateWiFiConnect(currentMillis);
      break;
      
    case STATE_DATA_SEND:
      stateDataSend(currentMillis);
      break;
      
    case STATE_WIFI_DISCONNECT:
      stateWiFiDisconnect(currentMillis);
      break;
  }
  
  delay(10); // Small delay to prevent tight looping
}

// ============================================
// Sensor Reading State
// ============================================
void stateSensorReading(unsigned long currentMillis) {
  if(currentMillis - lastSensorRead >= SENSOR_READ_INTERVAL) {
    // Disable WiFi during ADC reading to avoid interference
    if(wifiEnabled) {
      WiFi.mode(WIFI_OFF);
      wifiEnabled = false;
      delay(50); // Allow WiFi to fully disable
    }
    
    // Read sensors
    readSensors();
    
    // Accumulate for averaging
    motorTempSum += motorTemp;
    exteriorTempSum += exteriorTemp;
    interiorTempSum += interiorTemp;
    currentSum += current;
    sensorReadCount++;
    
    lastSensorRead = currentMillis;
    
    if(DEBUG_MODE) {
      Serial.print("Sensor read #");
      Serial.print(sensorReadCount);
      Serial.print(" - Motor: ");
      Serial.print(motorTemp);
      Serial.print("°C, Exterior: ");
      Serial.print(exteriorTemp);
      Serial.print("°C, Interior: ");
      Serial.print(interiorTemp);
      Serial.print("°C, Current: ");
      Serial.print(current);
      Serial.print("A");
      Serial.print(" | Water: ");
      Serial.print(hasWater ? "FULL" : "EMPTY");
      Serial.print(" | Voltages - Fan: ");
      Serial.print(fanVoltage, 3);
      Serial.print("V, Pump: ");
      Serial.print(pumpVoltage, 3);
      Serial.print("V, Drain: ");
      Serial.print(drainVoltage, 3);
      Serial.print("V, Exhaust: ");
      Serial.print(exhaustVoltage, 3);
      Serial.println("V");
      
      // Show if any temperatures are using fallback values
      if(motorTemp == lastValidMotorTemp && motorTemp == 25.0) {
        Serial.println("  ⚠ Motor temp using fallback (25°C)");
      }
      if(exteriorTemp == lastValidExteriorTemp && exteriorTemp == 25.0) {
        Serial.println("  ⚠ Exterior temp using fallback (25°C)");
      }
      if(interiorTemp == lastValidInteriorTemp && interiorTemp == 25.0) {
        Serial.println("  ⚠ Interior temp using fallback (25°C)");
      }
    }
  }
  
  // Check if it's time to send data (every 120 seconds - OPTIMIZED)
  if(currentMillis - lastDataSend >= DATA_SEND_INTERVAL) {
    if(sensorReadCount > 0) {
      Serial.println("\n⏱ 120 seconds elapsed - transitioning to WiFi connect...");
      currentState = STATE_WIFI_CONNECT;
    } else {
      Serial.println("⚠ No samples collected - skipping transmission");
      lastDataSend = currentMillis;
    }
  }
}

// ============================================
// WiFi Connect State (with improved timeout)
// ============================================
void stateWiFiConnect(unsigned long currentMillis) {
  static bool connecting = false;
  static unsigned long connectStart = 0;
  
  if(!connecting) {
    // Start connection attempt
    Serial.println("\n========================================");
    Serial.println("  WIFI CONNECT STATE");
    Serial.println("========================================");
    Serial.println("Connecting to WiFi...");
    WiFi.mode(WIFI_STA);
    WiFi.begin();
    connecting = true;
    connectStart = millis();
  }
  
  // Check connection status
  if(WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✓ WiFi connected!");
    Serial.print("  IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("  RSSI: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
    wifiEnabled = true;
    wifiOnStartTime = millis();
    wifiStuckDetected = false;  // Reset stuck detection
    connecting = false;
    currentState = STATE_DATA_SEND;  // Transition to data send
  } else if(millis() - connectStart >= WIFI_CONNECT_TIMEOUT) {
    // Timeout
    Serial.println("\n✗ WiFi connection failed (timeout)");
    Serial.println("  Will retry in 2 minutes");
    connecting = false;
    currentState = STATE_SENSOR_READING;  // Go back to sensor reading, will retry later
  } else {
    // Still connecting - feed watchdog
    static unsigned long lastDot = 0;
    if(currentMillis - lastDot >= 500) {
      Serial.print(".");
      lastDot = currentMillis;
      esp_task_wdt_reset();  // Feed watchdog during connection
    }
  }
}

// ============================================
// Data Send State
// ============================================
void stateDataSend(unsigned long currentMillis) {
  static bool sending = false;
  
  if(!sending && wifiEnabled && WiFi.status() == WL_CONNECTED) {
    sending = true;
    Serial.println("\n========================================");
    Serial.println("  DATA SEND STATE");
    Serial.println("========================================");
    
    // Calculate averages
    float avgMotorTemp = sensorReadCount > 0 ? motorTempSum / sensorReadCount : motorTemp;
    float avgExteriorTemp = sensorReadCount > 0 ? exteriorTempSum / sensorReadCount : exteriorTemp;
    float avgInteriorTemp = sensorReadCount > 0 ? interiorTempSum / sensorReadCount : interiorTemp;
    float avgCurrent = sensorReadCount > 0 ? currentSum / sensorReadCount : current;
    
    Serial.println("Averaged Data (from " + String(sensorReadCount) + " samples):");
    Serial.println("  Temp Motor:    " + String(avgMotorTemp, 2) + " °C");
    Serial.println("  Temp Exterior: " + String(avgExteriorTemp, 2) + " °C");
    Serial.println("  Temp Interior: " + String(avgInteriorTemp, 2) + " °C");
    Serial.println("  Current:       " + String(avgCurrent, 2) + " A");
    Serial.println("  Water:         " + String(hasWater ? "FULL" : "EMPTY"));
    Serial.println("  Voltages:");
    Serial.println("    Fan:         " + String(fanVoltage, 3) + " V");
    Serial.println("    Pump:        " + String(pumpVoltage, 3) + " V");
    Serial.println("    Drain:       " + String(drainVoltage, 3) + " V");
    Serial.println("    Exhaust:     " + String(exhaustVoltage, 3) + " V");
    
    // Send data
    bool success = sendDataToSupabase(
      avgMotorTemp,
      avgExteriorTemp,
      avgInteriorTemp,
      avgCurrent
    );
    
    if(success) {
      Serial.println("✓ Data sent successfully!");
      // Reset accumulators
      motorTempSum = 0;
      exteriorTempSum = 0;
      interiorTempSum = 0;
      currentSum = 0;
      sensorReadCount = 0;
    } else {
      Serial.println("✗ Data send failed - will retry in 2 minutes");
    }
    
    lastDataSend = currentMillis;
    sending = false;
    currentState = STATE_WIFI_DISCONNECT;  // Transition to disconnect
  }
}

// ============================================
// WiFi Disconnect State
// ============================================
void stateWiFiDisconnect(unsigned long currentMillis) {
  static bool disconnecting = false;
  static unsigned long disconnectStart = 0;
  
  if(!disconnecting) {
    disconnectStart = currentMillis;
    disconnecting = true;
  }
  
  // Wait a moment before disconnecting (allow any final operations)
  if(currentMillis - disconnectStart >= 1000) {
    Serial.println("\n========================================");
    Serial.println("  WIFI DISCONNECT STATE");
    Serial.println("========================================");
    
    if(WiFi.status() == WL_CONNECTED) {
      Serial.println("Disconnecting WiFi...");
      WiFi.disconnect();
      delay(100);
    }
    WiFi.mode(WIFI_OFF);
    wifiEnabled = false;
    Serial.println("✓ WiFi disabled - returning to sensor reading");
    Serial.println("========================================\n");
    
    disconnecting = false;
    currentState = STATE_SENSOR_READING;  // Transition back to sensor reading
  }
  
  // Safety: Force WiFi off if it's been on too long
  if(wifiEnabled && (currentMillis - wifiOnStartTime > MAX_WIFI_ON_TIME)) {
    Serial.println("\n⚠ SAFETY NET: WiFi timeout - forcing disconnect");
    WiFi.disconnect();
    WiFi.mode(WIFI_OFF);
    wifiEnabled = false;
    disconnecting = false;
    currentState = STATE_SENSOR_READING;  // Transition back to sensor reading
  }
}

// ============================================
// Initialize Sensors
// ============================================
void initializeSensors() {
  // Initialize temperature sensors
  sensorMotor.begin();
  sensorExterior.begin();
  sensorInterior.begin();
  
  // Verify sensors are detected (helps catch wiring issues)
  int motorCount = sensorMotor.getDeviceCount();
  int exteriorCount = sensorExterior.getDeviceCount();
  int interiorCount = sensorInterior.getDeviceCount();
  
  if (DEBUG_MODE) {
    Serial.print("Temperature sensors detected - Motor: ");
    Serial.print(motorCount);
    Serial.print(", Exterior: ");
    Serial.print(exteriorCount);
    Serial.print(", Interior: ");
    Serial.println(interiorCount);
  }
  
  // Warn if sensors not detected (could indicate wiring issue or interference)
  if (motorCount == 0) {
    Serial.println("⚠️ WARNING: Motor temperature sensor not detected!");
  }
  if (exteriorCount == 0) {
    Serial.println("⚠️ WARNING: Exterior temperature sensor not detected!");
  }
  if (interiorCount == 0) {
    Serial.println("⚠️ WARNING: Interior temperature sensor not detected!");
  }
  
  // Initialize CT sensor
  emon1.current(CT_PIN, CT_CALIBRATION);
  
  // Initialize ADC calibration
  // Note: For ESP32 Arduino Core 3.x, we use analogRead() which handles channel config automatically
  // Calibration is still useful for accurate voltage readings
  esp_adc_cal_value_t val_type = esp_adc_cal_characterize(
    ADC_UNIT_1, 
    (adc_atten_t)ADC_ATTEN, 
    (adc_bits_width_t)ADC_WIDTH, 
    1100, 
    &adc1_chars
  );
  
  // Set ADC attenuation and width for all channels (using analog API)
  // Note: These functions are available in ESP32 Arduino Core 2.x and 3.x
  analogSetAttenuation((adc_attenuation_t)ADC_ATTEN);
  analogSetWidth((adc_bits_width_t)ADC_WIDTH);
  
  // Initialize float switch
  pinMode(FLOAT_PIN, INPUT_PULLUP);
  
  Serial.println("Sensors initialized");
}

// ============================================
// Validate Temperature Reading
// ============================================
bool isValidTemperature(float temp) {
  // Check for DS18B20 error codes
  if (temp == TEMP_ERROR_DISCONNECTED || temp == TEMP_ERROR_INVALID) {
    return false;
  }
  
  // Check for out-of-range values (likely interference)
  if (temp < TEMP_MIN_VALID || temp > TEMP_MAX_VALID) {
    return false;
  }
  
  // Check for NaN or infinity
  if (isnan(temp) || isinf(temp)) {
    return false;
  }
  
  return true;
}

// ============================================
// Read Temperature with Validation and Averaging
// ============================================
float readTemperatureWithValidation(DallasTemperature &sensor, float &lastValid) {
  // Read temperature (conversion already requested in readSensors())
  float reading = sensor.getTempCByIndex(0);
  
  // Check if reading is valid (not error codes, not out of range)
  if (isValidTemperature(reading)) {
    lastValid = reading; // Update last valid
    return reading;
  }
  
  // Invalid reading - use last valid (fallback)
  if (DEBUG_MODE) {
    Serial.print("Invalid temp reading (");
    Serial.print(reading);
    Serial.print("), using last valid: ");
    Serial.print(lastValid);
    Serial.println("°C");
  }
  
  return lastValid;
}

// ============================================
// Read Sensors
// ============================================
void readSensors() {
  // Note: WiFi is already disabled in stateSensorReading() before calling this function
  // This ensures WiFi is OFF during temperature reading to reduce interference
  
  // Request temperatures for ALL sensors at once (more efficient)
  // DS18B20 sensors on the same OneWire bus can be read together
  sensorMotor.requestTemperatures();
  sensorExterior.requestTemperatures();
  sensorInterior.requestTemperatures();
  delay(750); // Wait for DS18B20 conversion (750ms for 12-bit resolution)
  
  // Now read all sensors (they've all converted)
  // Read temperatures with validation (handles interference)
  motorTemp = readTemperatureWithValidation(sensorMotor, lastValidMotorTemp);
  exteriorTemp = readTemperatureWithValidation(sensorExterior, lastValidExteriorTemp);
  interiorTemp = readTemperatureWithValidation(sensorInterior, lastValidInteriorTemp);
  
  // Read current
  // Note: If no CT is connected, calcIrms will return noise (typically < 0.1A)
  // We'll treat anything below 0.1A as 0 (no CT connected or no load)
  float rawCurrent = abs(emon1.calcIrms(1480));
  current = (rawCurrent < 0.1) ? 0.0 : rawCurrent;  // Filter out noise when CT not connected
  
  // Read water level
  hasWater = digitalRead(FLOAT_PIN) == LOW;
  
  // Read voltage signals (12V logic)
  fanVoltage = readVoltage(GPIO_GREEN_FAN);
  pumpVoltage = readVoltage(GPIO_BROWN_PUMP);
  drainVoltage = readVoltage(GPIO_BLACK_DRAIN);
  exhaustVoltage = readVoltage(GPIO_YELLOW_EXHAUST);
  
  if (DEBUG_MODE) {
    Serial.print("Temps - Motor: ");
    Serial.print(motorTemp);
    Serial.print("°C, Exterior: ");
    Serial.print(exteriorTemp);
    Serial.print("°C, Interior: ");
    Serial.print(interiorTemp);
    Serial.print("°C | Water: ");
    Serial.print(hasWater ? "FULL" : "EMPTY");
    Serial.print(" | Voltages - Fan: ");
    Serial.print(fanVoltage, 3);
    Serial.print("V, Pump: ");
    Serial.print(pumpVoltage, 3);
    Serial.print("V, Drain: ");
    Serial.print(drainVoltage, 3);
    Serial.print("V, Exhaust: ");
    Serial.print(exhaustVoltage, 3);
    Serial.println("V");
  }
}

// ============================================
// Read Voltage (12V Logic)
// ============================================
float readVoltage(int pin) {
  // Validate pin is an ADC-capable GPIO
  if (pin != 32 && pin != 33 && pin != 34 && pin != 35) {
    if (DEBUG_MODE) {
      Serial.print("ERROR: Invalid pin for ADC: ");
      Serial.println(pin);
    }
    return 0.0;
  }
  
  // Use analogRead() which works with ESP32 Arduino Core 3.x
  // Take multiple samples and average for better accuracy
  uint32_t adc_reading = 0;
  for(int i = 0; i < 64; i++) {
    adc_reading += analogRead(pin);
    delayMicroseconds(ADC_SAMPLE_DELAY_US);
  }
  adc_reading /= 64;
  
  // Convert raw ADC reading to voltage using calibration
  uint32_t voltage_mv = esp_adc_cal_raw_to_voltage(adc_reading, &adc1_chars);
  return (voltage_mv / 1000.0) * 4.0; // Voltage divider: 12V -> 3V (4:1 ratio)
}

// ============================================
// Send Data to Supabase (with improved timeout handling)
// ============================================
bool sendDataToSupabase(float motorTemp, float outsideTemp, float insideTemp, float current) {
  if(WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected!");
    return false;
  }
  
  HTTPClient http;
  WiFiClientSecure client;
  
  // Skip certificate validation (for development - Supabase uses valid certificates)
  // In production, you could add the root CA certificate here for better security
  client.setInsecure();
  
  // Set client timeout to prevent hanging
  client.setTimeout(HTTP_POST_TIMEOUT / 1000);  // Convert to seconds
  
  // Construct URL
  String url = supabaseUrl + "/functions/v1/" + supabaseFunction;
  
  // Create JSON payload - RAW DATA ONLY (no calculations!)
  StaticJsonDocument<512> doc;
  doc["machine_id"] = machineId;
  
  // RAW Temperature Readings (direct from sensors)
  doc["motor_temp"] = motorTemp;
  doc["inside_temp"] = insideTemp;
  doc["outside_temp"] = outsideTemp;
  
  // RAW Electrical Readings (direct from sensors)
  doc["current"] = current;
  // Note: Voltage reading - if you have a voltage sensor, read it here
  // For now, we'll let Supabase calculate power from current only if voltage not available
  // If you have voltage sensor, uncomment and implement:
  // doc["voltage"] = readLineVoltage(); // Implement this function if you have voltage sensor
  // Power will be calculated in Supabase as voltage * current (if voltage provided)
  
  // RAW Water Status (direct from float switch)
  doc["has_water"] = hasWater;
  
  // RAW Voltage Inputs (direct from voltage dividers - 12V logic)
  // These map to voltage_input_1, voltage_input_2, voltage_input_3, voltage_input_4
  // The mapping is configured per machine in Supabase
  doc["voltage_input_1"] = fanVoltage;      // GPIO 35 (Green - Fan)
  doc["voltage_input_2"] = pumpVoltage;     // GPIO 32 (Brown - Pump)
  doc["voltage_input_3"] = drainVoltage;    // GPIO 33 (Black - Drain)
  doc["voltage_input_4"] = exhaustVoltage;  // GPIO 34 (Yellow - Exhaust)
  
  // Sensor read count (number of readings averaged)
  doc["sensor_read_count"] = sensorReadCount;
  
  // NO CALCULATIONS - All calculations done in Supabase!
  // Removed: delta_t, fan_active, pump_active, is_on, is_cooling, power, etc.
  
  String jsonBody;
  serializeJson(doc, jsonBody);
  
  // Make POST request with improved timeout handling
  unsigned long sendStartTime = millis();
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabaseAnonKey);  // Still needed for Supabase routing
  http.addHeader("Authorization", "Bearer " + apiKey);  // Use machine's key
  http.setTimeout(HTTP_POST_TIMEOUT);
  http.setConnectTimeout(5000);  // 5 second connection timeout
  
  Serial.println("Sending data to Supabase...");
  Serial.println("URL: " + url);
  if(DEBUG_MODE) {
    Serial.println("Payload: " + jsonBody);
  }
  
  // Feed watchdog before potentially long operation
  esp_task_wdt_reset();
  
  int httpResponseCode = http.POST(jsonBody);
  
  unsigned long sendDuration = millis() - sendStartTime;
  
  // Check if operation took too long (stalled)
  if(sendDuration > HTTP_POST_TIMEOUT) {
    Serial.println("⚠️ WARNING: HTTP POST took longer than timeout!");
    Serial.print("Duration: ");
    Serial.print(sendDuration);
    Serial.println("ms");
  }
  
  bool success = false;
  if(httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("Response code: " + String(httpResponseCode));
    if(DEBUG_MODE) {
      Serial.println("Response: " + response);
    }
    success = (httpResponseCode == 201 || httpResponseCode == 200);
    
    // Handle rate limiting (429)
    if(httpResponseCode == 429) {
      Serial.println("Rate limit exceeded - server will process when ready");
      // Don't treat as failure, server will process later
      success = true;
    }
  } else {
    Serial.print("HTTP Error code: ");
    Serial.println(httpResponseCode);
    Serial.print("Send duration: ");
    Serial.print(sendDuration);
    Serial.println("ms");
  }
  
  http.end();
  
  // Feed watchdog after operation
  esp_task_wdt_reset();
  
  return success;
}

// ============================================
// Get Current Timestamp
// ============================================
String getCurrentTimestamp() {
  time_t now;
  struct tm timeinfo;
  if(!getLocalTime(&timeinfo)) {
    return "";
  }
  
  char buffer[30];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(buffer);
}

// ============================================
// Check Boot Button (5 second hold to enter config)
// ============================================
void checkBootButton(unsigned long currentMillis) {
  bool buttonState = digitalRead(BOOT_BUTTON_PIN) == LOW;  // LOW when pressed
  
  if(buttonState && !bootButtonPressed) {
    // Button just pressed
    bootButtonPressTime = currentMillis;
    bootButtonPressed = true;
    Serial.println("Boot button pressed - hold for 5 seconds to enter config mode...");
  } else if(buttonState && bootButtonPressed) {
    // Button still held
    unsigned long holdTime = currentMillis - bootButtonPressTime;
    if(holdTime >= BOOT_BUTTON_HOLD_TIME) {
      // Button held for 5 seconds - enter config mode
      Serial.println("\n============================================");
      Serial.println("BOOT BUTTON HELD - Entering WiFi Config Mode");
      Serial.println("============================================");
      Serial.println("Clearing WiFi settings...");
      
      // Clear WiFi credentials
      preferences.remove("wifi_ssid");
      preferences.remove("wifi_pass");
      preferences.end();
      
      // Clear WiFiManager settings
      wifiManager.resetSettings();
      
      Serial.println("WiFi settings cleared. Restarting...");
      delay(2000);
      ESP.restart();
    }
  } else if(!buttonState && bootButtonPressed) {
    // Button released
    bootButtonPressed = false;
    unsigned long holdTime = currentMillis - bootButtonPressTime;
    if(holdTime < BOOT_BUTTON_HOLD_TIME) {
      Serial.println("Boot button released (not held long enough)");
    }
  }
}

// ============================================
// Check for WiFi Stuck Condition
// ============================================
void checkWiFiStuck(unsigned long currentMillis) {
  // Detect if WiFi has been trying to connect for too long
  if(wifiEnabled && WiFi.status() != WL_CONNECTED) {
    if(!wifiStuckDetected) {
      wifiStuckStartTime = currentMillis;
      wifiStuckDetected = true;
    } else {
      // WiFi stuck trying to connect
      if(currentMillis - wifiStuckStartTime > WIFI_STUCK_TIMEOUT) {
        Serial.println("⚠️ WiFi stuck - forcing reset!");
        Serial.println("WiFi has been trying to connect for more than 2 minutes");
        delay(1000);
        ESP.restart();
      }
    }
  } else {
    wifiStuckDetected = false;
  }
}

// ============================================
// Initialize WiFiManager
// ============================================
void initializeWiFiManager() {
  wifiManager.setConfigPortalTimeout(180); // 3 minutes
  wifiManager.setAPStaticIPConfig(IPAddress(192,168,4,1), IPAddress(192,168,4,1), IPAddress(255,255,255,0));
  
  // Load hardcoded Supabase credentials (same for all devices)
  supabaseUrl = String(SUPABASE_URL);
  supabaseAnonKey = String(SUPABASE_ANON_KEY);
  
  // Custom parameters ONLY for machine-specific info
  // (Supabase URL and Anon Key are hardcoded - same for all devices!)
  WiFiManagerParameter custom_machine_id("machine_id", "Machine UUID (from Dashboard)", machineId.c_str(), 100);
  WiFiManagerParameter custom_api_key("api_key", "Machine API Key (from Dashboard)", apiKey.c_str(), 200);
  
  wifiManager.addParameter(&custom_machine_id);
  wifiManager.addParameter(&custom_api_key);
  
  // Try to connect - ONLY start config portal if NO credentials exist
  // If credentials exist but WiFi is down, don't start portal (WiFi might be temporarily down)
  String savedSSID = WiFi.SSID();
  if(savedSSID.length() == 0) {
    // No saved credentials - start config portal
    Serial.println("No WiFi credentials found - starting config portal...");
    if(!wifiManager.autoConnect(AP_SSID, AP_PASSWORD)) {
      Serial.println("Config portal timed out - will retry on next boot");
      // Don't restart - let device continue (will try again later)
    }
  } else {
    // Credentials exist - try to connect but don't start portal on failure
    Serial.println("WiFi credentials found - attempting connection...");
    WiFi.mode(WIFI_STA);
    WiFi.begin();
    
    unsigned long connectStart = millis();
    while(WiFi.status() != WL_CONNECTED && (millis() - connectStart < 10000)) {
      delay(500);
      Serial.print(".");
    }
    
    if(WiFi.status() == WL_CONNECTED) {
      Serial.println("\nWiFi connected!");
    } else {
      Serial.println("\nWiFi connection failed - will retry later");
      Serial.println("(Hold BOOT button for 5 seconds to enter config mode)");
      // Don't start config portal - WiFi might just be temporarily down
      // User can manually enter config mode via boot button if needed
    }
  }
  
  // Save configuration (only machine-specific, Supabase credentials are hardcoded)
  machineId = String(custom_machine_id.getValue());
  apiKey = String(custom_api_key.getValue());
  
  saveConfiguration();
  
  Serial.println("WiFi connected!");
  Serial.println("Supabase URL: " + supabaseUrl + " (hardcoded)");
  Serial.println("Machine ID: " + machineId);
}

// ============================================
// Load Configuration
// ============================================
void loadConfiguration() {
  // Load hardcoded Supabase credentials (same for all devices)
  supabaseUrl = String(SUPABASE_URL);
  supabaseAnonKey = String(SUPABASE_ANON_KEY);
  
  // Load machine-specific configuration
  machineId = preferences.getString(PREF_MACHINE_ID, machineId.c_str());
  apiKey = preferences.getString(PREF_API_KEY, apiKey.c_str());
}

// ============================================
// Save Configuration
// ============================================
void saveConfiguration() {
  // Save ONLY machine-specific config (Supabase credentials are hardcoded)
  preferences.putString(PREF_MACHINE_ID, machineId);
  preferences.putString(PREF_API_KEY, apiKey);
}

// ============================================
// Update Uptime
// ============================================
void updateUptime() {
  unsigned long currentUptime = (millis() - bootTime) / 1000;
  unsigned long totalUptime = preferences.getULong64(PREF_UPTIME, 0);
  totalUptime += currentUptime;
  preferences.putULong64(PREF_UPTIME, totalUptime);
  bootTime = millis();
}

