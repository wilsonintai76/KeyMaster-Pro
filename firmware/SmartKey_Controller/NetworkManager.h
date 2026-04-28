
#ifndef NETWORK_MANAGER_H
#define NETWORK_MANAGER_H

#include <WiFi.h>
#include <WebServer.h>
#include <Firebase_ESP_Client.h>
#include <ArduinoJson.h>
#include "StorageManager.h"
#include "HardwareManager.h"
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

class NetworkManager {
private:
  StorageManager* _storage;
  HardwareManager* _hw;
  WebServer _server;
  
  FirebaseData _fbData;
  FirebaseAuth _fbAuth;
  FirebaseConfig _fbConfig;
  
  bool _isCloudConnected = false;
  unsigned long _lastSyncTime = 0;
  static const unsigned long _syncInterval = 300000; // 5 Minutes

public:
  NetworkManager(StorageManager* storage, HardwareManager* hw) 
    : _storage(storage), _hw(hw), _server(80) {}

  void begin() {
    setupWifi();
    setupServer();
  }

  void update() {
    _server.handleClient();

    // Periodic Sync: Keep local cache updated with Cloud changes
    if (_isCloudConnected && millis() - _lastSyncTime > _syncInterval) {
      _lastSyncTime = millis();
      Serial.println(F("[NET] Performing Periodic Whitelist Sync..."));
      syncWhitelist();
    }
  }

  bool isCloudConnected() const {
    return _isCloudConnected;
  }

private:
  void setupWifi() {
    if (_storage->config.wifi_ssid.length() == 0) {
      startAP();
      return;
    }

    Serial.print(F("[NET] Connecting to "));
    Serial.println(_storage->config.wifi_ssid);
    
    WiFi.begin(_storage->config.wifi_ssid.c_str(), _storage->config.wifi_pass.c_str());
    
    uint8_t attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
      delay(500);
      Serial.print(".");
      attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
      Serial.println(F("\n[NET] WiFi Connected."));
      setupFirebase();
    } else {
      Serial.println(F("\n[NET] WiFi Failed. Starting Emergency AP."));
      startAP();
    }
  }

  void startAP() {
    WiFi.mode(WIFI_AP);
    WiFi.softAP(AP_SSID, AP_PASS);
    WiFi.softAPConfig(AP_IP, AP_IP, AP_MASK);
    Serial.print(F("[NET] AP Started: "));
    Serial.println(WiFi.softAPIP());
  }

  void setupFirebase() {
    if (_storage->config.fb_url.length() == 0) return;

    _fbConfig.api_key = _storage->config.fb_key;
    _fbConfig.database_url = _storage->config.fb_url;
    
    if (Firebase.signUp(&_fbConfig, &_fbAuth, "", "")) {
      Serial.println(F("[FB] Auth Success"));
      Firebase.begin(&_fbConfig, &_fbAuth);
      Firebase.reconnectWiFi(true);
      _isCloudConnected = true;
      syncWhitelist();
    } else {
      Serial.print(F("[FB] Auth Failed: "));
      Serial.println(_fbConfig.signer.test_mode ? "Test Mode" : _fbAuth.token.uid.c_str());
    }
  }

  void syncWhitelist() {
    if (Firebase.RTDB.getJSON(&_fbData, "/users")) {
      // Pass by reference implicitly handled by string class, 
      // but ensure we don't copy unnecessarily if we can avoid it.
      _storage->saveWhitelist(_fbData.jsonString());
    } else {
      Serial.print(F("[FB] Sync Failed: "));
      Serial.println(_fbData.errorReason());
    }
  }

  // --- WEB SERVER HANDLERS ---

  void setupServer() {
    // 1. Provisioning Endpoint
    _server.on("/provision", HTTP_POST, [this]() {
      if (!_server.hasArg("plain")) {
        _server.send(400, "text/plain", "Body missing");
        return;
      }
      String body = _server.arg("plain");
      Serial.println(F("[API] Provisioning Received."));
      _storage->saveConfig(body);
      _server.send(200, "application/json", "{\"status\":\"success\",\"msg\":\"Config saved. Restarting...\"}");
      delay(1000);
      ESP.restart();
    });

    // 2. Offline Authentication Endpoint
    _server.on("/auth", HTTP_POST, [this]() {
      _server.sendHeader("Access-Control-Allow-Origin", "*");
      
      if (!_server.hasArg("plain")) {
        _server.send(400, "application/json", "{\"error\":\"Missing body\"}");
        return;
      }
      
      String body = _server.arg("plain");
      // Use StaticJsonDocument for small payload
      StaticJsonDocument<256> doc;
      deserializeJson(doc, body);

      String mac = doc["mac"] | "";
      String id = doc["staffId"] | "";
      String pin = doc["pin"] | "";

      String authorizedUser = _storage->verifyOfflineUser(mac, id, pin);

      if (authorizedUser.length() > 0) {
        // Simple string concatenation is fine here for small response
        String resp = "{\"status\":\"authorized\", \"user\":\"" + authorizedUser + "\"}";
        _server.send(200, "application/json", resp);
      } else {
        _server.send(401, "application/json", "{\"status\":\"denied\"}");
      }
    });

    // 3. Offline Actuation Endpoint
    _server.on("/actuate", HTTP_POST, [this]() {
      _server.sendHeader("Access-Control-Allow-Origin", "*");
      
      if (!_server.hasArg("plain")) {
        _server.send(400, "application/json", "{\"error\":\"Missing body\"}");
        return;
      }

      String body = _server.arg("plain");
      StaticJsonDocument<128> doc;
      deserializeJson(doc, body);
      
      int slotId = doc["slotId"];
      const char* action = doc["action"];

      if (slotId > 0 && slotId <= 4 && strcmp(action, "unlock") == 0) {
         _hw->triggerRelay((uint8_t)(slotId - 1));
         _server.send(200, "application/json", "{\"status\":\"success\"}");
      } else {
         _server.send(400, "application/json", "{\"status\":\"invalid_request\"}");
      }
    });
    
    _server.begin();
  }
};

#endif
