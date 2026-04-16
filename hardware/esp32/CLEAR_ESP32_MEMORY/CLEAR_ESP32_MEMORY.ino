/*
 * CLEAR ESP32 MEMORY - FULL FACTORY RESET (NVS FORMAT)
 *
 * Upload this sketch to ERASE THE ENTIRE NVS PARTITION on the ESP32.
 * This is a true "format" of stored data: all namespaces are wiped
 * (WiFi, Preferences, WiFiManager, coolbreeze, cirrus, iot-nexus, etc.).
 *
 * What gets erased:
 *   - Entire NVS (Non-Volatile Storage) partition
 *   - All WiFi credentials
 *   - All Preferences namespaces (machine_id, api_key, uptime, etc.)
 *   - Any other data stored in NVS
 *
 * What is NOT erased (cannot be done from a running sketch):
 *   - This program (the firmware) - you must upload your main firmware after
 *   - Bootloader / partition table
 *
 * STEPS:
 *   1. Upload this sketch
 *   2. Open Serial Monitor at 115200
 *   3. Wait for "NVS partition erased" and automatic restart
 *   4. Upload your main firmware (e.g. ESP32_General_Universal)
 *   5. Device will start as if new (config portal / AP for WiFi setup)
 */

#include <WiFi.h>
#include <nvs_flash.h>
#include <esp_system.h>

void setup() {
  Serial.begin(115200);
  delay(2000);

  Serial.println("\n\n========================================");
  Serial.println("  ESP32 FULL FACTORY RESET (NVS FORMAT)");
  Serial.println("========================================\n");

  Serial.println("Turning WiFi off...");
  WiFi.mode(WIFI_OFF);
  WiFi.disconnect(true);
  delay(500);

  Serial.println("Erasing entire NVS partition (all credentials & settings)...");
  esp_err_t err;

  err = nvs_flash_erase();
  if (err != ESP_OK) {
    Serial.print("nvs_flash_erase() returned ");
    Serial.println(err);
    Serial.println("Trying nvs_flash_erase_partition(\"nvs\")...");
    err = nvs_flash_erase_partition("nvs");
  }

  if (err != ESP_OK) {
    Serial.print("ERROR: NVS erase failed (");
    Serial.print(err);
    Serial.println("). Check Serial and try again.");
    Serial.println("========================================\n");
    return;
  }

  Serial.println("NVS partition erased. Re-initializing NVS...");
  err = nvs_flash_init();
  if (err != ESP_OK) {
    Serial.print("WARNING: nvs_flash_init() after erase returned ");
    Serial.println(err);
    Serial.println("Device will restart anyway.");
  }

  Serial.println("\n========================================");
  Serial.println("  NVS FORMAT COMPLETE - FACTORY RESET DONE");
  Serial.println("========================================");
  Serial.println("Next: upload your main firmware.");
  Serial.println("Device will start in config/AP mode.\n");
  delay(2000);

  ESP.restart();
}

void loop() {
  delay(1000);
}
