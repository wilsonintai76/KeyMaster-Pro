
# Appendix A: Main Firmware Code

## File: src/main.cpp

This is the main entry point for the ESP32 controller. It initializes the core subsystems and runs the main loop.

```cpp
/*
 * Project: SmartKey IoT Controller
 * Device: KinCony KC868-A4 (ESP32)
 * File: src/main.cpp
 * Author: Final Year Project Team
 * 
 * Description:
 * Main entry point for the firmware. Initializes the 3 core managers:
 * 1. StorageManager (Flash Memory/LittleFS)
 * 2. HardwareManager (GPIO, Relays, Sensors)
 * 3. NetworkManager (WiFi, Firebase, WebServer)
 */

#include <Arduino.h>
#include "Config.h"
#include "StorageManager.h"
#include "HardwareManager.h"
#include "NetworkManager.h"

// ---------------------------------------------------------------------------
// GLOBAL OBJECTS
// ---------------------------------------------------------------------------
StorageManager storage;
HardwareManager hw;
// Inject dependencies via constructor injection
NetworkManager net(&storage, &hw); 

// ---------------------------------------------------------------------------
// SETUP
// ---------------------------------------------------------------------------
void setup() {
  // 1. Serial Telemetry
  Serial.begin(SERIAL_BAUD);
  delay(1000); 
  
  Serial.println(F("\n\n"));
  Serial.println(F("#############################################"));
  Serial.println(F("#     SMARTKEY IOT CONTROLLER FIRMWARE      #"));
  Serial.println(F("#     v2.5 - Split-Brain Architecture       #"));
  Serial.println(F("#############################################"));

  // 2. Mount File System
  Serial.println(F("[BOOT] Mounting LittleFS..."));
  if (storage.begin()) {
    storage.loadConfig();
  } else {
    Serial.println(F("[BOOT] (!) LittleFS Mount Failed. Formatting..."));
    // In a real scenario, we might format or halt.
    // For FYP reliability, we continue to try and run in AP mode.
  }

  // 3. Initialize GPIOs
  Serial.println(F("[BOOT] configuring I/O Pins..."));
  hw.begin();

  // 4. Start Network Stack
  Serial.println(F("[BOOT] Starting Network Services..."));
  net.begin();

  Serial.println(F("[BOOT] Initialization Complete. Entering Main Loop."));
}

// ---------------------------------------------------------------------------
// MAIN LOOP
// ---------------------------------------------------------------------------
void loop() {
  // 1. Service Network Requests
  //    - Handles WebServer clients (Provisioning)
  //    - Handles Firebase Keep-Alive
  net.update();

  // 2. Hardware Tasks
  //    - Checks E-Stop State
  //    - Manages Sequential Release Timing
  hw.update();

  // 3. Watchdog / Debug Heartbeat (Every 10s)
  static unsigned long lastBeat = 0;
  if (millis() - lastBeat > 10000) {
    lastBeat = millis();
    
    // Minimal logging to confirm life
    Serial.printf("[SYS] Tick. RAM: %d free. WiFi: %s\n", 
      ESP.getFreeHeap(), 
      WiFi.status() == WL_CONNECTED ? "Connected" : "AP Mode"
    );
  }
}
```