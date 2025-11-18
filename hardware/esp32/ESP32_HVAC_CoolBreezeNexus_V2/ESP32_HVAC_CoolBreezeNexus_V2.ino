/*
 * ============================================
 * ESP32 R32 - Cool Breeze Nexus Integration
 * Production HVAC Monitoring System
 * ============================================
 * 
 * VERSION: 2.1.0 (Dashboard Compatible)
 * COMPATIBILITY: ESP32 Arduino Core 2.0.11 - 3.0.x
 * 
 * FEATURES:
 * - WiFiManager for easy WiFi configuration
 * - Supabase HTTP POST integration (Dashboard Compatible)
 * - WiFi/ADC conflict resolution (WiFi OFF during sensor reading)
 * - 1-minute averaged sensor readings
 * - Timeout mechanisms for slow/failed connections
 * - Automatic 6-month full reset (memory leak prevention)
 * - Daily soft reset (24-hour power cycle)
 * - RTC memory for persistent uptime tracking
 * - Smart status detection (good/warning/error)
 * 
 * TIMING:
 * - Sensor readings: Every 1 second (WiFi OFF)
 * - Data transmission: Every 60 seconds (WiFi ON briefly)
 * - WiFi timeout: 30 seconds for connection
 * - HTTP timeout: 60 seconds for POST
 * - Max WiFi on time: 120 seconds (safety net)
 * 
 * CHANGES FROM V2.0.1:
 * - JSON field names now match dashboard schema
 * - Removed custom state_inputs array
 * - Added machine-specific API key authentication
 * - Added smart overall_status logic
 * - Added evaporative cooler specific fields
 * - Added diagnostic voltages for debugging
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
const String DEVICE_ID = "R32";
const String FIRMWARE_VERSION = "2.1.0";

// ============================================
// TIMING CONSTANTS
// ============================================
const unsigned long SENSOR_READ_INTERVAL = 1000;      // 1 second
const unsigned long DATA_SEND_INTERVAL = 60000;       // 60 seconds (1 minute)
const unsigned long WIFI_CONNECT_TIMEOUT = 30000;     // 30 seconds
const unsigned long HTTP_POST_TIMEOUT = 8000;         // 8 seconds (before watchdog)
const unsigned long MAX_WIFI_ON_TIME = 120000;        // 2 minutes (safety net)
const unsigned long AUTO_RESET_INTERVAL = 21600000;   // 6 hours (improved from 24h for better reliability)
const unsigned long SIX_MONTH_RESET = 15552000000ULL; // 180 days in milliseconds
const unsigned long BOOT_BUTTON_HOLD_TIME = 5000;     // 5 seconds to enter config mode
const unsigned long WATCHDOG_TIMEOUT = 60;            // 60 seconds watchdog timeout
const unsigned long WIFI_STUCK_TIMEOUT = 120000;      // 2 minutes - if WiFi stuck, force reset

// ============================================
// Pin Definitions
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
const float CALIBRATION = 16.5;
const float MIN_CURRENT_THRESHOLD = 1.0;
const float MAX_CURRENT_THRESHOLD = 16.0;
const float LINE_VOLTAGE = 230.0;
const float ADC_VREF = 3.3;

// ============================================
// Pickup ADC Configuration
// ============================================
const int ADC_SAMPLES = 100;
const int ADC_SAMPLE_DELAY_US = 150;
esp_adc_cal_characteristics_t adc_chars;

// Pickup voltage thresholds
const float VOLTAGE_DISCONNECTED_MAX = 0.5;
const float VOLTAGE_ON_MIN = 0.8;
const float VOLTAGE_ON_MAX = 2.632;
const float VOLTAGE_OFF_MIN = 2.807;

// Fan speed calculation (GREEN wire)
const float FAN_VOLTAGE_100_SPEED = 1.053;
const float FAN_VOLTAGE_0_SPEED = 2.035;

// Moving average filter (3 readings per pickup)
const int FILTER_SIZE = 3;
float yellowFilter[FILTER_SIZE] = {0};
float greenFilter[FILTER_SIZE] = {0};
float brownFilter[FILTER_SIZE] = {0};
float blackFilter[FILTER_SIZE] = {0};
int filterIndex = 0;

// ============================================
// WiFi & Supabase Configuration
// ============================================
WiFiManager wifiManager;
Preferences preferences;

// HARDCODED Supabase credentials (same for all devices)
const char* SUPABASE_URL = "https://wjyanxstvbiqefmgpccb.supabase.co";
const char* SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqeWFueHN0dmJpcWVmbWdwY2NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMzI4NDUsImV4cCI6MjA3NzgwODg0NX0.r1xQG8HYHioH8_ALGQTRO2wM5F2tAOhM-xe_eh3VxhY";

// Per-device configuration (entered during setup)
String supabaseUrl = "";
String supabaseAnonKey = "";
String machineUUID = "";
String machineAPIKey = "";  // Separate API key for machine authentication

// WiFi state tracking
bool wifiEnabled = false;
unsigned long wifiOnStartTime = 0;

// ============================================
// Data Accumulation for Averaging
// ============================================
struct SensorAccumulator {
  float tempMotorSum;
  float tempExteriorSum;
  float tempInteriorSum;
  float ctCurrentSum;
  float ctVoltageSum;
  float apparentPowerSum;
  float yellowVoltageSum;
  float greenVoltageSum;
  float brownVoltageSum;
  float blackVoltageSum;
  int tankFullCount;
  int sampleCount;
  
  // Most recent pickup statuses (not averaged)
  String yellowStatus;
  String greenStatus;
  String brownStatus;
  String blackStatus;
  int fanSpeed;
  
  void reset() {
    tempMotorSum = 0;
    tempExteriorSum = 0;
    tempInteriorSum = 0;
    ctCurrentSum = 0;
    ctVoltageSum = 0;
    apparentPowerSum = 0;
    yellowVoltageSum = 0;
    greenVoltageSum = 0;
    brownVoltageSum = 0;
    blackVoltageSum = 0;
    tankFullCount = 0;
    sampleCount = 0;
  }
  
  void addSample(float tMotor, float tExterior, float tInterior,
                 float ctCurr, float ctVolt, float appPower,
                 float yVolt, float gVolt, float bVolt, float blVolt,
                 bool tankFull, String yStatus, String gStatus, 
                 String bStatus, String blStatus, int fSpeed) {
    tempMotorSum += tMotor;
    tempExteriorSum += tExterior;
    tempInteriorSum += tInterior;
    ctCurrentSum += ctCurr;
    ctVoltageSum += ctVolt;
    apparentPowerSum += appPower;
    yellowVoltageSum += yVolt;
    greenVoltageSum += gVolt;
    brownVoltageSum += bVolt;
    blackVoltageSum += blVolt;
    if(tankFull) tankFullCount++;
    sampleCount++;
    
    // Store most recent statuses
    yellowStatus = yStatus;
    greenStatus = gStatus;
    brownStatus = bStatus;
    blackStatus = blStatus;
    fanSpeed = fSpeed;
  }
} accumulator;

// ============================================
// RTC Memory for Uptime Tracking
// ============================================
RTC_DATA_ATTR unsigned long totalUptimeSeconds = 0;
RTC_DATA_ATTR unsigned long lastResetTime = 0;
RTC_DATA_ATTR bool rtcInitialized = false;

// ============================================
// Timing Variables
// ============================================
unsigned long lastSensorRead = 0;
unsigned long lastDataSend = 0;
unsigned long lastAutoReset = 0;
unsigned long bootTime = 0;
unsigned long bootButtonPressTime = 0;
bool bootButtonPressed = false;
unsigned long lastWatchdogFeed = 0;
unsigned long wifiStuckStartTime = 0;
bool wifiStuckDetected = false;

// ============================================
// Function Prototypes
// ============================================
void launchConfigPortal();
void saveConfigCallback();
void checkBootButton(unsigned long currentMillis);
void checkWiFiStuck(unsigned long currentMillis);
void performAutoReset();

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
// SETUP
// ============================================
void setup() {
  Serial.begin(115200);
  delay(2000);
  
  Serial.println("\n\n========================================");
  Serial.println("  ESP32 R32 - Cool Breeze Nexus");
  Serial.println("  Firmware: " + FIRMWARE_VERSION);
  Serial.println("========================================");
  Serial.println("Device ID: " + DEVICE_ID);
  
  // Initialize RTC memory tracking
  if(!rtcInitialized) {
    totalUptimeSeconds = 0;
    lastResetTime = 0;
    rtcInitialized = true;
    Serial.println("✓ RTC memory initialized");
  } else {
    Serial.print("✓ Total uptime: ");
    Serial.print(totalUptimeSeconds / 86400);
    Serial.println(" days");
  }
  
  bootTime = millis();
  lastAutoReset = bootTime;
  lastWatchdogFeed = bootTime;
  
  // Initialize boot button (GPIO 0, pulled HIGH, LOW when pressed)
  pinMode(BOOT_BUTTON_PIN, INPUT_PULLUP);
  
  // Boot button will be checked in main loop (5 second hold to enter config mode)
  // Old reset method (hold boot + press reset) has been removed - use boot button hold instead
  
  // Check if 6-month reset is needed
  unsigned long uptimeMillis = totalUptimeSeconds * 1000ULL;
  if(uptimeMillis >= SIX_MONTH_RESET) {
    Serial.println("⚠ 6-month uptime reached - performing full reset...");
    delay(1000);
    
    // Clear all persistent data EXCEPT WiFi credentials
    preferences.begin("iot-nexus", false);
    preferences.clear();
    preferences.end();
    
    // Reset RTC memory
    totalUptimeSeconds = 0;
    lastResetTime = 0;
    
    // Reboot
    ESP.restart();
  }
  
  // Initialize preferences (for Supabase config)
  preferences.begin("iot-nexus", false);
  
  // Configure WiFiManager
  wifiManager.setConfigPortalTimeout(180); // 3 minutes for configuration
  wifiManager.setSaveConfigCallback(saveConfigCallback);
  
  // Add custom parameters ONLY for machine-specific info
  // (Supabase URL and Anon Key are hardcoded - same for all devices!)
  WiFiManagerParameter customMachineUUID("machine_uuid", "Machine UUID (from Dashboard)", "", 40);
  WiFiManagerParameter customMachineAPIKey("api_key", "Machine API Key (from Dashboard)", "", 100);
  
  wifiManager.addParameter(&customMachineUUID);
  wifiManager.addParameter(&customMachineAPIKey);
  
  Serial.println("\n========================================");
  Serial.println("WiFi Configuration:");
  Serial.println("========================================");
  
  // Load hardcoded Supabase credentials (same for all devices)
  supabaseUrl = String(SUPABASE_URL);
  supabaseAnonKey = String(SUPABASE_ANON_KEY);
  Serial.println("✓ Using hardcoded Supabase credentials");
  
  // Try to load saved machine-specific config
  machineUUID = preferences.getString("machine_uuid", "");
  machineAPIKey = preferences.getString("api_key", "");
  
  if(machineUUID.length() > 0 && machineAPIKey.length() > 0) {
    Serial.println("✓ Machine config loaded from memory");
    Serial.println("  Supabase URL: " + supabaseUrl);
    Serial.println("  Machine UUID: " + machineUUID);
    Serial.println("  API Key: Configured ✓");
    
    // WiFi is OFF by default - we'll connect when needed
    WiFi.mode(WIFI_OFF);
    wifiEnabled = false;
    Serial.println("✓ WiFi currently disabled (will enable for data transmission)");
  } else {
    // NO CONFIG FOUND - FORCE CONFIG PORTAL NOW!
    Serial.println("⚠ No machine config found - LAUNCHING CONFIG PORTAL NOW!");
    Serial.println("========================================");
    
    // Launch config portal immediately
    launchConfigPortal();
    
    // After config is saved, load the new values
    machineUUID = preferences.getString("machine_uuid", "");
    machineAPIKey = preferences.getString("api_key", "");
    
    Serial.println("✓ Configuration complete!");
    Serial.println("  Supabase URL: " + supabaseUrl);
    Serial.println("  Machine UUID: " + machineUUID);
    Serial.println("  API Key: Configured ✓");
    
    // WiFi is now connected via config portal
    wifiEnabled = true;
  }
  
  Serial.println("========================================\n");
  
  // Initialize hardware
  initializeHardware();
  
  // Initialize watchdog timer (60 seconds - improved from 10s)
  // Compatible with both ESP32 core 2.x and 3.x
  #if ESP_ARDUINO_VERSION >= ESP_ARDUINO_VERSION_VAL(3, 0, 0)
    // ESP32 core 3.x - new API with config struct
    esp_task_wdt_config_t twdt_config = {
      .timeout_ms = WATCHDOG_TIMEOUT * 1000,  // 60 seconds
      .idle_core_mask = (1 << portNUM_PROCESSORS) - 1,
      .trigger_panic = true
    };
    esp_task_wdt_init(&twdt_config);
    esp_task_wdt_add(NULL);
  #else
    // ESP32 core 2.x - old API
    esp_task_wdt_init(WATCHDOG_TIMEOUT, true);
    esp_task_wdt_add(NULL);
  #endif
  
  Serial.println("✓ Setup complete. Starting sensor readings...\n");
  Serial.println("OPERATION MODE:");
  Serial.println("  - Sensor readings: Every 1 second (WiFi OFF)");
  Serial.println("  - Data transmission: Every 60 seconds (WiFi ON briefly)");
  Serial.println("  - Auto reset: Every 6 hours (improved reliability)");
  Serial.println("  - Full reset: Every 6 months");
  Serial.println("  - Watchdog: 60 seconds (prevents stalls)");
  Serial.println("  - Hold BOOT button for 5 seconds to enter config mode");
  
  #if DEBUG_MODE
    Serial.println("\n⚠ DEBUG MODE ENABLED ⚠");
    Serial.println("  Detailed sensor output every reading");
    Serial.println("  To disable: Set DEBUG_MODE to 0 at top of code");
  #else
    Serial.println("\n✓ Production Mode");
    Serial.println("  Brief status every 10 readings");
  #endif
  
  Serial.println("========================================\n");
  
  // Reset accumulator
  accumulator.reset();
}

// ============================================
// Initialize Hardware
// ============================================
void initializeHardware() {
  Serial.println("Initializing hardware...");
  
  // ADC configuration
  analogSetAttenuation(ADC_11db);
  analogSetWidth(12);
  esp_adc_cal_characterize(ADC_UNIT_1, ADC_ATTEN_DB_11, ADC_WIDTH_BIT_12, 1100, &adc_chars);
  
  // CT sensor
  pinMode(CT_PIN, INPUT);
  emon1.current(CT_PIN, CALIBRATION);
  Serial.println("✓ CT sensor initialized on GPIO 36");
  
  // Temperature sensors
  sensorMotor.begin();
  sensorExterior.begin();
  sensorInterior.begin();
  Serial.println("✓ Temperature sensors initialized (GPIOs 21, 22, 23)");
  
  // Float switch
  pinMode(FLOAT_PIN, INPUT_PULLUP);
  Serial.println("✓ Float switch initialized on GPIO 5");
  
  // Pickup inputs
  pinMode(GPIO_YELLOW_EXHAUST, INPUT);
  pinMode(GPIO_GREEN_FAN, INPUT);
  pinMode(GPIO_BROWN_PUMP, INPUT);
  pinMode(GPIO_BLACK_DRAIN, INPUT);
  Serial.println("✓ Pickup inputs initialized (GPIOs 34, 35, 32, 33)");
}

// ============================================
// MAIN LOOP - State Machine
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
  
  // Check for auto reset (6 hours)
  if(currentMillis - lastAutoReset >= AUTO_RESET_INTERVAL) {
    performAutoReset();
  }
  
  // Check for WiFi stuck condition
  checkWiFiStuck(currentMillis);
  
  // Update RTC uptime counter every second
  static unsigned long lastUptimeUpdate = 0;
  if(currentMillis - lastUptimeUpdate >= 1000) {
    totalUptimeSeconds++;
    lastUptimeUpdate = currentMillis;
  }
  
  // CRITICAL: Safety net - force WiFi off if on too long
  checkWiFiTimeout();
  
  // State machine execution
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
// STATE: Sensor Reading (WiFi OFF)
// ============================================
void stateSensorReading(unsigned long currentMillis) {
  // Read sensors every second
  if(currentMillis - lastSensorRead >= SENSOR_READ_INTERVAL) {
    // CRITICAL: Ensure WiFi is OFF before reading
    if(wifiEnabled) {
      Serial.println("⚠ WARNING: WiFi still on during sensor read - disabling...");
      disableWiFi();
    }
    
    // Read all sensors
    float tMotor = readTemperature(sensorMotor);
    float tExterior = readTemperature(sensorExterior);
    float tInterior = readTemperature(sensorInterior);
    
    float ctCurrent, ctVoltage, apparentPower;
    readCTSensor(ctCurrent, ctVoltage, apparentPower);
    
    bool tankFull = (digitalRead(FLOAT_PIN) == LOW);
    
    float yVolt, gVolt, bVolt, blVolt;
    String yStatus, gStatus, bStatus, blStatus;
    int fanSpeed;
    readPickups(yVolt, gVolt, bVolt, blVolt, yStatus, gStatus, bStatus, blStatus, fanSpeed);
    
    // Accumulate samples
    accumulator.addSample(tMotor, tExterior, tInterior, ctCurrent, ctVoltage, 
                          apparentPower, yVolt, gVolt, bVolt, blVolt, tankFull,
                          yStatus, gStatus, bStatus, blStatus, fanSpeed);
    
    lastSensorRead = currentMillis;
    
    #if DEBUG_MODE
      // DETAILED DEBUG OUTPUT - Shows all sensor readings
      Serial.println("\n┌─────────────────────────────────────────────────────");
      Serial.print("│ Sample: ");
      Serial.print(accumulator.sampleCount);
      Serial.print("/60  |  Uptime: ");
      Serial.print(millis() / 1000);
      Serial.println(" seconds");
      Serial.println("├─────────────────────────────────────────────────────");
      
      // Temperature Sensors
      Serial.println("│ TEMPERATURE SENSORS:");
      Serial.print("│   Motor:    ");
      Serial.print(tMotor, 2);
      Serial.print(" °C");
      if(tMotor == -999.0) Serial.print(" ⚠ ERROR!");
      Serial.println();
      
      Serial.print("│   Exterior: ");
      Serial.print(tExterior, 2);
      Serial.print(" °C");
      if(tExterior == -999.0) Serial.print(" ⚠ ERROR!");
      Serial.println();
      
      Serial.print("│   Interior: ");
      Serial.print(tInterior, 2);
      Serial.print(" °C");
      if(tInterior == -999.0) Serial.print(" ⚠ ERROR!");
      Serial.println();
      
      // CT Sensor
      Serial.println("│");
      Serial.println("│ CURRENT TRANSFORMER:");
      Serial.print("│   Current:  ");
      Serial.print(ctCurrent, 2);
      Serial.println(" A");
      Serial.print("│   Voltage:  ");
      Serial.print(ctVoltage, 3);
      Serial.println(" V (ADC)");
      Serial.print("│   Power:    ");
      Serial.print(apparentPower, 1);
      Serial.println(" VA");
      
      // Float Switch
      Serial.println("│");
      Serial.println("│ FLOAT SWITCH:");
      Serial.print("│   Tank: ");
      Serial.println(tankFull ? "FULL ✓" : "EMPTY");
      
      // Pickup Inputs
      Serial.println("│");
      Serial.println("│ PICKUP INPUTS:");
      
      // Yellow (Exhaust)
      Serial.print("│   GPIO 34 Yellow: ");
      Serial.print(yVolt, 3);
      Serial.print(" V  →  ");
      Serial.print(yStatus);
      if(yStatus == "DISCONNECTED") Serial.print(" ⚠");
      Serial.println();
      
      // Green (Fan + Speed)
      Serial.print("│   GPIO 35 Green:  ");
      Serial.print(gVolt, 3);
      Serial.print(" V  →  ");
      Serial.print(gStatus);
      if(gStatus == "ON") {
        Serial.print("  (Fan Speed: ");
        Serial.print(fanSpeed);
        Serial.print("%)");
      }
      if(gStatus == "DISCONNECTED") Serial.print(" ⚠");
      Serial.println();
      
      // Brown (Pump)
      Serial.print("│   GPIO 32 Brown:  ");
      Serial.print(bVolt, 3);
      Serial.print(" V  →  ");
      Serial.print(bStatus);
      if(bStatus == "DISCONNECTED") Serial.print(" ⚠");
      Serial.println();
      
      // Black (Drain)
      Serial.print("│   GPIO 33 Black:  ");
      Serial.print(blVolt, 3);
      Serial.print(" V  →  ");
      Serial.print(blStatus);
      if(blStatus == "DISCONNECTED") Serial.print(" ⚠");
      Serial.println();
      
      Serial.println("└─────────────────────────────────────────────────────");
      
    #else
      // BRIEF OUTPUT (Production Mode)
      // Print brief status every 10 samples
      if(accumulator.sampleCount % 10 == 0) {
        Serial.print("📊 Samples: ");
        Serial.print(accumulator.sampleCount);
        Serial.print("/60  |  Temp Motor: ");
        Serial.print(tMotor, 1);
        Serial.print("°C  |  CT: ");
        Serial.print(ctCurrent, 2);
        Serial.println("A");
      }
    #endif
  }
  
  // Check if it's time to send data (every 60 seconds)
  if(currentMillis - lastDataSend >= DATA_SEND_INTERVAL) {
    if(accumulator.sampleCount > 0) {
      Serial.println("\n⏱ 60 seconds elapsed - transitioning to WiFi connect...");
      currentState = STATE_WIFI_CONNECT;
    } else {
      Serial.println("⚠ No samples collected - skipping transmission");
      lastDataSend = currentMillis;
    }
  }
}

// ============================================
// STATE: WiFi Connect
// ============================================
void stateWiFiConnect(unsigned long currentMillis) {
  Serial.println("\n========================================");
  Serial.println("  WIFI CONNECT STATE");
  Serial.println("========================================");
  
  enableWiFi();
  
  // Try to connect with timeout
  unsigned long connectStart = millis();
  bool connected = false;
  
  // Try to connect using saved credentials
  Serial.println("Attempting to connect to saved WiFi network...");
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(); // Use saved credentials
  
  int connectAttempts = 0;
  while(millis() - connectStart < WIFI_CONNECT_TIMEOUT) {
    if(WiFi.status() == WL_CONNECTED) {
      connected = true;
      break;
    }
    Serial.print(".");
    delay(500);
    connectAttempts++;
    
    // Feed watchdog during connection attempt
    if(connectAttempts % 4 == 0) {  // Every 2 seconds
      esp_task_wdt_reset();
    }
    
    // Check if we're stuck (shouldn't happen with timeout, but safety check)
    if(millis() - connectStart > WIFI_CONNECT_TIMEOUT) {
      Serial.println("\n⚠️ WiFi connection timeout exceeded!");
      break;
    }
  }
  
  Serial.println();
  
  if(connected) {
    Serial.println("✓ WiFi connected!");
    Serial.print("  IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("  RSSI: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
    
    // Sync time with NTP
    configTime(0, 0, "pool.ntp.org");
    
    wifiStuckDetected = false;  // Reset stuck detection
    currentState = STATE_DATA_SEND;
  } else {
    Serial.println("✗ WiFi connection failed (timeout)");
    Serial.println("  Discarding accumulated data to prevent overflow");
    Serial.println("  (Hold BOOT button for 5 seconds to enter config mode if WiFi changed)");
    
    // CRITICAL: Discard data during long outages
    accumulator.reset();
    lastDataSend = millis();
    
    currentState = STATE_WIFI_DISCONNECT;
  }
}

// ============================================
// STATE: Data Send
// ============================================
void stateDataSend(unsigned long currentMillis) {
  Serial.println("\n========================================");
  Serial.println("  DATA SEND STATE");
  Serial.println("========================================");
  
  // Check if Supabase is configured
  if(supabaseUrl.length() == 0 || machineUUID.length() == 0 || machineAPIKey.length() == 0) {
    Serial.println("⚠ Supabase not fully configured - launching config portal...");
    Serial.println("  Missing:");
    if(supabaseUrl.length() == 0) Serial.println("    - Supabase URL");
    if(machineUUID.length() == 0) Serial.println("    - Machine UUID");
    if(machineAPIKey.length() == 0) Serial.println("    - Machine API Key");
    launchConfigPortal();
    currentState = STATE_WIFI_DISCONNECT;
    return;
  }
  
  // Calculate averages
  float avgTempMotor = accumulator.tempMotorSum / accumulator.sampleCount;
  float avgTempExterior = accumulator.tempExteriorSum / accumulator.sampleCount;
  float avgTempInterior = accumulator.tempInteriorSum / accumulator.sampleCount;
  float avgCtCurrent = accumulator.ctCurrentSum / accumulator.sampleCount;
  float avgCtVoltage = accumulator.ctVoltageSum / accumulator.sampleCount;
  float avgApparentPower = accumulator.apparentPowerSum / accumulator.sampleCount;
  float avgYellowVoltage = accumulator.yellowVoltageSum / accumulator.sampleCount;
  float avgGreenVoltage = accumulator.greenVoltageSum / accumulator.sampleCount;
  float avgBrownVoltage = accumulator.brownVoltageSum / accumulator.sampleCount;
  float avgBlackVoltage = accumulator.blackVoltageSum / accumulator.sampleCount;
  bool tankFullAvg = (accumulator.tankFullCount > (accumulator.sampleCount / 2));
  
  // Print averaged data
  Serial.println("\nAveraged Data (from " + String(accumulator.sampleCount) + " samples):");
  Serial.println("  Temp Motor:    " + String(avgTempMotor, 2) + " °C");
  Serial.println("  Temp Exterior: " + String(avgTempExterior, 2) + " °C");
  Serial.println("  Temp Interior: " + String(avgTempInterior, 2) + " °C");
  Serial.println("  CT Current:    " + String(avgCtCurrent, 2) + " A");
  Serial.println("  Tank:          " + String(tankFullAvg ? "FULL" : "EMPTY"));
  
  // Build JSON payload
  bool success = sendToSupabase(
    avgTempMotor, avgTempExterior, avgTempInterior,
    avgCtCurrent, avgCtVoltage, avgApparentPower,
    avgYellowVoltage, avgGreenVoltage, avgBrownVoltage, avgBlackVoltage,
    tankFullAvg,
    accumulator.yellowStatus, accumulator.greenStatus,
    accumulator.brownStatus, accumulator.blackStatus,
    accumulator.fanSpeed
  );
  
  if(success) {
    Serial.println("✓ Data sent successfully!");
  } else {
    Serial.println("✗ Data send failed");
  }
  
  // Reset accumulator for next cycle
  accumulator.reset();
  lastDataSend = millis();
  
  currentState = STATE_WIFI_DISCONNECT;
}

// ============================================
// STATE: WiFi Disconnect
// ============================================
void stateWiFiDisconnect(unsigned long currentMillis) {
  Serial.println("\n========================================");
  Serial.println("  WIFI DISCONNECT STATE");
  Serial.println("========================================");
  
  disableWiFi();
  
  Serial.println("✓ WiFi disabled - returning to sensor reading");
  Serial.println("========================================\n");
  
  currentState = STATE_SENSOR_READING;
}

// ============================================
// Enable WiFi
// ============================================
void enableWiFi() {
  if(!wifiEnabled) {
    Serial.println("🔌 Enabling WiFi...");
    WiFi.mode(WIFI_STA);
    wifiEnabled = true;
    wifiOnStartTime = millis();
  }
}

// ============================================
// Disable WiFi (CRITICAL for ADC stability)
// ============================================
void disableWiFi() {
  if(wifiEnabled) {
    unsigned long wifiOnDuration = millis() - wifiOnStartTime;
    Serial.print("🔌 Disabling WiFi (was on for ");
    Serial.print(wifiOnDuration / 1000.0, 1);
    Serial.println(" seconds)");
    
    WiFi.disconnect(true);
    WiFi.mode(WIFI_OFF);
    wifiEnabled = false;
    
    // Small delay to ensure WiFi is fully off
    delay(100);
  }
}

// ============================================
// Safety Net: Force WiFi Off After Timeout
// ============================================
void checkWiFiTimeout() {
  if(wifiEnabled && (millis() - wifiOnStartTime > MAX_WIFI_ON_TIME)) {
    Serial.println("\n⚠ SAFETY NET TRIGGERED: WiFi on too long (>2 min)");
    Serial.println("  Forcing WiFi disconnect...");
    disableWiFi();
    currentState = STATE_SENSOR_READING;
  }
}

// ============================================
// Read Temperature Sensor
// ============================================
float readTemperature(DallasTemperature &sensor) {
  sensor.requestTemperatures();
  float temp = sensor.getTempCByIndex(0);
  
  // Validate reading
  if(temp == DEVICE_DISCONNECTED_C || temp < -50 || temp > 125) {
    return -999.0; // Error value
  }
  
  return temp;
}

// ============================================
// Read CT Sensor
// ============================================
void readCTSensor(float &current, float &voltage, float &power) {
  int adcValue = analogRead(CT_PIN);
  voltage = (adcValue / 4095.0) * ADC_VREF;
  
  double irms = emon1.calcIrms(1480);
  current = irms;
  
  if(current < MIN_CURRENT_THRESHOLD) {
    current = 0.0;
  } else {
    current = constrain(current, 0, MAX_CURRENT_THRESHOLD);
  }
  
  power = current * LINE_VOLTAGE;
}

// ============================================
// Read Pickup Inputs
// ============================================
void readPickups(float &yVolt, float &gVolt, float &bVolt, float &blVolt,
                 String &yStatus, String &gStatus, String &bStatus, String &blStatus,
                 int &fanSpeed) {
  yVolt = readStableVoltage(GPIO_YELLOW_EXHAUST, yellowFilter);
  gVolt = readStableVoltage(GPIO_GREEN_FAN, greenFilter);
  bVolt = readStableVoltage(GPIO_BROWN_PUMP, brownFilter);
  blVolt = readStableVoltage(GPIO_BLACK_DRAIN, blackFilter);
  
  filterIndex = (filterIndex + 1) % FILTER_SIZE;
  
  yStatus = getStatus(yVolt);
  gStatus = getStatus(gVolt);
  bStatus = getStatus(bVolt);
  blStatus = getStatus(blVolt);
  
  fanSpeed = calculateFanSpeed(gVolt, gStatus);
}

// ============================================
// Read Stable Voltage with Averaging
// ============================================
float readStableVoltage(int pin, float* filterArray) {
  // Discard first readings for ADC settling
  for(int i = 0; i < 10; i++) {
    analogRead(pin);
    delayMicroseconds(ADC_SAMPLE_DELAY_US);
  }
  
  // Average samples
  long sum = 0;
  for(int i = 0; i < ADC_SAMPLES; i++) {
    sum += analogRead(pin);
    delayMicroseconds(ADC_SAMPLE_DELAY_US);
  }
  
  float avgADC = sum / (float)ADC_SAMPLES;
  float voltage = (avgADC / 4095.0) * ADC_VREF;
  
  // Apply moving average filter
  filterArray[filterIndex] = voltage;
  
  float filteredSum = 0;
  for(int i = 0; i < FILTER_SIZE; i++) {
    filteredSum += filterArray[i];
  }
  
  return filteredSum / FILTER_SIZE;
}

// ============================================
// Get Pickup Status from Voltage
// ============================================
String getStatus(float voltage) {
  if(voltage < VOLTAGE_DISCONNECTED_MAX) {
    return "DISCONNECTED";
  } else if(voltage >= VOLTAGE_ON_MIN && voltage <= VOLTAGE_ON_MAX) {
    return "ON";
  } else if(voltage >= VOLTAGE_OFF_MIN) {
    return "OFF";
  } else {
    return "UNKNOWN";
  }
}

// ============================================
// Calculate Fan Speed
// ============================================
int calculateFanSpeed(float voltage, String status) {
  if(status != "ON") {
    return 0;
  }
  
  if(voltage >= FAN_VOLTAGE_100_SPEED && voltage <= FAN_VOLTAGE_0_SPEED) {
    float speedFloat = 100.0 - ((voltage - FAN_VOLTAGE_100_SPEED) / 
                      (FAN_VOLTAGE_0_SPEED - FAN_VOLTAGE_100_SPEED)) * 100.0;
    return constrain((int)speedFloat, 0, 100);
  } else if(voltage < FAN_VOLTAGE_100_SPEED) {
    return 100;
  } else {
    return 0;
  }
}

// ============================================
// Determine Overall Machine Status
// ============================================
String determineOverallStatus(float tMotor, float ctCurrent, bool tankFull,
                               String yStatus, String gStatus, String bStatus) {
  // CRITICAL ERRORS (Red)
  if(tMotor > 70.0) return "error";  // Motor overheating
  if(tMotor < -50.0) return "error";  // Sensor disconnected
  if(gStatus == "ON" && ctCurrent < 0.5) return "error";  // Fan on but no current (motor failure)
  if(bStatus == "ON" && !tankFull) return "error";  // Pump on but no water (will burn out pump)
  
  // WARNINGS (Orange)
  if(tMotor > 60.0) return "warning";  // Motor running hot
  if(tMotor == -999.0) return "warning";  // Sensor error
  if(yStatus == "DISCONNECTED" || gStatus == "DISCONNECTED" || 
     bStatus == "DISCONNECTED") return "warning";  // Pickup disconnected
  
  // ALL GOOD (Green)
  return "good";
}

// ============================================
// Send Data to Supabase (DASHBOARD COMPATIBLE)
// ============================================
bool sendToSupabase(float tMotor, float tExterior, float tInterior,
                    float ctCurrent, float ctVoltage, float appPower,
                    float yVolt, float gVolt, float bVolt, float blVolt,
                    bool tankFull,
                    String yStatus, String gStatus, String bStatus, String blStatus,
                    int fanSpeed) {
  
  if(WiFi.status() != WL_CONNECTED) {
    Serial.println("✗ WiFi not connected");
    return false;
  }
  
  HTTPClient http;
  WiFiClientSecure client;
  
  // Set client timeout to prevent hanging
  client.setTimeout(HTTP_POST_TIMEOUT / 1000);  // Convert to seconds
  http.setTimeout(HTTP_POST_TIMEOUT);
  http.setConnectTimeout(5000);  // 5 second connection timeout
  
  // Direct to Edge Function endpoint (secure - validates machine API key)
  String endpoint = supabaseUrl + "/functions/v1/esp32-data-receiver";
  
  // Build JSON payload - RAW SENSOR DATA ONLY
  StaticJsonDocument<768> doc;
  
  // ========================================
  // RAW SENSOR READINGS
  // ========================================
  doc["machine_id"] = machineUUID;
  
  // Temperatures (°C)
  doc["motor_temp"] = tMotor;           // Temp 1
  doc["outside_temp"] = tExterior;      // Temp 2
  doc["inside_temp"] = tInterior;       // Temp 3
  
  // Current & Power
  doc["current"] = ctCurrent;           // Amps
  doc["voltage"] = LINE_VOLTAGE;        // 230V constant
  doc["power"] = appPower;              // Watts (V × I)
  
  // Tank Status
  doc["has_water"] = tankFull;          // Water full/empty (bool)
  
  // ========================================
  // RAW PICKUP VOLTAGES (for server-side logic)
  // ========================================
  doc["exhaust_voltage"] = yVolt;       // Voltage 1 (Yellow wire)
  doc["fan_voltage"] = gVolt;           // Voltage 2 (Green wire)
  doc["pump_voltage"] = bVolt;          // Voltage 3 (Brown wire)
  doc["drain_voltage"] = blVolt;        // Voltage 4 (Black wire)
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  Serial.println("\nPOST to Supabase (RAW DATA):");
  Serial.println("  URL: " + endpoint);
  Serial.println("  Machine ID: " + machineUUID);
  Serial.print("  Temps: Motor=");
  Serial.print(tMotor);
  Serial.print("°C, Out=");
  Serial.print(tExterior);
  Serial.print("°C, In=");
  Serial.print(tInterior);
  Serial.println("°C");
  Serial.print("  Current: ");
  Serial.print(ctCurrent);
  Serial.println(" A");
  
  #if DEBUG_MODE
    Serial.println("  Full Payload: " + jsonString);
  #endif
  
  // Send HTTP POST to Edge Function (validates machine API key)
  // Feed watchdog before potentially long operation
  esp_task_wdt_reset();
  
  unsigned long postStart = millis();
  http.begin(client, endpoint);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabaseAnonKey);  // Still needed for Supabase routing
  http.addHeader("Authorization", "Bearer " + machineAPIKey);  // Use machine's key
  
  int httpCode = http.POST(jsonString);
  unsigned long postDuration = millis() - postStart;
  
  // Feed watchdog after operation
  esp_task_wdt_reset();
  
  // Check if operation took too long (stalled)
  if(postDuration > HTTP_POST_TIMEOUT) {
    Serial.println("⚠️ WARNING: HTTP POST took longer than timeout!");
    Serial.print("Duration: ");
    Serial.print(postDuration);
    Serial.println("ms");
  }
  
  Serial.print("  HTTP Code: ");
  Serial.print(httpCode);
  Serial.print("  (took ");
  Serial.print(postDuration / 1000.0, 1);
  Serial.println(" seconds)");
  
  bool success = false;
  
  if(httpCode == 201 || httpCode == 200) {
    success = true;
    Serial.println("  ✓ Success!");
  } else {
    Serial.println("  ✗ Error:");
    Serial.println("  " + http.getString());
    
    // Helpful error messages
    if(httpCode == 401) {
      Serial.println("  → Check Machine API Key - may be invalid or expired");
    } else if(httpCode == 404) {
      Serial.println("  → Check Machine UUID - may not exist in database");
    } else if(httpCode == 422) {
      Serial.println("  → Invalid JSON format or missing required fields");
    }
  }
  
  http.end();
  
  return success;
}

// ============================================
// Launch WiFiManager Config Portal
// ============================================
void launchConfigPortal() {
  Serial.println("\n========================================");
  Serial.println("  CONFIGURATION PORTAL");
  Serial.println("========================================");
  Serial.println("Starting WiFiManager config portal...");
  Serial.println("Connect to WiFi network: 'ESP32_HVAC_Setup'");
  Serial.println("Navigate to: 192.168.4.1");
  Serial.println("========================================\n");
  
  // Start config portal (will timeout after 3 minutes)
  wifiManager.startConfigPortal("ESP32_HVAC_Setup");
  
  // After config is saved
  if(WiFi.status() == WL_CONNECTED) {
    Serial.println("✓ WiFi configured and connected!");
  } else {
    Serial.println("⚠ Config portal timed out - will retry on next boot");
    // Don't restart - let device continue (user can try again later)
  }
}

// ============================================
// WiFiManager Save Config Callback
// ============================================
void saveConfigCallback() {
  Serial.println("\n✓ Config saved - retrieving parameters...");
  
  // Get ONLY machine-specific parameters (Supabase credentials are hardcoded)
  machineUUID = wifiManager.server->arg("machine_uuid");
  machineAPIKey = wifiManager.server->arg("api_key");
  
  // Save ONLY machine-specific config to preferences
  preferences.putString("machine_uuid", machineUUID);
  preferences.putString("api_key", machineAPIKey);
  
  Serial.println("  Machine UUID: " + machineUUID);
  Serial.print("  Machine API Key: ");
  Serial.println(machineAPIKey.length() > 0 ? "Set ✓" : "MISSING ⚠");
  Serial.println("  Config saved to flash memory");
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
      WiFi.disconnect(true);
      WiFi.mode(WIFI_OFF);
      
      // Clear preferences
      preferences.begin("iot-nexus", false);
      preferences.clear();
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
// Perform Auto Reset (Soft Reset - 6 hours)
// ============================================
void performAutoReset() {
  Serial.println("\n========================================");
  Serial.println("  AUTO RESET (6 HOURS ELAPSED)");
  Serial.println("========================================");
  Serial.println("Performing soft reset to clear RAM...");
  
  delay(1000);
  ESP.restart();
}

