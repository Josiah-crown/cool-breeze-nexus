/*
 * CLEAR ESP32 MEMORY
 * 
 * Upload this sketch to completely erase WiFi and Supabase credentials
 * from ESP32 flash memory.
 * 
 * STEPS:
 * 1. Upload this sketch
 * 2. Wait 5 seconds (watch Serial Monitor)
 * 3. Upload your main firmware (ESP32_HVAC_CoolBreezeNexus_V2.ino)
 * 4. ESP32 will now start in AP mode!
 */

#include <Preferences.h>
#include <WiFi.h>

Preferences preferences;

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n========================================");
  Serial.println("  ESP32 MEMORY CLEAR UTILITY");
  Serial.println("========================================\n");
  
  // Clear WiFi credentials (multiple methods for thoroughness)
  Serial.println("Clearing WiFi credentials...");
  
  // Method 1: WiFi disconnect with erase
  WiFi.disconnect(true, true);  // disconnect and erase credentials
  delay(500);
  
  // Method 2: Force erase via persistent
  WiFi.persistent(true);
  WiFi.begin("", "");  // Connect to nothing = erases saved credentials
  delay(500);
  WiFi.disconnect(true, true);
  delay(500);
  
  // Method 3: WiFi mode off
  WiFi.mode(WIFI_OFF);
  delay(1000);
  
  // Clear Preferences (Supabase config)
  Serial.println("Clearing Preferences (Supabase config)...");
  preferences.begin("iot-nexus", false);
  preferences.clear();
  preferences.end();
  delay(500);
  
  // Also clear WiFiManager namespace if it exists
  Serial.println("Clearing WiFiManager data...");
  preferences.begin("wifi-manager", false);
  preferences.clear();
  preferences.end();
  delay(500);
  
  Serial.println("\n✅ ALL MEMORY CLEARED!");
  Serial.println("========================================");
  Serial.println("NEXT STEPS:");
  Serial.println("1. Upload your main firmware now");
  Serial.println("2. ESP32 will start in AP mode");
  Serial.println("3. Connect to 'ESP32_HVAC_Setup' WiFi");
  Serial.println("========================================\n");
}

void loop() {
  // Nothing - just wait
  delay(1000);
}

