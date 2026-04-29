import mqtt from 'mqtt';
import type { MqttClient } from 'mqtt';

export type MqttStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export class MqttService {
  private client: MqttClient | null = null;
  public isConnected: boolean = false;
  public status: MqttStatus = 'disconnected';
  private onErrorCallback: ((msg: string) => void) | null = null;
  private onStatusChangeCallbacks: ((status: MqttStatus) => void)[] = [];
  
  constructor() {}

  private setStatus(newStatus: MqttStatus) {
      this.status = newStatus;
      this.isConnected = (newStatus === 'connected');
      this.onStatusChangeCallbacks.forEach(cb => cb(newStatus));
  }

  public onStatusChange(callback: (status: MqttStatus) => void) {
      this.onStatusChangeCallbacks.push(callback);
      callback(this.status); // Initial call
      return () => {
          this.onStatusChangeCallbacks = this.onStatusChangeCallbacks.filter(c => c !== callback);
      };
  }

  public onConnectionError(callback: (msg: string) => void) {
      this.onErrorCallback = callback;
  }

  public connect(url: string, topicPrefix: string = 'smartkey', username?: string, password?: string) {
     if (this.client) {
         this.disconnect();
     }

     if (!url || url.trim() === '') {
         this.setStatus('disconnected');
         return;
     }

     // Browser-side MQTT must use wss:// or ws://
     if (!url.startsWith('wss://') && !url.startsWith('ws://')) {
         const errorMsg = "MQTT Configuration Error: URL must start with wss:// for cloud connections in the browser.";
         this.setStatus('error');
         if (this.onErrorCallback) this.onErrorCallback(errorMsg);
         return;
     }

     if (url.includes('.hivemq.cloud') && (!username || username.trim() === '')) {
         const errorMsg = "MQTT Setup Required: HiveMQ Cloud clusters REQUIRE individual credentials. Go to 'Access Management' in HiveMQ Console to create them.";
         console.warn(errorMsg);
         this.setStatus('error');
         if (this.onErrorCallback) this.onErrorCallback(errorMsg);
         return;
     }

     this.setStatus('connecting');
     console.log('Connecting to MQTT broker...', url);
     
     const options: any = {
         keepalive: 60,
         reconnectPeriod: 5000,
         clean: true,
         connectTimeout: 30 * 1000,
         clientId: 'smartkey_app_' + Math.random().toString(16).substring(2, 10),
         rejectUnauthorized: true,
         protocolId: 'MQTT',
         protocolVersion: 4,
         // Some brokers need this for WSS/Honeypot protection
         properties: {
             sessionExpiryInterval: 0
         }
     };

     if (username && username.trim() !== '') {
         options.username = username.trim();
         options.password = password?.trim();
     }

     try {
        this.client = mqtt.connect(url, options);

        this.client.on('connect', () => {
            console.log('Connected to MQTT Broker.');
            this.setStatus('connected');
            this.client?.subscribe(`${topicPrefix}/hardware/status`);
            this.client?.subscribe(`${topicPrefix}/hardware/response`);
        });

        this.client.on('message', (topic, message) => {
            console.log(`Received message on ${topic}: ${message.toString()}`);
        });

        this.client.on('error', (err: any) => {
            let msg = err?.message || String(err);
            console.error('MQTT Connection error details:', err);
            this.setStatus('error');
            
            if (msg.toLowerCase().includes('authorized') || msg.includes('403') || msg.includes('5')) {
                msg = "MQTT Not Authorized: Incorrect username or password. Note: HiveMQ Cloud requires 'Cluster Credentials' (Access Management), NOT your account password.";
            } else if (msg.includes('refused') || msg.includes('405') || msg.includes('timeout')) {
                msg = "MQTT Connection Failed: The broker refused connection. Check your URL, port (8884 for WSS), and Internet connection.";
            }

            if (this.onErrorCallback) {
                this.onErrorCallback(msg);
            }
        });
        
        this.client.on('close', () => {
            if (this.status !== 'connecting' && this.status !== 'error') {
                this.setStatus('disconnected');
            }
        });

        this.client.on('reconnect', () => {
            this.setStatus('connecting');
        });
     } catch (e: any) {
        console.error("MQTT Connect exception", e);
        if (this.onErrorCallback) this.onErrorCallback(e.message || "Failed to initiate MQTT connection");
     }
  }
  
  public publishCommand(topicPrefix: string, command: string, payload: any) {
     if (this.client && this.client.connected) {
         this.client.publish(`${topicPrefix}/hardware/command/` + command, JSON.stringify(payload));
     } else {
         console.warn("MQTT publish failed: not connected.");
     }
  }

  public disconnect() {
      if (this.client) {
          this.client.end();
          this.client = null;
          this.setStatus('disconnected');
      }
  }
}

export const mqttService = new MqttService();
