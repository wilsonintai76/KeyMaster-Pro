
# SmartKey Firmware (ESP32)

This folder contains the Arduino firmware for the KinCony KC868-A4 controller.

## Installation

1.  **PlatformIO (Recommended):**
    *   Open the `firmware` folder in VS Code with the PlatformIO extension installed.
    *   The `src/main.cpp` file contains the main logic.
    *   Build and Upload.

2.  **Arduino IDE:**
    *   Rename `src/main.cpp` to `SmartKey_Controller.ino`.
    *   Move header files (`.h`) into the same folder.
    *   Install required libraries via Library Manager:
        *   **ArduinoJson** (v6 or v7)
        *   **Firebase Arduino Client Library for ESP8266 and ESP32**
    *   Select Board: **ESP32 Dev Module**.
    *   Upload to your KC868-A4.

## Features Implemented
*   **Split-Brain Networking:** Automatically falls back to AP Mode (`KC868_EMERGENCY`) if WiFi fails.
*   **Provisioning:** Accepts JSON config via `POST /provision` to set WiFi and Firebase credentials without recompiling.
*   **LittleFS Storage:** Stores config and user whitelists on the ESP32 flash memory.
*   **Sequential Release:** Protects PSU by staggering solenoid activation (1000ms delay).
