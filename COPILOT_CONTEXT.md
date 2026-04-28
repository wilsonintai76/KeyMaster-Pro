
# GitHub Copilot Project Context: SmartKey IoT System

This file provides the necessary architectural and engineering context for GitHub Copilot to assist in the development of the SmartKey FYP project.

## 1. Project Mission
A Condition-Based Maintenance (CBM) enabled key management system for mechanical workshops, utilizing a "Split-Brain" hybrid architecture for high availability.

## 2. Hardware Architecture (Edge)
- **Controller**: KinCony KC868-A4 (ESP32-WROOM-32).
- **Storage**: Internal SPI Flash using **LittleFS** (No SD cards used due to mechanical vibration risks).
- **Connectivity**: LAN8720 Ethernet and ESP32 WiFi (STA/AP modes).
- **I/O Logic**:
  - **Relays (1-4)**: Staggered Solenoid Actuators (12V DC).
  - **Inputs (1-4)**: Optical/Microswitch feedback for key presence.
  - **Interrupts**: GPIO 13 reserved for Hardware E-Stop (Normally Closed loop).

## 3. Engineering Logic & Constraints
- **Split-Brain Architecture**: 
  - **Cloud Mode**: Primary operation via Firebase Realtime Database.
  - **Local Mode (Failover)**: Direct HTTP communication to `192.168.4.1` when internet is unavailable.
- **Sequential Discharge Protocol**: To prevent PSU in-rush current overload, solenoids must be triggered with a **1000ms delay** between nodes during emergency releases.
- **Digital Binding**: Since browsers cannot access MAC addresses directly, users must manually bind their MAC address in the **Account Settings** module. The system serializes this to `whitelist.json` on the ESP32 Flash for Layer-2 offline authentication.
- **Authentication**: Strictly via Google OAuth (Cloud) or Pre-registered MAC Whitelist (Local). No manual role toggles or simulation bypasses are allowed in production.
- **Latching E-Stop**: The system state must not reset programmatically if the physical hardware trigger is still active (Latched).

## 4. Condition-Based Maintenance (CBM) Model
Predictive health is calculated using linear mechanical degradation:
- **Formula**: `Health % = 100 - ((UsageCount / Threshold) * 100)`
- **Solenoid Limit**: 50,000 cycles (Thermal/Magnetic fatigue).
- **Switch Limit**: 100,000 cycles (Mechanical spring fatigue).

## 5. Software Stack
- **Frontend**: React 18, Tailwind CSS, TypeScript.
- **Backend**: Firebase (Auth, RTDB).
- **AI**: Google Gemini 3 (for executive summaries and technical consulting).
- **State Management**: React Hooks (useState, useEffect, useCallback) with LocalStorage persistence.

## 6. Coding Standards
- **Strict Typing**: Always define interfaces in `types.ts`.
- **UI/UX**: High-fidelity, dashboard-style interface with a focus on "Engineering Aesthetics".
- **PWA**: Offline-first mindset using Service Workers for asset caching.
