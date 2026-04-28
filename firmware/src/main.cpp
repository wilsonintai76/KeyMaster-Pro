
/*
 * Project: SmartKey IoT Controller
 * Device: KinCony KC868-A4 (ESP32)
 * File: src/main.cpp
 * Standard: C++11 (ESP32 Optimized)
 * 
 * Description:
 * Main entry point. Initializes core subsystems and manages the loop.
 * Implements "Split-Brain" architecture:
 * - Cloud Mode: Firebase RTDB
 * - Local Mode: WebServer (192.168.4.1)
 */

#include <Arduino.h>
#include "../SmartKey_Controller/Config.h"
#include "../SmartKey_Controller/StorageManager.h"
#include "../SmartKey_Controller/HardwareManager.h"
#include "../SmartKey_Controller/NetworkManager.h"

// ---------------------------------------------------------------------------
// GLOBAL INSTANCES
// ---------------------------------------------------------------------------
// We allocate these globally or statically to avoid heap fragmentation 
// often caused by `new` in the setup() phase on embedded systems.
StorageManager storage;
HardwareManager hw;

// Dependency Injection: NetworkManager needs access to Storage (for creds) 
// and Hardware (for actuation commands).
NetworkManager net(&storage, &hw); 

// ---------------------------------------------------------------------------
// SETUP
// ---------------------------------------------------------------------------
void setup() {
  // 1. Initialize Telemetry
  Serial.begin(SERIAL_BAUD);
  // Allow serial bus to stabilize
  delay(1000); 

  // Use F() macro for string literals to save RAM
  Serial.println(F("\n\n"));
  Serial.println(F("#############################################"));
  Serial.println(F("#     SMARTKEY IOT CONTROLLER FIRMWARE      #"));
  Serial.println(F("#     v2.5 - Split-Brain Architecture       #"));
  Serial.println(F("#############################################"));

  // 2. Mount File System (LittleFS)
  // Essential for "No-SD" architecture
  Serial.println(F("[BOOT] Mounting LittleFS..."));
  if (storage.begin()) {
    storage.loadConfig();
  } else {
    Serial.println(F("[BOOT] (!) LittleFS Mount Failed. Formatting..."));
    // In production, we might halt here. For now, we continue to allow AP mode.
  }

  // 3. Initialize Hardware (GPIOs, Relays, E-Stop)
  Serial.println(F("[BOOT] Configuring I/O Pins..."));
  hw.begin();

  // 4. Start Network Stack (WiFi + Firebase/WebServer)
  Serial.println(F("[BOOT] Starting Network Services..."));
  net.begin();

  Serial.println(F("[BOOT] Initialization Complete. Entering Main Loop."));
}

// ---------------------------------------------------------------------------
// MAIN LOOP
// ---------------------------------------------------------------------------
void loop() {
  // 1. Service Network Requests
  //    - Handles WebServer clients (Provisioning/Local Auth)
  //    - Handles Firebase Keep-Alive and Token generation
  net.update();

  // 2. Hardware Tasks
  //    - Checks E-Stop State (Safety Latch)
  //    - Manages Sequential Release Timing (PSU Protection)
  hw.update();

  // 3. System Health / Watchdog Heartbeat
  //    - Non-blocking timer every 10 seconds
  static unsigned long lastBeat = 0;
  unsigned long currentMillis = millis();
  
  if (currentMillis - lastBeat > 10000) {
    lastBeat = currentMillis;
    
    // Minimal logging to confirm life without flooding serial
    Serial.print(F("[SYS] Tick. RAM: "));
    Serial.print(ESP.getFreeHeap());
    Serial.print(F("b free. WiFi: "));
    Serial.println(WiFi.status() == WL_CONNECTED ? F("Connected") : F("AP Mode"));
  }
}
