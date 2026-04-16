/*
 * ============================================
 * ESP32 - UNIVERSAL (All Manufacturers) - OPTIMIZED
 * Cool Breeze Nexus Integration
 * ============================================
 * 
 * VERSION: 4.0.0 (Universal - supports all manufacturers)
 * COMPATIBILITY: ESP32 Arduino Core 2.0.11 - 3.0.x
 * 
 * MANUFACTURERS SUPPORTED:
 * - Cirrus (evaporative coolers)
 * - CoolBreeze (evaporative coolers with heat)
 * - Alliance (heatpumps)
 * - Any future manufacturers (just add GPIO pins)
 * 
 * GPIO MAPPING (All 6 voltage inputs):
 * - GPIO5:  Voltage Input 5 (FLOAT_PIN or Heat Relay for heatpumps)
 * - GPIO32: Voltage Input 2 (Brown - Pump)
 * - GPIO33: Voltage Input 3 (Black - Drain)
 * - GPIO34: Voltage Input 4 (Yellow - Exhaust)
 * - GPIO35: Voltage Input 1 (Green - Fan)
 * - GPIO25: Voltage Input 6 (Optional - for future expansion)
 * 
 * HOW IT WORKS:
 * 1. Arduino sends ALL 6 voltage inputs (raw data)
 * 2. Supabase determines manufacturer from machine_id
 * 3. Database triggers process data according to manufacturer logic
 * 
 * NO MANUFACTURER-SPECIFIC CODE IN ARDUINO!
 * All manufacturer logic is in Supabase database triggers
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
const String DEVICE_ID = "UNIVERSAL";
const String FIRMWARE_VERSION = "4.0.0-UNIVERSAL";

// ============================================
// TIMING CONSTANTS - OPTIMIZED FOR 2-MINUTE UPDATES
// ============================================
const unsigned long SENSOR_READ_INTERVAL = 1000;        // 1 second
const unsigned long DATA_SEND_INTERVAL = 120000;        // 120 seconds (2 minutes)
const unsigned long WIFI_CONNECT_TIMEOUT = 30000;       // 30 seconds
const unsigned long HTTP_POST_TIMEOUT = 10000;          // 10 seconds
const unsigned long MAX_WIFI_ON_TIME = 60000;           // 1 minute (safety net)
const unsigned long AUTO_RESET_INTERVAL = 21600000;     // 6 hours
const unsigned long BOOT_BUTTON_HOLD_TIME = 10000;      // 10 seconds (WiFi reset only)
const unsigned long WATCHDOG_TIMEOUT = 60;              // 60 seconds
const unsigned long WIFI_STUCK_TIMEOUT = 120000;        // 2 minutes

// ============================================
// Pin Definitions - ALL 6 VOLTAGE INPUTS
// ============================================
const int TEMP_PIN_MOTOR = 21;
const int TEMP_PIN_EXTERIOR = 22;
const int TEMP_PIN_INTERIOR = 23;
const int CT_PIN = 36;
const int BOOT_BUTTON_PIN = 0;

// ALL 6 VOLTAGE INPUTS (Universal - works for all manufacturers)
const int GPIO_INPUT_1 = 35;  // Green - Fan (Cirrus/CoolBreeze)
const int GPIO_INPUT_2 = 32;  // Brown - Pump (Cirrus/CoolBreeze)
const int GPIO_INPUT_3 = 33;  // Black - Drain (Cirrus/CoolBreeze)
const int GPIO_INPUT_4 = 34;  // Yellow - Exhaust (Cirrus/CoolBreeze)
const int GPIO_INPUT_5 = 5;   // FLOAT or Heat Relay (Evap coolers use as float, Heatpumps use as heat relay)
const int GPIO_INPUT_6 = 25;  // Optional - for future expansion

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
const float CT_CALIBRATION = 30.0;

// ============================================
// ADC Calibration
// ============================================
esp_adc_cal_characteristics_t adc1_chars;
const int ADC_ATTEN = ADC_ATTEN_DB_11;
const int ADC_WIDTH = ADC_WIDTH_BIT_12;
const int ADC_SAMPLE_DELAY_US = 150;

// ============================================
// WiFiManager Configuration
// ============================================
WiFiManager wifiManager;
const char* AP_SSID = "HVACmonitor-Setup";
// No password - open access point for easy setup

// ============================================
// WiFi & Supabase Configuration
// ============================================
Preferences preferences;
const char* PREF_NAMESPACE = "coolbreeze";
const char* PREF_MACHINE_ID = "machine_id";
const char* PREF_API_KEY = "api_key";
const char* PREF_UPTIME = "uptime";
const char* PREF_WIFI_SSID = "wifi_ssid";
const char* PREF_WIFI_PASS = "wifi_pass";

// HARDCODED Supabase credentials (same for all devices)
const char* SUPABASE_URL = "https://wjyanxstvbiqefmgpccb.supabase.co";
// Supabase credentials should be provisioned per device (do not hardcode secrets in firmware)
const char* SUPABASE_ANON_KEY = "";

// Per-device configuration
String supabaseUrl = "";
String supabaseAnonKey = "";
String supabaseFunction = "esp32-data-receiver";
String machineId = "";
String apiKey = "";

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

// Sensor reading averages
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

// ALL 6 voltage inputs (universal)
float voltage1 = 0;  // GPIO 35 - Fan
float voltage2 = 0;  // GPIO 32 - Pump
float voltage3 = 0;  // GPIO 33 - Drain
float voltage4 = 0;  // GPIO 34 - Exhaust
float voltage5 = 0;  // GPIO 5 - Float/Heat Relay
float voltage6 = 0;  // GPIO 25 - Optional

// Last valid temperature readings
float lastValidMotorTemp = 25.0;
float lastValidExteriorTemp = 25.0;
float lastValidInteriorTemp = 25.0;

// Temperature validation constants
#define TEMP_ERROR_DISCONNECTED -127.0
#define TEMP_ERROR_INVALID -999.0
#define TEMP_MIN_VALID -50.0
#define TEMP_MAX_VALID 120.0

// ============================================
// Setup Function
// ============================================
void setup() {
  Serial.begin(115200);
  delay(2000);
  
  Serial.println("\n\n============================================");
  Serial.println("ESP32 UNIVERSAL - All Manufacturers");
  Serial.println("Version: " + FIRMWARE_VERSION);
  Serial.println("============================================\n");
  
  preferences.begin(PREF_NAMESPACE, false);
  loadConfiguration();
  initializeSensors();
  initializeWiFiManager();
  
  bootTime = millis();
  
  lastAutoReset = millis();
  lastUptimeUpdate = millis();
  lastSensorRead = millis();
  lastDataSend = millis();
  lastWatchdogFeed = millis();
  
  pinMode(BOOT_BUTTON_PIN, INPUT_PULLUP);
  
  esp_task_wdt_deinit();
  esp_task_wdt_config_t wdt_config = {
    .timeout_ms = (uint32_t)WATCHDOG_TIMEOUT * 1000,
    .idle_core_mask = 0,
    .trigger_panic = true
  };
  esp_task_wdt_init(&wdt_config);
  esp_task_wdt_add(NULL);
  
  WiFi.mode(WIFI_OFF);
  wifiEnabled = false;
  currentState = STATE_SENSOR_READING;
  
  Serial.println("Setup complete. Starting main loop...\n");
  Serial.println("Hold BOOT button for 10 seconds to reset WiFi (UUID/API key preserved)");
}

// ============================================
// Main Loop
// ============================================
void loop() {
  unsigned long currentMillis = millis();
  
  if(currentMillis - lastWatchdogFeed >= 1000) {
    esp_task_wdt_reset();
    lastWatchdogFeed = currentMillis;
  }
  
  checkBootButton(currentMillis);
  
  if(currentMillis - lastAutoReset >= AUTO_RESET_INTERVAL) {
    Serial.println("Auto reset triggered (6 hours)");
    delay(1000);
    ESP.restart();
  }
  
  if(currentMillis - lastUptimeUpdate >= 1000) {
    updateUptime();
    lastUptimeUpdate = currentMillis;
  }
  
  checkWiFiStuck(currentMillis);
  
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
  
  delay(10);
}

// ============================================
// State Functions (abbreviated for space)
// ============================================
void stateSensorReading(unsigned long currentMillis) {
  if(currentMillis - lastSensorRead >= SENSOR_READ_INTERVAL) {
    if(wifiEnabled) {
      WiFi.mode(WIFI_OFF);
      wifiEnabled = false;
      delay(50);
    }
    
    readSensors();
    
    motorTempSum += motorTemp;
    exteriorTempSum += exteriorTemp;
    interiorTempSum += interiorTemp;
    currentSum += current;
    sensorReadCount++;
    
    lastSensorRead = currentMillis;
  }
  
  if(currentMillis - lastDataSend >= DATA_SEND_INTERVAL) {
    if(sensorReadCount > 0) {
      Serial.println("\n⏱ 120 seconds elapsed - transitioning to WiFi connect...");
      currentState = STATE_WIFI_CONNECT;
    } else {
      lastDataSend = currentMillis;
    }
  }
}

void stateWiFiConnect(unsigned long currentMillis) {
  static bool connecting = false;
  static unsigned long connectStart = 0;
  
  if(!connecting) {
    Serial.println("Connecting to WiFi...");
    WiFi.mode(WIFI_STA);
    WiFi.begin();
    connecting = true;
    connectStart = millis();
  }
  
  if(WiFi.status() == WL_CONNECTED) {
    Serial.println("✓ WiFi connected!");
    wifiEnabled = true;
    wifiOnStartTime = millis();
    connecting = false;
    currentState = STATE_DATA_SEND;
  } else if(millis() - connectStart >= WIFI_CONNECT_TIMEOUT) {
    Serial.println("✗ WiFi connection failed");
    connecting = false;
    currentState = STATE_SENSOR_READING;
  }
}

void stateDataSend(unsigned long currentMillis) {
  static bool sending = false;
  
  if(!sending && wifiEnabled && WiFi.status() == WL_CONNECTED) {
    sending = true;
    
    float avgMotorTemp = motorTempSum / sensorReadCount;
    float avgExteriorTemp = exteriorTempSum / sensorReadCount;
    float avgInteriorTemp = interiorTempSum / sensorReadCount;
    float avgCurrent = currentSum / sensorReadCount;
    
    bool success = sendDataToSupabase(
      avgMotorTemp,
      avgExteriorTemp,
      avgInteriorTemp,
      avgCurrent
    );
    
    if(success) {
      Serial.println("✓ Data sent successfully!");
      motorTempSum = 0;
      exteriorTempSum = 0;
      interiorTempSum = 0;
      currentSum = 0;
      sensorReadCount = 0;
    }
    
    lastDataSend = currentMillis;
    sending = false;
    currentState = STATE_WIFI_DISCONNECT;
  }
}

void stateWiFiDisconnect(unsigned long currentMillis) {
  WiFi.disconnect();
  WiFi.mode(WIFI_OFF);
  wifiEnabled = false;
  Serial.println("✓ WiFi disabled");
  currentState = STATE_SENSOR_READING;
}

// ============================================
// Read Sensors
// ============================================
void readSensors() {
  sensorMotor.requestTemperatures();
  sensorExterior.requestTemperatures();
  sensorInterior.requestTemperatures();
  delay(750);
  
  motorTemp = readTemperatureWithValidation(sensorMotor, lastValidMotorTemp);
  exteriorTemp = readTemperatureWithValidation(sensorExterior, lastValidExteriorTemp);
  interiorTemp = readTemperatureWithValidation(sensorInterior, lastValidInteriorTemp);
  
  float rawCurrent = abs(emon1.calcIrms(1480));
  current = (rawCurrent < 0.1) ? 0.0 : rawCurrent;
  
  // Read ALL 6 voltage inputs (universal)
  voltage1 = readVoltage(GPIO_INPUT_1);  // Fan
  voltage2 = readVoltage(GPIO_INPUT_2);  // Pump
  voltage3 = readVoltage(GPIO_INPUT_3);  // Drain
  voltage4 = readVoltage(GPIO_INPUT_4);  // Exhaust
  voltage5 = readVoltage(GPIO_INPUT_5);  // Float/Heat Relay
  voltage6 = readVoltage(GPIO_INPUT_6);  // Optional
}

float readVoltage(int pin) {
  if (pin != 5 && pin != 25 && pin != 32 && pin != 33 && pin != 34 && pin != 35) {
    return 0.0;
  }
  
  uint32_t adc_reading = 0;
  for(int i = 0; i < 64; i++) {
    adc_reading += analogRead(pin);
    delayMicroseconds(ADC_SAMPLE_DELAY_US);
  }
  adc_reading /= 64;
  
  uint32_t voltage_mv = esp_adc_cal_raw_to_voltage(adc_reading, &adc1_chars);
  return (voltage_mv / 1000.0) * 4.0;
}

// ============================================
// Send Data to Supabase - UNIVERSAL FORMAT
// ============================================
bool sendDataToSupabase(float motorTemp, float outsideTemp, float insideTemp, float current) {
  if(WiFi.status() != WL_CONNECTED) {
    return false;
  }
  
  HTTPClient http;
  WiFiClientSecure client;
  client.setInsecure();
  client.setTimeout(HTTP_POST_TIMEOUT / 1000);
  
  String url = supabaseUrl + "/functions/v1/" + supabaseFunction;
  
  // UNIVERSAL JSON PAYLOAD - ALL 6 VOLTAGE INPUTS
  StaticJsonDocument<512> doc;
  doc["machine_id"] = machineId;
  
  // Temperature readings
  doc["motor_temp"] = motorTemp;
  doc["inside_temp"] = insideTemp;
  doc["outside_temp"] = outsideTemp;
  
  // Electrical readings
  doc["current"] = current;
  
  // ALL 6 VOLTAGE INPUTS (universal)
  // Supabase will map these based on manufacturer configuration
  doc["voltage_input_1"] = voltage1;  // Fan
  doc["voltage_input_2"] = voltage2;  // Pump
  doc["voltage_input_3"] = voltage3;  // Drain
  doc["voltage_input_4"] = voltage4;  // Exhaust
  doc["voltage_input_5"] = voltage5;  // Float/Heat Relay
  doc["voltage_input_6"] = voltage6;  // Optional
  
  doc["sensor_read_count"] = sensorReadCount;
  
  String jsonBody;
  serializeJson(doc, jsonBody);
  
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabaseAnonKey);
  http.addHeader("Authorization", "Bearer " + apiKey);
  http.setTimeout(HTTP_POST_TIMEOUT);
  
  Serial.println("Sending universal data...");
  if(DEBUG_MODE) {
    Serial.println("Payload: " + jsonBody);
  }
  
  esp_task_wdt_reset();
  int httpResponseCode = http.POST(jsonBody);
  
  bool success = (httpResponseCode == 201 || httpResponseCode == 200 || httpResponseCode == 429);
  http.end();
  esp_task_wdt_reset();
  
  return success;
}

// ============================================
// Helper Functions (abbreviated)
// ============================================
void initializeSensors() {
  sensorMotor.begin();
  sensorExterior.begin();
  sensorInterior.begin();
  emon1.current(CT_PIN, CT_CALIBRATION);
  esp_adc_cal_characterize(ADC_UNIT_1, (adc_atten_t)ADC_ATTEN, (adc_bits_width_t)ADC_WIDTH, 1100, &adc1_chars);
  analogSetAttenuation((adc_attenuation_t)ADC_ATTEN);
  analogSetWidth((adc_bits_width_t)ADC_WIDTH);
  Serial.println("Sensors initialized (Universal)");
}

bool isValidTemperature(float temp) {
  if (temp == TEMP_ERROR_DISCONNECTED || temp == TEMP_ERROR_INVALID) return false;
  if (temp < TEMP_MIN_VALID || temp > TEMP_MAX_VALID) return false;
  if (isnan(temp) || isinf(temp)) return false;
  return true;
}

float readTemperatureWithValidation(DallasTemperature &sensor, float &lastValid) {
  float reading = sensor.getTempCByIndex(0);
  if (isValidTemperature(reading)) {
    lastValid = reading;
    return reading;
  }
  return lastValid;
}

void checkBootButton(unsigned long currentMillis) {
  bool buttonState = digitalRead(BOOT_BUTTON_PIN) == LOW;
  
  if(buttonState && !bootButtonPressed) {
    bootButtonPressTime = currentMillis;
    bootButtonPressed = true;
  } else if(buttonState && bootButtonPressed) {
    if(currentMillis - bootButtonPressTime >= BOOT_BUTTON_HOLD_TIME) {
      Serial.println("Manual reset triggered - clearing WiFi only (Machine ID/API Key preserved)");
      // Only reset WiFi credentials, NOT UUID/API key
      preferences.remove(PREF_WIFI_SSID);
      preferences.remove(PREF_WIFI_PASS);
      WiFi.disconnect(true);  // Clear WiFi credentials from WiFiManager
      delay(2000);
      ESP.restart();
    }
  } else if(!buttonState && bootButtonPressed) {
    bootButtonPressed = false;
  }
}

void checkWiFiStuck(unsigned long currentMillis) {
  if(wifiEnabled && WiFi.status() != WL_CONNECTED) {
    if(!wifiStuckDetected) {
      wifiStuckStartTime = currentMillis;
      wifiStuckDetected = true;
    } else if(currentMillis - wifiStuckStartTime > WIFI_STUCK_TIMEOUT) {
      Serial.println("WiFi stuck - forcing reset!");
      delay(1000);
      ESP.restart();
    }
  } else {
    wifiStuckDetected = false;
  }
}

void initializeWiFiManager() {
  wifiManager.setConfigPortalTimeout(180);
  supabaseUrl = String(SUPABASE_URL);
  supabaseAnonKey = String(SUPABASE_ANON_KEY);
  
  // Custom HTML for WiFiManager interface
  // Primary color: #00BFFF (cyan/blue) matching website
  String customHead = "<style>"
    "body { font-family: Arial, sans-serif; background: #f5f5f5; }"
    "h1 { color: #00BFFF; font-size: 28px; font-weight: bold; margin-bottom: 10px; }"
    "h2 { color: #333; font-size: 20px; font-weight: bold; margin-bottom: 20px; }"
    ".button, input[type='submit'], button { background-color: #00BFFF !important; color: white !important; border: none !important; padding: 12px 24px !important; "
    "text-align: center !important; text-decoration: none !important; display: inline-block !important; font-size: 16px !important; "
    "margin: 4px 2px !important; cursor: pointer !important; border-radius: 4px !important; width: 200px !important; }"
    ".button:hover, input[type='submit']:hover, button:hover { background-color: #0099CC !important; }"
    ".button:active, input[type='submit']:active, button:active { background-color: #007AA3 !important; }"
    "a[href*='wifisave'] { background-color: #00BFFF !important; color: white !important; }"
    "</style>"
    "<script>"
    "window.onload = function() {"
    "  // Change 'Configure WiFi' button text to 'setup'"
    "  var buttons = document.getElementsByTagName('a');"
    "  for(var i = 0; i < buttons.length; i++) {"
    "    if(buttons[i].textContent.indexOf('Configure WiFi') !== -1) {"
    "      buttons[i].textContent = 'setup';"
    "    }"
    "  }"
    "  // Change title from 'WiFiManager' to 'CROWNTECHNOLOGIES'"
    "  var h1 = document.getElementsByTagName('h1');"
    "  if(h1.length > 0 && h1[0].textContent.indexOf('WiFiManager') !== -1) {"
    "    h1[0].textContent = 'CROWNTECHNOLOGIES';"
    "  }"
    "  // Customize save page message"
    "  if(window.location.href.indexOf('wifisave') !== -1) {"
    "    setTimeout(function() {"
    "      var body = document.body;"
    "      if(body) {"
    "        body.innerHTML = '<div style=\"text-align: center; padding: 40px; font-family: Arial, sans-serif;\">'"
    "          + '<h1 style=\"color: #00BFFF; font-size: 24px; margin-bottom: 20px;\">Network, UUID and API keys setup</h1>'"
    "          + '<p style=\"font-size: 18px; margin: 20px 0; color: #333;\">Close This page and reset the device</p>'"
    "          + '<p style=\"font-size: 16px; margin: 20px 0; color: #666;\">Wait 5 minutes and if no updated status visible on the website, Hold Boot button for 10 seconds and restart the process.</p>'"
    "          + '</div>';"
    "      }"
    "    }, 500);"
    "  }"
    "};"
    "</script>";
  
  String customMenu = "<div style='text-align: center; padding: 20px;'>"
    "<h1>CROWNTECHNOLOGIES</h1>"
    "<h2>" + String(AP_SSID) + "</h2>"
    "</div>";
  
  wifiManager.setCustomHeadElement(customHead.c_str());
  wifiManager.setCustomMenuHTML(customMenu.c_str());
  
  WiFiManagerParameter custom_machine_id("machine_id", "Machine UUID", machineId.c_str(), 100);
  WiFiManagerParameter custom_api_key("api_key", "Machine API Key", apiKey.c_str(), 200);
  
  wifiManager.addParameter(&custom_machine_id);
  wifiManager.addParameter(&custom_api_key);
  
  // Check for WiFi credentials in our namespace first, then WiFiManager's namespace
  String savedSSID = preferences.getString(PREF_WIFI_SSID, "");
  String savedPass = preferences.getString(PREF_WIFI_PASS, "");
  
  if(savedSSID.length() == 0) {
    // Fallback to WiFiManager's stored credentials (for backward compatibility)
    savedSSID = WiFi.SSID();
  }
  
  if(savedSSID.length() == 0) {
    Serial.println("No WiFi credentials - starting config portal...");
    if(!wifiManager.autoConnect(AP_SSID, NULL)) {
      Serial.println("Config portal timed out");
    }
    // After WiFiManager config, save SSID to our namespace
    savedSSID = WiFi.SSID();
    if(savedSSID.length() > 0) {
      preferences.putString(PREF_WIFI_SSID, savedSSID);
      // Password is stored by WiFiManager in its own namespace (cannot be retrieved)
      // Password is stored by WiFiManager in its own namespace
    }
  } else {
    // We have saved SSID from our namespace - try to connect
    // Note: Password might be in WiFiManager's namespace, so try both
    if(savedPass.length() > 0) {
      WiFi.begin(savedSSID.c_str(), savedPass.c_str());
    } else {
      // Try with saved SSID only (WiFiManager may have password)
      WiFi.begin(savedSSID.c_str());
    }
    // Wait briefly for connection attempt
    delay(100);
  }
  
  // Only update UUID/API key if they were actually changed (not empty)
  String newMachineId = String(custom_machine_id.getValue());
  String newApiKey = String(custom_api_key.getValue());
  
  if(newMachineId.length() > 0 && newMachineId != machineId) {
    machineId = newMachineId;
  }
  if(newApiKey.length() > 0 && newApiKey != apiKey) {
    apiKey = newApiKey;
  }
  
  // Save current WiFi SSID to our namespace if different (for consistency)
  String currentSSID = WiFi.SSID();
  if(currentSSID.length() > 0 && currentSSID != savedSSID) {
    preferences.putString(PREF_WIFI_SSID, currentSSID);
  }
  
  saveConfiguration();
  
  Serial.println("Machine ID: " + machineId);
}

void loadConfiguration() {
  supabaseUrl = String(SUPABASE_URL);
  supabaseAnonKey = String(SUPABASE_ANON_KEY);
  machineId = preferences.getString(PREF_MACHINE_ID, machineId.c_str());
  apiKey = preferences.getString(PREF_API_KEY, apiKey.c_str());
}

void saveConfiguration() {
  preferences.putString(PREF_MACHINE_ID, machineId);
  preferences.putString(PREF_API_KEY, apiKey);
}

void updateUptime() {
  static unsigned long lastUptimeSave = 0;
  unsigned long currentMillis = millis();
  
  // Handle millis() wrap (occurs after ~49.7 days)
  unsigned long elapsed = 0;
  if (lastUptimeSave == 0) {
    // First call - initialize with bootTime
    lastUptimeSave = bootTime > 0 ? bootTime : currentMillis;
    return;
  } else if (currentMillis >= lastUptimeSave) {
    // Normal case - no wrap
    elapsed = currentMillis - lastUptimeSave;
  } else {
    // millis() wrapped - calculate elapsed correctly
    elapsed = (ULONG_MAX - lastUptimeSave) + currentMillis + 1;
  }
  
  // Only update if at least 1 second has passed
  if (elapsed >= 1000) {
    unsigned long secondsToAdd = elapsed / 1000;
    unsigned long totalUptime = preferences.getULong64(PREF_UPTIME, 0);
    totalUptime += secondsToAdd;
    preferences.putULong64(PREF_UPTIME, totalUptime);
    lastUptimeSave = currentMillis;
  }
}

