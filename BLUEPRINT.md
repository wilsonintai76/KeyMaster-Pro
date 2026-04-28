# SYSTEM BLUEPRINT: SmartKey Cloud IoT Architecture (v2.5)

**Project Name:** SmartKey Cloud IoT Dashboard  
**Architecture Type:** Hybrid Cloud/Edge (Split-Brain)  
**Deployment Strategy:** Serverless PWA (Progressive Web App)  
**Hardware Core:** KinCony KC868-A4 (ESP32)

---

## 1. High-Level Architecture Diagram

This architecture utilizes a **"Split-Brain"** topology. The frontend app is aware of network context and switches its transport layer between **Secure WebSockets (WSS)** for cloud operation and **Direct HTTP** for local emergency operation.

```mermaid
graph TD
    subgraph Client_Layer [Client Layer (PWA)]
        UI[React 18 Dashboard]
        LocalDB[IndexedDB Cache]
        AI_Mod[Gemini AI Consultant]
    end

    subgraph Cloud_Layer [Control Plane (Firebase)]
        Auth[Firebase Auth (OAuth)]
        RTDB[(Realtime Database)]
        Hosting[Firebase Hosting]
    end

    subgraph Edge_Layer [Data Plane (Hardware)]
        ESP32[KC868-A4 Controller]
        LittleFS[(LittleFS Flash Storage)]
        WiFi_STA[WiFi Station Mode]
        WiFi_AP[Emergency AP Mode]
    end

    subgraph Physical_Layer [Mechanical Layer]
        Relays[Solenoid Relays (x4)]
        Inputs[Microswitch Sensors]
        EStop[Latching E-Stop]
    end

    %% Cloud Flows
    UI -- "HTTPS / WebSocket" --> RTDB
    UI -- "Auth Token" --> Auth
    UI -- "Telemetry Context" --> AI_Mod
    ESP32 -- "Sync State" --> RTDB

    %% Local Failover Flows
    UI -. "Direct HTTP (192.168.4.1)" .-> WiFi_AP
    WiFi_AP -- "Verify MAC" --> LittleFS

    %% Hardware Control
    ESP32 --> Relays
    Inputs --> ESP32
    EStop -- "Hardware Interrupt" --> ESP32
```

---

## 2. Technical Stack Breakdown

### A. Frontend (The Interface)
*   **Framework:** React 18 with TypeScript.
*   **Styling:** Tailwind CSS (Mobile-first, Dark/Light mode capable).
*   **State Management:** React Hooks (`useState`, `useEffect`).
*   **Offline Persistence:**
    *   **Service Workers (`sw.js`):** Caches the app shell (HTML/CSS/JS) for instant offline loading.
    *   **IndexedDB (`services/db.ts`):** Stores logs and user config locally when the internet is cut.
*   **AI Integration:** Google Gemini 3.0 Flash via `@google/genai` SDK for predictive maintenance and executive summaries.

### B. Backend (The Infrastructure)
*   **Platform:** Google Firebase (Serverless).
*   **Database:** Firebase Realtime Database (NoSQL JSON tree).
*   **Authentication:** Google OAuth 2.0 (Primary) + Anonymous/Custom Token (Edge Sync).
*   **Logic:**
    *   **Cloud:** Handles global synchronization, multi-user role management, and remote triggering.
    *   **Edge:** Handles physical I/O processing and safety latches.

### C. Firmware (The Controller)
*   **Device:** KinCony KC868-A4 (ESP32-WROOM-32).
*   **Language:** C++ (Arduino Framework).
*   **Key Libraries:** `Firebase_ESP_Client`, `ArduinoJson`, `LittleFS`, `WebServer`.
*   **Storage Strategy:** **LittleFS** (4MB Internal SPI Flash). Replaces SD cards to prevent vibration-induced data corruption in workshops.

---

## 3. Core Logic & Protocols

### 3.1. The "Split-Brain" Failover Protocol
The system is designed to operate in two distinct modes to ensure 99.9% availability.

| Feature | **Cloud Mode (Online)** | **Local Mode (Offline/Emergency)** |
| :--- | :--- | :--- |
| **Communication** | WebSocket (WSS) via Firebase | Direct HTTP REST API |
| **Authentication** | Google Account (OAuth) | MAC Address Binding (Digital Whitelist) |
| **Storage** | Cloud Database | Internal LittleFS `whitelist.json` |
| **Latency** | ~150ms - 500ms | < 20ms (LAN) |
| **Telemetry** | Full History & AI Analysis | Real-time Status Only |

### 3.2. Digital Binding (Offline Security)
Since modern browsers sandbox the MAC address, the system uses a specific registration flow:
1.  **Registration:** User enters their device MAC in `AccountSettings.tsx` while online.
2.  **Sync:** Firebase syncs this MAC to the ESP32 via `NetworkManager.h`.
3.  **Storage:** ESP32 saves it to `whitelist.json` in flash memory.
4.  **Verification:** When connecting to the Emergency AP, the ESP32 compares the connecting device's hardware address against the local JSON file.

### 3.3. Condition-Based Maintenance (CBM) Model
A linear degradation algorithm tracks the health of electromechanical components.

**Formula:**
$$Health \% = 100 - \left( \frac{\text{CurrentUsageCount}}{\text{MaxThreshold}} \times 100 \right)$$

*   **Solenoid Threshold:** 50,000 cycles (Thermal breakdown limit).
*   **Microswitch Threshold:** 100,000 cycles (Spring fatigue limit).
*   **Logic:** If `Health < 20%`, the dashboard triggers a "Service Required" alert (`MaintenanceForecast.tsx`).

### 3.4. Sequential Discharge Protocol
To prevent Power Supply Unit (PSU) overload during an emergency "Unlock All" command (in-rush current protection):
1.  System receives `EMERGENCY_OPEN`.
2.  Triggers Relay 1.
3.  **Delays 1000ms.**
4.  Triggers Relay 2.
5.  *Repeats for all nodes.*

---

## 4. Data Dictionary (Schema)

### Firebase / JSON Structure

**`/slots` (Hardware State)**
```json
[
  {
    "id": 1,
    "label": "CNC Room Key",
    "status": "Available", 
    "usageCount": 142,
    "voltage": 12.1,
    "isLocked": false
  }
]
```

**`/users` (Identity)**
```json
{
  "u_12345": {
    "name": "Ahmad Zaki",
    "email": "student@uni.edu.my",
    "role": "admin",
    "macAddress": "A1:B2:C3:D4:E5:F6",  // Used for Offline Auth
    "staffId": "1092",                 // Fallback PIN Auth
    "status": "active"
  }
}
```

**`/logs` (Audit Trail)**
```json
{
  "log_timestamp_id": {
    "action": "KEY_WITHDRAWN",
    "user": "Ahmad Zaki",
    "keyLabel": "CNC Room Key",
    "type": "success",
    "timestamp": "2023-10-25T10:00:00Z"
  }
}
```

---

## 5. Deployment Lifecycle

1.  **Provisioning:**
    *   The `SystemSetupWizard.tsx` detects a fresh install.
    *   User inputs Firebase Credentials.
    *   Config is saved to Browser LocalStorage and indexedDB.
2.  **Hardware Handshake:**
    *   User connects to ESP32 via USB/Serial or AP.
    *   `CloudConnectionConfig.tsx` sends the JSON payload to `/provision` endpoint on the ESP32.
3.  **Operation:**
    *   Dashboard loads.
    *   Connects to Firebase.
    *   Downloads current slot status.
4.  **Analysis:**
    *   `Analytics.tsx` aggregates log data.
    *   Sends prompt to Gemini API for "Executive Summary".

---

## 6. Safety Features (HSE Compliance)

1.  **Latching E-Stop:** The physical Emergency Stop button uses a Normally Closed (NC) loop. If the wire is cut or button pressed, the system halts. Software cannot override this until the hardware switch is physically reset.
2.  **Voltage Monitoring:** The dashboard displays real-time input voltage (via voltage divider on ESP32 ADC) to detect PSU sag.
3.  **RTC Battery Backup:** The KC868-A4 includes a CR2032 battery for the Real-Time Clock, ensuring logs have correct timestamps even during power/internet outages.
