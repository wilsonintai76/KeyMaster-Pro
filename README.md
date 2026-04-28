
# SmartKey Cloud IoT Dashboard (FYP)

## System Overview
The **SmartKey Cloud IoT Dashboard** is a high-fidelity control interface designed for a Final Year Project (FYP). It manages a mechanical key management system used in university workshops. The system controls solenoid actuators to lock/release keys, monitors usage telemetry for Predictive Maintenance (CBM), and enforces security protocols.

Designed as a **Zero-Config Self-Hosted PWA**, this dashboard allows workshop administrators to deploy the software on any hosting platform and connect it to their own personal Firebase backend via the integrated **System Setup Wizard**.

---

## Installation & Setup (First Run)
Upon launching the application for the first time, the **System Installer** will automatically trigger. This allows for a "Code-Free" deployment without editing source code.

1.  **Deployment:** Host the build files on **Firebase Hosting** (Recommended for Google Auth support) or run locally.
2.  **Wizard Launch:** The app detects a fresh install (missing configuration) and opens the Setup Wizard.
3.  **Cloud Connection:** Input your **Firebase Configuration** (API Key, Database URL, Project ID) obtained from the Firebase Console.
    *   *The wizard will perform a connection test to verify your credentials before proceeding.*
4.  **Admin Bootstrap:** Enter the **Google Email Address** of the intended Super Admin.
    *   *This account will be automatically created and granted full Admin privileges upon first login.*
5.  **Storage Strategy:** Select your preferred Offline Strategy (Browser Storage vs. Controller Board Flash).
6.  **Initialization:** The system saves credentials to the browser's **Secure Local Storage** and establishes the Uplink.

> **Note:** To enable AI insights, navigate to *Control Hub > System Modules* after installation and provide a Google Gemini API Key.

---

## The "No-SD" Offline Architecture
A critical design choice for this system is the replacement of external SD card storage with **Internal SPI Flash (LittleFS)**.

### Why LittleFS?
For a workshop environment, external SD cards represent a mechanical point of failure. The **KC868-A4** (ESP32) utilizes 4MB of onboard Flash memory.
*   **Atomic Operations:** LittleFS ensures that if power is lost during a write (common in workshops), the file system remains consistent.
*   **Zero-Hardware Footprint:** By using the internal silicon of the ESP32, the system is more compact and resistant to vibration from heavy machinery.

### Digital Binding Logic (Offline Verification)
1.  **Identity Registration:** Users optionally register their device MAC address in the **Settings > Account** menu.
2.  **Flash Caching:** The ESP32 pulls the user list from Firebase and serializes it into a `whitelist.json` file stored in the internal LittleFS partition.
3.  **Layer-2 Auth:** In "Emergency AP" mode, the ESP32 hosts a captive portal. It performs a direct lookup in the LittleFS storage to verify the hardware ID of the connecting device before granting access.

---

## Tech Stack
*   **Edge Hardware:** KinCony KC868-A4 (ESP32-WROOM-32).
*   **File System:** LittleFS (Internal 4MB SPI Flash).
*   **Backend:** Firebase Realtime Database (User Provided).
*   **AI Engine:** Google Gemini 3 Flash (Predictive Analytics).
*   **Frontend:** React 18, TypeScript, Tailwind CSS.
*   **Architecture:** Split-Brain (Hybrid Online/Offline).

---

## CBM Mathematical Model
Mechanical health is calculated using linear degradation:

$$Health \% = 100 - \left( \frac{\text{UsageCount}}{\text{Threshold}} \times 100 \right)$$

*   **Actuator Limit:** 50,000 cycles (Solenoid thermal fatigue).
*   **Switch Limit:** 100,000 cycles (Mechanical spring fatigue).
