# Hardware Wiring Guide: KC868-A4

This document outlines the physical electrical connections for the SmartKey Workshop Cabinet.

## 1. Power Distribution
*   **Input Voltage:** 12V DC (5A Minimum).
*   **Source:** DIN Rail Power Supply (MeanWell recommended).
*   **Protection:** 5A Fast-Blow Fuse on the 12V positive rail.

## 2. Actuators (Solenoids)
The KC868-A4 has 4 onboard relays. These control the 12V Solenoids.
*   **Relay 1 (CH-01):** Workshop Main Design Lab Key.
*   **Relay 2 (CH-02):** CNC Workshop A Key.
*   **Wiring:** 
    *   Connect 12V(+) to the Relay **Common (COM)** terminal.
    *   Connect the Solenoid (+) wire to the Relay **Normally Open (NO)** terminal.
    *   Connect the Solenoid (-) wire directly to the Power Supply Ground (GND).

## 3. Feedback Sensors (Microswitches)
To track "Key Presence" and log `usageCount`:
*   **Input 1:** Wired to the microswitch inside Slot 1.
*   **Logic:** Pull-up configuration (Input triggers when key is inserted/grounded).

## 4. Emergency Hardware Stop
*   **Pin:** GPIO 13 (Digital Input).
*   **Switch Type:** Latching Mushroom E-Stop (NC - Normally Closed for safety).
*   **Logic:** If the wire is cut or the button is pressed (circuit opens), the ESP32 immediately enters `EMERGENCY_RELEASE` mode.

## 5. Network Connections
*   **Primary:** RJ45 Ethernet via LAN8720 module (if equipped) or ESP32 internal WiFi.
*   **Failover:** WiFi Access Point `KC868_EMERGENCY` (Hosted internally on ESP32).
