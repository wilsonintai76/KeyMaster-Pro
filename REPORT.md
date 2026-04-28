
# Project Report: SmartKey Cloud IoT Management System

**Student Name:** [Your Name]  
**Program:** Diploma in Mechanical Engineering / IoT  
**System Version:** v2.5-Stable (Cloud/Edge Hybrid)

---

## 1. Abstract
The SmartKey Cloud IoT system is an integrated hardware-software solution designed for the secure management of workshop assets. Traditional manual key logging is prone to human error and lacks real-time accountability. This project implements a "Split-Brain" IoT architecture that ensures 99.9% availability through a hybrid online (Firebase) and offline (Emergency AP) failover mechanism. The system incorporates Condition-Based Maintenance (CBM) to monitor solenoid actuator health and utilizes Generative AI for predictive system insights.

## 2. Problem Statement
Workshop facilities often face challenges with:
1. **Security Compliance**: Overdue keys are difficult to track manually.
2. **Hardware Reliability**: Solenoid actuators have finite lifecycles; unexpected failures disrupt operations.
3. **Connectivity Dependency**: Standard IoT systems fail when internet connectivity is lost, resulting in locked-out personnel.
4. **Privacy Restrictions**: Modern web browsers restrict access to hardware identifiers (MAC addresses), complicating offline authentication.

## 3. Objectives
- To develop a responsive dashboard for real-time monitoring of 16 addressable solenoid nodes.
- To implement a **Digital Binding** protocol for secure offline authentication.
- To design a **Sequential Emergency Release** protocol to protect Power Supply Units (PSU) from in-rush current during fire safety triggers.
- To integrate **Condition-Based Maintenance (CBM)** logic for predicting mechanical fatigue.

## 4. Technical Architecture

### 4.1 Split-Brain IoT Logic
The system operates on two distinct planes:
- **Control Plane (Cloud)**: Uses Firebase Realtime Database for global synchronization and Google Gemini AI for telemetry analysis.
- **Data Plane (Edge)**: Uses the KinCony KC868-A4 (ESP32) controller to process physical I/O and host an Emergency Access Point.

### 4.2 Digital Binding & Security
Due to browser sandboxing, the system utilizes "Digital Binding." Users can optionally register their device's MAC address in the **Account Settings** panel while online. This ID is cached on the **ESP32’s Internal 4MB SPI Flash memory (using LittleFS)**. During an internet outage, the controller performs Layer-2 verification of the connecting device's hardware address against this internal whitelist before granting access.

## 5. Engineering Implementation

### 5.1 Sequential Discharge Protocol
Activating 16 solenoids simultaneously requires a high peak current (approx. 16A @ 12V). To prevent PSU shutdown or voltage sag, the software implements a **1000ms staggered delay** between each relay actuation during emergency fire releases.

### 5.2 Physical Latching E-Stop
The system distinguishes between software resets and hardware states. A physical E-Stop button is wired to the Controller’s interrupt pin. The software enters a "Latched" state that cannot be cleared via the UI until the physical button is twisted and released, ensuring technician safety.

### 5.3 CBM Mathematical Model
Mechanical health is calculated using linear degradation:
$$Health \% = 100 - \left( \frac{\text{Current Cycles}}{\text{Failure Threshold}} \times 100 \right)$$
*   **Threshold**: Configurable (Default 50,000 cycles for Solenoid lifespan).
*   **Alerting**: Automatic service flags are raised when health drops below 20%.

## 6. Hardware Specifications
| Component | Specification |
| :--- | :--- |
| Main Controller | KinCony KC868-A4 (ESP32-WROOM-32) |
| Connectivity | LAN8720 Ethernet / WiFi 802.11 b/g/n |
| **Storage** | **4MB Internal SPI Flash (LittleFS File System)** |
| Actuators | 12V DC Push-Pull Solenoids |
| Sensors | Optical Key Presence Endstops |
| Power | 12V 5A DIN Rail PSU |

## 7. Software Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS.
- **Backend**: Firebase RTDB, Google OAuth.
- **AI Engine**: Gemini 3 Flash (Predictive Analytics).
- **Offline**: PWA Service Workers (Stale-While-Revalidate).

## 8. Conclusion
The SmartKey Cloud system successfully addresses the limitations of traditional key management. By bridging the gap between cloud convenience and edge reliability through Split-Brain architecture and Digital Binding, the system provides a robust framework for industrial workshop management. Future iterations will explore biometric integration and LoRaWAN long-range failover.
