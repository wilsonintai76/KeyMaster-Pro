
#ifndef CONFIG_H
#define CONFIG_H

// --- HARDWARE PINS (KinCony KC868-A4) ---
// Verify these against your specific board revision!

// Relays (Solenoids)
#define PIN_RELAY_1  2
#define PIN_RELAY_2  15
#define PIN_RELAY_3  5
#define PIN_RELAY_4  4

// Inputs (Microswitches - Optical/Dry Contact)
#define PIN_INPUT_1  36
#define PIN_INPUT_2  39
#define PIN_INPUT_3  34
#define PIN_INPUT_4  35

// Safety
#define PIN_ESTOP    13   // Hardware Emergency Stop (NC)

// --- SYSTEM CONSTANTS ---
#define SERIAL_BAUD 115200
#define JSON_BUFFER_SIZE 2048

// --- DEFAULT FALLBACKS ---
#define AP_SSID "KC868_EMERGENCY"
#define AP_PASS "" // Open network for emergency access, or set a password
#define AP_IP   IPAddress(192, 168, 4, 1)
#define AP_MASK IPAddress(255, 255, 255, 0)

// --- FILE PATHS ---
#define PATH_CONFIG    "/sys_config.json"
#define PATH_WHITELIST "/whitelist.json"
#define PATH_LOGS      "/offline_logs.txt"

#endif
