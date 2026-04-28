
#ifndef HARDWARE_MANAGER_H
#define HARDWARE_MANAGER_H

#include "Config.h"

// Define Solenoid Logic
#define RELAY_ON  HIGH
#define RELAY_OFF LOW

class HardwareManager {
private:
  // Sequential Release State
  bool _isSequencing = false;
  uint8_t _sequenceStep = 0;
  unsigned long _lastSequenceMillis = 0;
  static const unsigned long _sequenceDelay = 1000; // 1 second delay (C++11 const)
  
  // Use uint8_t for pin array to save RAM
  const uint8_t _relays[4] = {PIN_RELAY_1, PIN_RELAY_2, PIN_RELAY_3, PIN_RELAY_4};

  // E-Stop State
  bool _eStopActive = false;

public:
  void begin() {
    // Init Relays
    for (uint8_t i = 0; i < 4; i++) {
      pinMode(_relays[i], OUTPUT);
      digitalWrite(_relays[i], RELAY_OFF);
    }

    // Init Inputs
    pinMode(PIN_INPUT_1, INPUT_PULLUP);
    pinMode(PIN_INPUT_2, INPUT_PULLUP);
    pinMode(PIN_INPUT_3, INPUT_PULLUP);
    pinMode(PIN_INPUT_4, INPUT_PULLUP);

    // Init E-Stop
    pinMode(PIN_ESTOP, INPUT_PULLUP);
  }

  void update() {
    // 1. Check E-Stop (Active LOW usually for NC switch)
    // Logic: NC switch connects to GND. Closed = LOW (Safe). Open/Cut = HIGH (Trigger).
    bool currentEStop = digitalRead(PIN_ESTOP); 
    
    if (currentEStop == HIGH && !_eStopActive) {
      _eStopActive = true;
      Serial.println(F("[HW] E-STOP TRIGGERED! INITIATING RELEASE SEQUENCE."));
      startEmergencySequence();
    } else if (currentEStop == LOW && _eStopActive) {
      _eStopActive = false; 
      Serial.println(F("[HW] E-STOP CLEARED."));
    }

    // 2. Handle Sequence
    if (_isSequencing) {
      processSequence();
    }
  }

  void triggerRelay(uint8_t relayIndex) {
    if (_eStopActive) return; // Inhibit normal ops during emergency
    if (relayIndex >= 4) return;
    
    digitalWrite(_relays[relayIndex], RELAY_ON);
    Serial.print(F("[HW] Relay ON: "));
    Serial.println(relayIndex + 1);
    
    // Non-blocking pulse logic would be better here, but keeping simple for now.
    // In production, we'd use a timer array to turn it off.
    delay(100); 
    // Note: Solenoids are often kept ON for duration of hold, or pulsed.
    // Assuming simple pulse for unlatch mechanism.
    digitalWrite(_relays[relayIndex], RELAY_OFF); 
  }

  void startEmergencySequence() {
    _isSequencing = true;
    _sequenceStep = 0;
    _lastSequenceMillis = millis() - _sequenceDelay; // Trigger immediately
  }

  void processSequence() {
    if (millis() - _lastSequenceMillis >= _sequenceDelay) {
      _lastSequenceMillis = millis();

      if (_sequenceStep < 4) {
        Serial.print(F("[HW] Seq Release: Slot "));
        Serial.println(_sequenceStep + 1);
        digitalWrite(_relays[_sequenceStep], RELAY_ON); // Open
        _sequenceStep++;
      } else {
        _isSequencing = false;
        Serial.println(F("[HW] Sequence Complete. All Open."));
      }
    }
  }

  bool isEStopActive() const {
    return _eStopActive;
  }
};

#endif
