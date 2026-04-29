
#ifndef NETWORK_MANAGER_H
#define NETWORK_MANAGER_H

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <ArduinoJson.h>
#include "StorageManager.h"
#include "HardwareManager.h"

// BLE UUIDs for Nordic UART Service
#define SERVICE_UUID           "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
#define CHARACTERISTIC_UUID_RX "6e400002-b5a3-f393-e0a9-e50e24dcca9e"
#define CHARACTERISTIC_UUID_TX "6e400003-b5a3-f393-e0a9-e50e24dcca9e"

class NetworkManager; // Forward declaration

class MyBLECallbacks: public BLEServerCallbacks {
    NetworkManager* _manager;
public:
    MyBLECallbacks(NetworkManager* manager) : _manager(manager) {}
    void onConnect(BLEServer* pServer) {
        Serial.println(F("[BLE] Connected"));
        _manager->setBleStatus(true);
    };

    void onDisconnect(BLEServer* pServer) {
        Serial.println(F("[BLE] Disconnected. Restarting Advertising..."));
        _manager->setBleStatus(false);
        pServer->getAdvertising()->start();
    }
};

class MyBLECharacteristicCallbacks: public BLECharacteristicCallbacks {
    NetworkManager* _manager;
public:
    MyBLECharacteristicCallbacks(NetworkManager* manager) : _manager(manager) {}
    void onWrite(BLECharacteristic *pCharacteristic);
};

class NetworkManager {
private:
  StorageManager* _storage;
  HardwareManager* _hw;
  
  WiFiClientSecure _wifiClient;
  PubSubClient _mqtt;
  
  BLEServer *_pServer = NULL;
  BLECharacteristic *_pTxCharacteristic = NULL;
  
  bool _isBleConnected = false;
  unsigned long _lastMqttRetry = 0;
  unsigned long _lastStatusUpdate = 0;

public:
  NetworkManager(StorageManager* storage, HardwareManager* hw) 
    : _storage(storage), _hw(hw), _mqtt(_wifiClient) {}
  
  void setBleStatus(bool status) { _isBleConnected = status; }
  bool isMqttConnected() { return _mqtt.connected(); }
  bool isBleConnected() { return _isBleConnected; }

  void begin() {
    setupBLE();
    setupWifi();
    setupMQTT();
  }

  void update() {
    if (!_mqtt.loop() && WiFi.status() == WL_CONNECTED) {
      long now = millis();
      if (now - _lastMqttRetry > 5000) {
        _lastMqttRetry = now;
        reconnectMQTT();
      }
    }

    // Periodic report
    if (millis() - _lastStatusUpdate > 10000) {
      _lastStatusUpdate = millis();
      sendStatusReport();
    }
  }

  void handleCommand(String payload) {
    Serial.print(F("[CMD] Handling: "));
    Serial.println(payload);
    
    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, payload);
    if (error) return;

    const char* action = doc["action"];
    if (strcmp(action, "unlock") == 0) {
      int slotId = doc["slotId"];
      _hw->triggerRelay((uint8_t)(slotId - 1));
      notifyResponse("success", "Unlocked slot " + String(slotId));
    }
    // Add more command handlers (sync, maintenance, etc) here
  }

private:
  void setupBLE() {
    String deviceName = "SmartKey_" + _storage->config.system_id;
    if (deviceName.length() > 20) deviceName = "SmartKey_ESP";
    
    BLEDevice::init(deviceName.c_str());
    _pServer = BLEDevice::createServer();
    _pServer->setCallbacks(new MyBLECallbacks(this));

    BLEService *pService = _pServer->createService(SERVICE_UUID);
    _pTxCharacteristic = pService->createCharacteristic(
                            CHARACTERISTIC_UUID_TX,
                            BLECharacteristic::PROPERTY_NOTIFY
                         );
    _pTxCharacteristic->addDescriptor(new BLE2902());

    BLECharacteristic *pRxCharacteristic = pService->createCharacteristic(
                                              CHARACTERISTIC_UUID_RX,
                                              BLECharacteristic::PROPERTY_WRITE
                                           );
    pRxCharacteristic->setCallbacks(new MyBLECharacteristicCallbacks(this));

    pService->start();
    _pServer->getAdvertising()->start();
    Serial.println(F("[BLE] UART Service Advertising..."));
  }

  void setupWifi() {
    if (_storage->config.wifi_ssid.length() == 0) return;
    WiFi.begin(_storage->config.wifi_ssid.c_str(), _storage->config.wifi_pass.c_str());
  }

  void setupMQTT() {
    if (_storage->config.mqtt_server.length() == 0) return;
    
    // For HiveMQ Cloud, use 8883 with SSL
    _wifiClient.setInsecure(); // Simplified for PWA demo. Production should use Root CA cert.
    _mqtt.setServer(_storage->config.mqtt_server.c_str(), _storage->config.mqtt_port);
    _mqtt.setCallback([this](char* topic, byte* payload, unsigned int length) {
      String msg = "";
      for (int i = 0; i < length; i++) msg += (char)payload[i];
      this->handleCommand(msg);
    });
  }

  void reconnectMQTT() {
    if (_mqtt.connected()) return;
    
    String clientId = "ESP32Client-" + _storage->config.system_id;
    Serial.print(F("[MQTT] Connecting..."));
    
    if (_mqtt.connect(clientId.c_str(), _storage->config.mqtt_user.c_str(), _storage->config.mqtt_pass.c_str())) {
      Serial.println(F("Connected"));
      String cmdTopic = _storage->config.mqtt_topic_prefix + "/hardware/command";
      _mqtt.subscribe(cmdTopic.c_str());
    } else {
      Serial.print(F("Failed, rc="));
      Serial.println(_mqtt.state());
    }
  }

  void sendStatusReport() {
    StaticJsonDocument<256> doc;
    doc["status"] = "online";
    doc["uptime"] = millis() / 1000;
    doc["rssi"] = WiFi.RSSI();
    
    String output;
    serializeJson(doc, output);

    // Report over MQTT if online
    if (_mqtt.connected()) {
       String statusTopic = _storage->config.mqtt_topic_prefix + "/hardware/status";
       _mqtt.publish(statusTopic.c_str(), output.c_str());
    }

    // Always keep BLE updated with latest status blob
    if (_pTxCharacteristic) {
       _pTxCharacteristic->setValue(output.c_str());
       _pTxCharacteristic->notify();
    }
  }

  void notifyResponse(String status, String msg) {
    StaticJsonDocument<128> doc;
    doc["status"] = status;
    doc["msg"] = msg;
    
    String output;
    serializeJson(doc, output);
    
    if (_mqtt.connected()) {
       String respTopic = _storage->config.mqtt_topic_prefix + "/hardware/response";
       _mqtt.publish(respTopic.c_str(), output.c_str());
    }
    
    if (_pTxCharacteristic) {
       _pTxCharacteristic->setValue(output.c_str());
       _pTxCharacteristic->notify();
    }
  }
};

void MyBLECharacteristicCallbacks::onWrite(BLECharacteristic *pCharacteristic) {
    std::string value = pCharacteristic->getValue();
    if (value.length() > 0) {
        String msg = "";
        for (int i = 0; i < value.length(); i++) msg += value[i];
        _manager->handleCommand(msg);
    }
}

#endif
