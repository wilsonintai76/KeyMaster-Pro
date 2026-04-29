
#ifndef STORAGE_MANAGER_H
#define STORAGE_MANAGER_H

#include <FS.h>
#include <LittleFS.h>
#include <ArduinoJson.h>

struct SystemConfigData {
  String wifi_ssid;
  String wifi_pass;
  String mqtt_server;
  int mqtt_port;
  String mqtt_user;
  String mqtt_pass;
  String mqtt_topic_prefix;
  String system_id;
};

class StorageManager {
public:
  SystemConfigData config;

  bool begin() {
    // Format on fail = true
    if (!LittleFS.begin(true)) { 
      Serial.println(F("[FS] Mount Failed"));
      return false;
    }
    Serial.println(F("[FS] Mounted Successfully"));
    return true;
  }

  void loadConfig() {
    if (!LittleFS.exists(PATH_CONFIG)) {
      Serial.println(F("[FS] No config found. Waiting for Provisioning..."));
      return;
    }

    File file = LittleFS.open(PATH_CONFIG, "r");
    if (!file) return;

    // Use StaticJsonDocument for stack allocation (no heap fragmentation)
    StaticJsonDocument<1024> doc;
    DeserializationError error = deserializeJson(doc, file);
    
    if (!error) {
      config.wifi_ssid = doc["wifi_ssid"].as<String>();
      config.wifi_pass = doc["wifi_pass"].as<String>();
      config.mqtt_server = doc["mqtt_server"].as<String>();
      config.mqtt_port   = doc["mqtt_port"] | 8883;
      config.mqtt_user   = doc["mqtt_user"].as<String>();
      config.mqtt_pass   = doc["mqtt_pass"].as<String>();
      config.mqtt_topic_prefix = doc["topic_prefix"].as<String>();
      config.system_id = doc["system_id"].as<String>();
      Serial.print(F("[FS] Config Loaded: "));
      Serial.println(config.system_id);
    } else {
      Serial.println(F("[FS] Config Parse Error"));
    }
    file.close();
  }

  // Optimization: Pass by reference to avoid string copy
  void saveConfig(const String& jsonPayload) {
    File file = LittleFS.open(PATH_CONFIG, "w");
    if (!file) {
      Serial.println(F("[FS] Failed to open config for writing"));
      return;
    }
    file.print(jsonPayload);
    file.close();
    Serial.println(F("[FS] Config Saved!"));
    loadConfig();
  }

  void saveWhitelist(const String& jsonPayload) {
    File file = LittleFS.open(PATH_WHITELIST, "w");
    if (file) {
      file.print(jsonPayload);
      file.close();
      Serial.println(F("[FS] Whitelist Updated"));
    }
  }

  // Verifies credentials. Returns the User Name if valid, or empty string if failed.
  // Optimization: Pass Strings by const reference
  String verifyOfflineUser(const String& mac, const String& staffId, const String& pin) {
    if (!LittleFS.exists(PATH_WHITELIST)) return "";
    
    File file = LittleFS.open(PATH_WHITELIST, "r");
    if (!file) return "";

    // Parse the entire whitelist (Max 2KB for efficiency)
    StaticJsonDocument<2048> doc;
    DeserializationError error = deserializeJson(doc, file);
    file.close();

    if (error) {
      Serial.println(F("[FS] Whitelist JSON corrupted"));
      return "";
    }

    JsonArray users = doc.as<JsonArray>();
    for (JsonObject u : users) {
      // Use temporary references
      const char* storedMac = u["macAddress"];
      const char* storedId = u["staffId"];
      const char* storedPin = u["offlinePin"];
      const char* userName = u["name"];

      if (!userName) continue;

      // Check MAC Binding (Case Insensitive)
      if (mac.length() > 0 && storedMac && strcasecmp(mac.c_str(), storedMac) == 0) {
        Serial.print(F("[AUTH] MAC Match: "));
        Serial.println(userName);
        return String(userName);
      }

      // Check ID + PIN Fallback
      if (staffId.length() > 0 && pin.length() > 0 && storedId && storedPin) {
        if (staffId.equals(storedId) && pin.equals(storedPin)) {
          Serial.print(F("[AUTH] PIN Match: "));
          Serial.println(userName);
          return String(userName);
        }
      }
    }

    Serial.println(F("[AUTH] No Credentials Matched"));
    return "";
  }
};

#endif
