# ESP32 SmartKey Controller Firmware

## Hybrid Architecture
This firmware enables the ESP32 to function in both **Cloud (Online)** and **Direct (Offline)** modes.

- **Online Mode**: Uses **WiFi** + **MQTT (HiveMQ Cloud)**. The ESP32 subscribes to `{prefix}/hardware/command` and publishes heartbeat status to `{prefix}/hardware/status`.
- **Offline Mode**: Uses **Bluetooth Low Energy (BLE)** with the Nordic UART Service (NUS). This allows direct communication with the PWA when the internet is unavailable.
- **Failover Logic**: The PWA prioritizes MQTT. If the browser detects a network failure, it initiates a BLE connection to the hardware.

## Libraries Required
1. **PubSubClient** (by Nick O'Leary) - For MQTT communication.
2. **ArduinoJson** (by Benoit Blanchon) - For JSON processing.
3. **LittleFS** (Built-in) - For persistent storage.
4. **BLE Arduino** (Built-in for ESP32) - For the local UART bridge.
5. **WiFiClientSecure** (Built-in) - For MQTTS (TLS) support.

## Provisioning
If no WiFi credentials are found, the device starts in AP Mode (`KC868_EMERGENCY`). The PWA sends setup data via a POST to `/provision`.

## Command Protocol (JSON)
Common commands handled by both MQTT and BLE:
```json
{ "action": "unlock", "slotId": 1 }
{ "action": "force_return", "slotId": 2 }
{ "action": "maintenance", "slotId": 3, "type": "cycle_test" }
```

## Security
- **MQTT**: HiveMQ Cloud clusters require TLS (8883) and Cluster Credentials.
- **BLE**: Uses MAC binding and UUID filtering.
- **Hardware**: Integrated E-Stop logic provides a physical safety override.
