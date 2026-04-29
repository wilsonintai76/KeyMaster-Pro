
/**
 * SmartKey Hybrid Controller
 * Target: ESP32 (KinCony KC868-A4 or similar)
 * Features: 
 *  - Online: MQTT via HiveMQ Cloud
 *  - Offline: Bluetooth Low Energy (Nordic UART Service)
 *  - Local Flash Storage: LittleFS
 */

#include "Config.h"
#include "StorageManager.h"
#include "HardwareManager.h"
#include "NetworkManager.h"

StorageManager storage;
HardwareManager hw;
NetworkManager net(&storage, &hw);

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println(F("\n--- SMARTKEY HYBRID CONTROLLER START ---"));

  // 1. Storage (Config & Logs)
  if (!storage.begin()) {
    Serial.println(F("[FATAL] Storage Initialization Failed"));
  }
  storage.loadConfig();

  // 2. Hardware (Relays & Sensors)
  hw.begin();

  // 3. Network (BLE + WiFi/MQTT)
  net.begin();
  
  Serial.println(F("--- SYSTEM READY ---"));
}

void loop() {
  // Update state machines
  hw.update();
  net.update();
  
  // Watchdog/Heartbeat
  static unsigned long lastBeat = 0;
  if (millis() - lastBeat > 10000) {
    lastBeat = millis();
    Serial.print(F("[SYS] Heartbeat: MQTT="));
    Serial.print(net.isMqttConnected() ? "ON" : "OFF");
    Serial.print(F(" WiFi="));
    Serial.println(WiFi.status() == WL_CONNECTED ? "ON" : "OFF");
  }
}
