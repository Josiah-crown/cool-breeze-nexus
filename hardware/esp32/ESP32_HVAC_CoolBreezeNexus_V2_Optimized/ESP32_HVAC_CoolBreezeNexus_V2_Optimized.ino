/*
 * ============================================
 * ESP32 R32 - Cool Breeze Nexus Integration
 * Production HVAC Monitoring System - PRODUCTION
 * ============================================
 * 
 * VERSION: 2.2.0-PROD (Production - No Debug Output)
 * COMPATIBILITY: ESP32 Arduino Core 2.0.11 - 3.0.x
 * 
 * OPTIMIZATIONS:
 * - Data transmission: Every 2 minutes (120 seconds)
 * - Reduced bandwidth usage by 50%
 * - No serial debugging - lightweight and fast
 * - Lower power consumption
 * 
 * FEATURES:
 * - WiFiManager for easy WiFi configuration
 * - Supabase HTTP POST integration (Dashboard Compatible)
 * - WiFi/ADC conflict resolution (WiFi OFF during sensor reading)
 * - 2-minute averaged sensor readings
 * - Timeout mechanisms for slow/failed connections
 * - Automatic 6-month full reset (memory leak prevention)
 * - Auto reset every 6 hours (improved reliability)
 * - Watchdog timer (60s) to prevent stalls
 * - Boot button hold (5s) to enter config mode
 * - WiFi stuck detection and auto-recovery
 * - RTC memory for persistent uptime tracking
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
// DEVICE CONFIGURATION
// ============================================
const String DEVICE_ID = "R32";
const String FIRMWARE_VERSION = "2.2.0-PROD";

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

const float VOLTAGE_DISCONNECTED_MAX = 0.5;
const float VOLTAGE_ON_MIN = 0.8;
const float VOLTAGE_ON_MAX = 2.632;
const float VOLTAGE_OFF_MIN = 2.807;

const float FAN_VOLTAGE_100_SPEED = 1.053;
const float FAN_VOLTAGE_0_SPEED = 2.035;

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

const char* SUPABASE_URL = "https://wjyanxstvbiqefmgpccb.supabase.co";
// Supabase credentials should be provisioned per device (do not hardcode secrets in firmware)
const char* SUPABASE_ANON_KEY = "";

String supabaseUrl = "";
String supabaseAnonKey = "";
String machineUUID = "";
String machineAPIKey = "";

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
void loadConfiguration();
void saveConfiguration();
void initializeWiFiManager();

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
  delay(2000);
  
  if(!rtcInitialized) {
    totalUptimeSeconds = 0;
    lastResetTime = 0;
    rtcInitialized = true;
  }
  
  bootTime = millis();
  lastAutoReset = bootTime;
  lastWatchdogFeed = bootTime;
  
  pinMode(BOOT_BUTTON_PIN, INPUT_PULLUP);
  
  unsigned long uptimeMillis = totalUptimeSeconds * 1000ULL;
  if(uptimeMillis >= SIX_MONTH_RESET) {
    preferences.begin("iot-nexus", false);
    preferences.clear();
    preferences.end();
    totalUptimeSeconds = 0;
    lastResetTime = 0;
    ESP.restart();
  }
  
  preferences.begin("iot-nexus", false);
  
  loadConfiguration();
  initializeWiFiManager();
  
  initializeHardware();
  
  esp_task_wdt_deinit();
  #if ESP_ARDUINO_VERSION >= ESP_ARDUINO_VERSION_VAL(3, 0, 0)
    esp_task_wdt_config_t twdt_config = {
      .timeout_ms = (uint32_t)WATCHDOG_TIMEOUT * 1000,
      .idle_core_mask = 0,
      .trigger_panic = true
    };
    esp_task_wdt_init(&twdt_config);
    esp_task_wdt_add(NULL);
  #else
    esp_task_wdt_init(WATCHDOG_TIMEOUT, true);
    esp_task_wdt_add(NULL);
  #endif
  
  WiFi.mode(WIFI_OFF);
  wifiEnabled = false;
  
  currentState = STATE_SENSOR_READING;
  accumulator.reset();
}

// ============================================
// Initialize Hardware
// ============================================
void initializeHardware() {
  analogSetAttenuation(ADC_11db);
  analogSetWidth(12);
  esp_adc_cal_characterize(ADC_UNIT_1, (adc_atten_t)ADC_ATTEN_DB_11, (adc_bits_width_t)ADC_WIDTH_BIT_12, 1100, &adc_chars);
  
  pinMode(CT_PIN, INPUT);
  emon1.current(CT_PIN, CALIBRATION);
  
  sensorMotor.begin();
  sensorExterior.begin();
  sensorInterior.begin();
  
  pinMode(FLOAT_PIN, INPUT_PULLUP);
  
  pinMode(GPIO_YELLOW_EXHAUST, INPUT);
  pinMode(GPIO_GREEN_FAN, INPUT);
  pinMode(GPIO_BROWN_PUMP, INPUT);
  pinMode(GPIO_BLACK_DRAIN, INPUT);
}

// ============================================
// MAIN LOOP - State Machine
// ============================================
void loop() {
  unsigned long currentMillis = millis();
  
  if(currentMillis - lastWatchdogFeed >= 1000) {
    esp_task_wdt_reset();
    lastWatchdogFeed = currentMillis;
  }
  
  checkBootButton(currentMillis);
  
  if(currentMillis - lastAutoReset >= AUTO_RESET_INTERVAL) {
    performAutoReset();
  }
  
  static unsigned long lastUptimeUpdate = 0;
  if(currentMillis - lastUptimeUpdate >= 1000) {
    totalUptimeSeconds++;
    lastUptimeUpdate = currentMillis;
  }
  
  checkWiFiStuck(currentMillis);
  checkWiFiTimeout();
  
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
// STATE: Sensor Reading (WiFi OFF)
// ============================================
void stateSensorReading(unsigned long currentMillis) {
  if(currentMillis - lastSensorRead >= SENSOR_READ_INTERVAL) {
    if(wifiEnabled) {
      disableWiFi();
    }
    
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
    
    accumulator.addSample(tMotor, tExterior, tInterior, ctCurrent, ctVoltage, 
                          apparentPower, yVolt, gVolt, bVolt, blVolt, tankFull,
                          yStatus, gStatus, bStatus, blStatus, fanSpeed);
    
    lastSensorRead = currentMillis;
  }
  
  if(currentMillis - lastDataSend >= DATA_SEND_INTERVAL) {
    if(accumulator.sampleCount > 0) {
      currentState = STATE_WIFI_CONNECT;
    } else {
      lastDataSend = currentMillis;
    }
  }
}

// ============================================
// STATE: WiFi Connect
// ============================================
void stateWiFiConnect(unsigned long currentMillis) {
  enableWiFi();
  
  unsigned long connectStart = millis();
  bool connected = false;
  
  WiFi.mode(WIFI_STA);
  WiFi.begin();
  
  int connectAttempts = 0;
  while(millis() - connectStart < WIFI_CONNECT_TIMEOUT) {
    if(WiFi.status() == WL_CONNECTED) {
      connected = true;
      break;
    }
    delay(500);
    connectAttempts++;
    
    if(connectAttempts % 4 == 0) {
      esp_task_wdt_reset();
    }
    
    if(millis() - connectStart > WIFI_CONNECT_TIMEOUT) {
      break;
    }
  }
  
  if(connected) {
    configTime(0, 0, "pool.ntp.org");
    wifiStuckDetected = false;
    currentState = STATE_DATA_SEND;
  } else {
    accumulator.reset();
    lastDataSend = millis();
    currentState = STATE_WIFI_DISCONNECT;
  }
}

// ============================================
// STATE: Data Send
// ============================================
void stateDataSend(unsigned long currentMillis) {
  if(supabaseUrl.length() == 0 || machineUUID.length() == 0 || machineAPIKey.length() == 0) {
    accumulator.reset();
    lastDataSend = millis();
    currentState = STATE_WIFI_DISCONNECT;
    return;
  }
  
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
  
  sendToSupabase(
    avgTempMotor, avgTempExterior, avgTempInterior,
    avgCtCurrent, avgCtVoltage, avgApparentPower,
    avgYellowVoltage, avgGreenVoltage, avgBrownVoltage, avgBlackVoltage,
    tankFullAvg,
    accumulator.yellowStatus, accumulator.greenStatus,
    accumulator.brownStatus, accumulator.blackStatus,
    accumulator.fanSpeed
  );
  
  accumulator.reset();
  lastDataSend = millis();
  currentState = STATE_WIFI_DISCONNECT;
}

// ============================================
// STATE: WiFi Disconnect
// ============================================
void stateWiFiDisconnect(unsigned long currentMillis) {
  disableWiFi();
  currentState = STATE_SENSOR_READING;
}

// ============================================
// Enable WiFi
// ============================================
void enableWiFi() {
  if(!wifiEnabled) {
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
    WiFi.disconnect(true);
    WiFi.mode(WIFI_OFF);
    wifiEnabled = false;
    delay(100);
  }
}

// ============================================
// Safety Net: Force WiFi Off After Timeout
// ============================================
void checkWiFiTimeout() {
  if(wifiEnabled && (millis() - wifiOnStartTime > MAX_WIFI_ON_TIME)) {
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
  
  if(temp == DEVICE_DISCONNECTED_C || temp < -50 || temp > 125) {
    return -999.0;
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
  
  if(current < 0.1) {
    current = 0.0;
  } else if(current < MIN_CURRENT_THRESHOLD) {
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
  for(int i = 0; i < 10; i++) {
    analogRead(pin);
    delayMicroseconds(ADC_SAMPLE_DELAY_US);
  }
  
  long sum = 0;
  for(int i = 0; i < ADC_SAMPLES; i++) {
    sum += analogRead(pin);
    delayMicroseconds(ADC_SAMPLE_DELAY_US);
  }
  
  float avgADC = sum / (float)ADC_SAMPLES;
  float voltage = (avgADC / 4095.0) * ADC_VREF;
  
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
// Send Data to Supabase (DASHBOARD COMPATIBLE)
// ============================================
bool sendToSupabase(float tMotor, float tExterior, float tInterior,
                    float ctCurrent, float ctVoltage, float appPower,
                    float yVolt, float gVolt, float bVolt, float blVolt,
                    bool tankFull,
                    String yStatus, String gStatus, String bStatus, String blStatus,
                    int fanSpeed) {
  
  if(WiFi.status() != WL_CONNECTED) return false;
  
  HTTPClient http;
  WiFiClientSecure client;
  client.setInsecure();
  client.setTimeout(HTTP_POST_TIMEOUT / 1000);
  http.setTimeout(HTTP_POST_TIMEOUT);
  http.setConnectTimeout(5000);
  
  String endpoint = supabaseUrl + "/functions/v1/esp32-data-receiver";
  
  StaticJsonDocument<768> doc;
  
  doc["machine_id"] = machineUUID;
  doc["motor_temp"] = tMotor;
  doc["outside_temp"] = tExterior;
  doc["inside_temp"] = tInterior;
  doc["current"] = ctCurrent;
  doc["voltage"] = LINE_VOLTAGE;
  doc["power"] = appPower;
  doc["has_water"] = tankFull;
  doc["exhaust_voltage"] = yVolt;
  doc["fan_voltage"] = gVolt;
  doc["pump_voltage"] = bVolt;
  doc["drain_voltage"] = blVolt;
  doc["sensor_read_count"] = accumulator.sampleCount;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  esp_task_wdt_reset();
  
  http.begin(client, endpoint);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabaseAnonKey);
  http.addHeader("Authorization", "Bearer " + machineAPIKey);
  
  int httpCode = http.POST(jsonString);
  
  esp_task_wdt_reset();
  
  bool success = (httpCode == 201 || httpCode == 200);
  
  http.end();
  
  return success;
}

// ============================================
// Initialize WiFiManager
// ============================================
void initializeWiFiManager() {
  wifiManager.setConfigPortalTimeout(180);
  wifiManager.setAPStaticIPConfig(IPAddress(192,168,4,1), IPAddress(192,168,4,1), IPAddress(255,255,255,0));
  wifiManager.setSaveConfigCallback(saveConfigCallback);
  
  supabaseUrl = String(SUPABASE_URL);
  supabaseAnonKey = String(SUPABASE_ANON_KEY);
  
  WiFiManagerParameter customMachineUUID("machine_uuid", "Machine UUID (from Dashboard)", machineUUID.c_str(), 40);
  WiFiManagerParameter customMachineAPIKey("api_key", "Machine API Key (from Dashboard)", machineAPIKey.c_str(), 100);
  
  wifiManager.addParameter(&customMachineUUID);
  wifiManager.addParameter(&customMachineAPIKey);
  
  String savedSSID = WiFi.SSID();
  if(savedSSID.length() == 0) {
    wifiManager.autoConnect("ESP32_HVAC_Setup");
  } else {
    WiFi.mode(WIFI_STA);
    WiFi.begin();
    unsigned long connectStart = millis();
    while(WiFi.status() != WL_CONNECTED && (millis() - connectStart < 10000)) {
      delay(500);
    }
  }
  
  machineUUID = String(customMachineUUID.getValue());
  machineAPIKey = String(customMachineAPIKey.getValue());
  
  saveConfiguration();
}

// ============================================
// Load Configuration
// ============================================
void loadConfiguration() {
  supabaseUrl = String(SUPABASE_URL);
  supabaseAnonKey = String(SUPABASE_ANON_KEY);
  machineUUID = preferences.getString("machine_uuid", machineUUID.c_str());
  machineAPIKey = preferences.getString("api_key", machineAPIKey.c_str());
}

// ============================================
// Save Configuration
// ============================================
void saveConfiguration() {
  preferences.putString("machine_uuid", machineUUID);
  preferences.putString("api_key", machineAPIKey);
}

// ============================================
// Launch WiFiManager Config Portal (for boot button)
// ============================================
void launchConfigPortal() {
  wifiManager.startConfigPortal("ESP32_HVAC_Setup");
}

// ============================================
// WiFiManager Save Config Callback
// ============================================
void saveConfigCallback() {
  // Config saved by WiFiManager
}

// ============================================
// Check Boot Button (5 second hold to enter config)
// ============================================
void checkBootButton(unsigned long currentMillis) {
  bool buttonState = digitalRead(BOOT_BUTTON_PIN) == LOW;
  
  if(buttonState && !bootButtonPressed) {
    bootButtonPressTime = currentMillis;
    bootButtonPressed = true;
  } else if(buttonState && bootButtonPressed) {
    unsigned long holdTime = currentMillis - bootButtonPressTime;
    if(holdTime >= BOOT_BUTTON_HOLD_TIME) {
      WiFi.disconnect(true);
      WiFi.mode(WIFI_OFF);
      
      preferences.begin("iot-nexus", false);
      preferences.clear();
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
// Perform Auto Reset (Soft Reset - 6 hours)
// ============================================
void performAutoReset() {
  delay(1000);
  ESP.restart();
}

