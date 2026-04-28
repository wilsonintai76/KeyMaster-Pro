import mqtt from 'mqtt';
import type { MqttClient } from 'mqtt';

export class MqttService {
  private client: MqttClient | null = null;
  public isConnected: boolean = false;
  
  constructor() {}

  public connect(url: string, topicPrefix: string = 'smartkey') {
     console.log('Connecting to MQTT broker...', url);
     this.client = mqtt.connect(url, {
         keepalive: 60,
         reconnectPeriod: 5000,
         protocolId: 'MQTT',
         protocolVersion: 4,
         clean: true,
         connectTimeout: 30 * 1000,
     });

     this.client.on('connect', () => {
         console.log('Connected to MQTT Broker.');
         this.isConnected = true;
         // Subscribe to relevant hardware topics
         this.client?.subscribe(`${topicPrefix}/hardware/status`);
         this.client?.subscribe(`${topicPrefix}/hardware/response`);
     });

     this.client.on('message', (topic, message) => {
         console.log(`Received message on ${topic}: ${message.toString()}`);
         // Here, we would handle updates that perhaps aren't routed to Firebase, 
         // but the user requested: "frontend will connect to cloud mqtt and rtdb record the transaction"
         // This typically means the frontend sends commands via MQTT and also reads from it if realtime latency requires it.
         // And changes are pushed to RTDB for persistent log.
     });

     this.client.on('error', (err) => {
         console.error('MQTT Connection error: ', err);
         this.isConnected = false;
     });
     
     this.client.on('close', () => {
         console.log('MQTT Connection closed.');
         this.isConnected = false;
     });
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
          this.isConnected = false;
      }
  }
}

export const mqttService = new MqttService();
