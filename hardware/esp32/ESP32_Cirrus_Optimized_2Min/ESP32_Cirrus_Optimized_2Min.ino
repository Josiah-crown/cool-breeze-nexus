/*
 * ============================================
 * ESP32 - Cirrus Machine (12V Logic) - PRODUCTION
 * Cool Breeze Nexus Integration
 * ============================================
 * 
 * VERSION: 3.0.0-PROD (Production - No Debug Output)
 * COMPATIBILITY: ESP32 Arduino Core 2.0.11 - 3.0.x
 * 
 * OPTIMIZATIONS:
 * - Data transmission: Every 2 minutes (120 seconds)
 * - Reduced bandwidth usage by 75%
 * - No serial debugging - lightweight and fast
 * - Lower power consumption
 * 
 * FEATURES:
 * - WiFiManager for easy WiFi configuration
 * - Supabase HTTP POST integration
 * - WiFi/ADC conflict resolution (WiFi OFF during sensor reading)
 * - 2-minute averaged sensor readings
 * - Timeout mechanisms for slow/failed connections
 * - Automatic 6-month full reset (memory leak prevention)
 * - Auto reset every 6 hours (improved reliability)
 * - Watchdog timer (60s) to prevent stalls
 * - Boot button hold (5s) to enter config mode
 * - WiFi stuck detection and auto-recovery
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
// DEVICE CONFIGURATION
// ============================================
const String DEVICE_ID = "CIRRUS";
const String FIRMWARE_VERSION = "3.0.0-PROD";

// ============================================
// TIMING CONSTANTS
// ============================================
const unsigned long SENSOR_READ_INTERVAL = 1000;
const unsigned long DATA_SEND_INTERVAL = 120000;
const unsigned long WIFI_CONNECT_TIMEOUT = 30000;
const unsigned long HTTP_POST_TIMEOUT = 10000;
const unsigned long MAX_WIFI_ON_TIME = 60000;
const unsigned long AUTO_RESET_INTERVAL = 21600000;
const unsigned long SIX_MONTH_RESET = 15552000000ULL;
const unsigned long BOOT_BUTTON_HOLD_TIME = 5000;
const unsigned long WATCHDOG_TIMEOUT = 60;
const unsigned long WIFI_STUCK_TIMEOUT = 120000;

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
const int BOOT_BUTTON_PIN = 0;

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
const char* AP_SSID = "Cirrus-Setup";
// Avoid hardcoding passwords in firmware (set at provisioning time if required)
const char* AP_PASSWORD = "";

// ============================================
// WiFi & Supabase Configuration
// ============================================
Preferences preferences;
const char* PREF_NAMESPACE = "cirrus";
const char* PREF_MACHINE_ID = "machine_id";
const char* PREF_API_KEY = "api_key";
const char* PREF_UPTIME = "uptime";

const char* SUPABASE_URL = "https://wjyanxstvbiqefmgpccb.supabase.co";
// Supabase credentials should be provisioned per device (do not hardcode secrets in firmware)
const char* SUPABASE_ANON_KEY = "";

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

float motorTempSum = 0;
float exteriorTempSum = 0;
float interiorTempSum = 0;
float currentSum = 0;
int sensorReadCount = 0;

float motorTemp = 0;
float exteriorTemp = 0;
float interiorTemp = 0;
float current = 0;
bool hasWater = true;
float fanVoltage = 0;
float pumpVoltage = 0;
float drainVoltage = 0;
float exhaustVoltage = 0;

float lastValidMotorTemp = 25.0;
float lastValidExteriorTemp = 25.0;
float lastValidInteriorTemp = 25.0;

#define TEMP_ERROR_DISCONNECTED -127.0
#define TEMP_ERROR_INVALID -999.0
#define TEMP_MIN_VALID -50.0
#define TEMP_MAX_VALID 120.0

// ============================================
// Setup Function
// ============================================
void setup() {
  delay(2000);
  
  preferences.begin(PREF_NAMESPACE, false);
  loadConfiguration();
  initializeSensors();
  initializeWiFiManager();
  
  unsigned long totalUptimeSeconds = preferences.getULong64(PREF_UPTIME, 0);
  bootTime = millis();
  
  unsigned long uptimeMillis = totalUptimeSeconds * 1000ULL;
  if(uptimeMillis >= SIX_MONTH_RESET) {
    preferences.clear();
    delay(1000);
    ESP.restart();
  }
  
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
// Sensor Reading State
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
      currentState = STATE_WIFI_CONNECT;
    } else {
      lastDataSend = currentMillis;
    }
  }
}

// ============================================
// WiFi Connect State
// ============================================
void stateWiFiConnect(unsigned long currentMillis) {
  static bool connecting = false;
  static unsigned long connectStart = 0;
  
  if(!connecting) {
    WiFi.mode(WIFI_STA);
    WiFi.begin();
    connecting = true;
    connectStart = millis();
  }
  
  if(WiFi.status() == WL_CONNECTED) {
    wifiEnabled = true;
    wifiOnStartTime = millis();
    wifiStuckDetected = false;
    connecting = false;
    currentState = STATE_DATA_SEND;
  } else if(millis() - connectStart >= WIFI_CONNECT_TIMEOUT) {
    connecting = false;
    currentState = STATE_SENSOR_READING;
  } else {
    if(currentMillis - connectStart >= 500) {
      esp_task_wdt_reset();
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
    
    float avgMotorTemp = sensorReadCount > 0 ? motorTempSum / sensorReadCount : motorTemp;
    float avgExteriorTemp = sensorReadCount > 0 ? exteriorTempSum / sensorReadCount : exteriorTemp;
    float avgInteriorTemp = sensorReadCount > 0 ? interiorTempSum / sensorReadCount : interiorTemp;
    float avgCurrent = sensorReadCount > 0 ? currentSum / sensorReadCount : current;
    
    bool success = sendDataToSupabase(avgMotorTemp, avgExteriorTemp, avgInteriorTemp, avgCurrent);
    
    if(success) {
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
  
  if(currentMillis - disconnectStart >= 1000) {
    if(WiFi.status() == WL_CONNECTED) {
      WiFi.disconnect();
      delay(100);
    }
    WiFi.mode(WIFI_OFF);
    wifiEnabled = false;
    
    disconnecting = false;
    currentState = STATE_SENSOR_READING;
  }
  
  if(wifiEnabled && (currentMillis - wifiOnStartTime > MAX_WIFI_ON_TIME)) {
    WiFi.disconnect();
    WiFi.mode(WIFI_OFF);
    wifiEnabled = false;
    disconnecting = false;
    currentState = STATE_SENSOR_READING;
  }
}

// ============================================
// Initialize Sensors
// ============================================
void initializeSensors() {
  sensorMotor.begin();
  sensorExterior.begin();
  sensorInterior.begin();
  
  emon1.current(CT_PIN, CT_CALIBRATION);
  
  esp_adc_cal_characterize(ADC_UNIT_1, (adc_atten_t)ADC_ATTEN, (adc_bits_width_t)ADC_WIDTH, 1100, &adc1_chars);
  analogSetAttenuation((adc_attenuation_t)ADC_ATTEN);
  analogSetWidth((adc_bits_width_t)ADC_WIDTH);
  
  pinMode(FLOAT_PIN, INPUT_PULLUP);
}

// ============================================
// Validate Temperature Reading
// ============================================
bool isValidTemperature(float temp) {
  if (temp == TEMP_ERROR_DISCONNECTED || temp == TEMP_ERROR_INVALID) return false;
  if (temp < TEMP_MIN_VALID || temp > TEMP_MAX_VALID) return false;
  if (isnan(temp) || isinf(temp)) return false;
  return true;
}

// ============================================
// Read Temperature with Validation
// ============================================
float readTemperatureWithValidation(DallasTemperature &sensor, float &lastValid) {
  float reading = sensor.getTempCByIndex(0);
  if (isValidTemperature(reading)) {
    lastValid = reading;
    return reading;
  }
  return lastValid;
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
  
  hasWater = digitalRead(FLOAT_PIN) == LOW;
  
  fanVoltage = readVoltage(GPIO_GREEN_FAN);
  pumpVoltage = readVoltage(GPIO_BROWN_PUMP);
  drainVoltage = readVoltage(GPIO_BLACK_DRAIN);
  exhaustVoltage = readVoltage(GPIO_YELLOW_EXHAUST);
}

// ============================================
// Read Voltage
// ============================================
float readVoltage(int pin) {
  if (pin != 32 && pin != 33 && pin != 34 && pin != 35) return 0.0;
  
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
// Send Data to Supabase
// ============================================
bool sendDataToSupabase(float motorTemp, float outsideTemp, float insideTemp, float current) {
  if(WiFi.status() != WL_CONNECTED) return false;
  
  HTTPClient http;
  WiFiClientSecure client;
  client.setInsecure();
  client.setTimeout(HTTP_POST_TIMEOUT / 1000);
  
  String url = supabaseUrl + "/functions/v1/" + supabaseFunction;
  
  StaticJsonDocument<512> doc;
  doc["machine_id"] = machineId;
  doc["motor_temp"] = motorTemp;
  doc["inside_temp"] = insideTemp;
  doc["outside_temp"] = outsideTemp;
  doc["current"] = current;
  doc["has_water"] = hasWater;
  doc["voltage_input_1"] = fanVoltage;
  doc["voltage_input_2"] = pumpVoltage;
  doc["voltage_input_3"] = drainVoltage;
  doc["voltage_input_4"] = exhaustVoltage;
  doc["sensor_read_count"] = sensorReadCount;
  
  String jsonBody;
  serializeJson(doc, jsonBody);
  
  esp_task_wdt_reset();
  
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabaseAnonKey);
  http.addHeader("Authorization", "Bearer " + apiKey);
  http.setTimeout(HTTP_POST_TIMEOUT);
  http.setConnectTimeout(5000);
  
  int httpResponseCode = http.POST(jsonBody);
  
  bool success = (httpResponseCode == 201 || httpResponseCode == 200 || httpResponseCode == 429);
  
  http.end();
  esp_task_wdt_reset();
  
  return success;
}

// ============================================
// Check Boot Button
// ============================================
void checkBootButton(unsigned long currentMillis) {
  bool buttonState = digitalRead(BOOT_BUTTON_PIN) == LOW;
  
  if(buttonState && !bootButtonPressed) {
    bootButtonPressTime = currentMillis;
    bootButtonPressed = true;
  } else if(buttonState && bootButtonPressed) {
    unsigned long holdTime = currentMillis - bootButtonPressTime;
    if(holdTime >= BOOT_BUTTON_HOLD_TIME) {
      preferences.remove("wifi_ssid");
      preferences.remove("wifi_pass");
      preferences.end();
      wifiManager.resetSettings();
      delay(2000);
      ESP.restart();
    }
  } else if(!buttonState && bootButtonPressed) {
    bootButtonPressed = false;
  }
}

// ============================================
// Check for WiFi Stuck Condition
// ============================================
void checkWiFiStuck(unsigned long currentMillis) {
  if(wifiEnabled && WiFi.status() != WL_CONNECTED) {
    if(!wifiStuckDetected) {
      wifiStuckStartTime = currentMillis;
      wifiStuckDetected = true;
    } else {
      if(currentMillis - wifiStuckStartTime > WIFI_STUCK_TIMEOUT) {
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
  wifiManager.setConfigPortalTimeout(180);
  wifiManager.setAPStaticIPConfig(IPAddress(192,168,4,1), IPAddress(192,168,4,1), IPAddress(255,255,255,0));
  
  supabaseUrl = String(SUPABASE_URL);
  supabaseAnonKey = String(SUPABASE_ANON_KEY);
  
  WiFiManagerParameter custom_machine_id("machine_id", "Machine UUID (from Dashboard)", machineId.c_str(), 100);
  WiFiManagerParameter custom_api_key("api_key", "Machine API Key (from Dashboard)", apiKey.c_str(), 200);
  
  wifiManager.addParameter(&custom_machine_id);
  wifiManager.addParameter(&custom_api_key);
  
  String savedSSID = WiFi.SSID();
  if(savedSSID.length() == 0) {
    wifiManager.autoConnect(AP_SSID, AP_PASSWORD);
  } else {
    WiFi.mode(WIFI_STA);
    WiFi.begin();
    unsigned long connectStart = millis();
    while(WiFi.status() != WL_CONNECTED && (millis() - connectStart < 10000)) {
      delay(500);
    }
  }
  
  machineId = String(custom_machine_id.getValue());
  apiKey = String(custom_api_key.getValue());
  saveConfiguration();
}

// ============================================
// Load Configuration
// ============================================
void loadConfiguration() {
  supabaseUrl = String(SUPABASE_URL);
  supabaseAnonKey = String(SUPABASE_ANON_KEY);
  machineId = preferences.getString(PREF_MACHINE_ID, machineId.c_str());
  apiKey = preferences.getString(PREF_API_KEY, apiKey.c_str());
}

// ============================================
// Save Configuration
// ============================================
void saveConfiguration() {
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
