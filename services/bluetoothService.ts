
import { ControllerStatus, KeySlot } from '../types';

export type BluetoothStatus = 'disconnected' | 'scanning' | 'connecting' | 'connected' | 'error';

export class BluetoothService {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  
  public status: BluetoothStatus = 'disconnected';
  private onStatusChangeCallbacks: ((status: BluetoothStatus) => void)[] = [];
  private onDataReceivedCallbacks: ((data: string) => void)[] = [];

  // Standard UUIDs for simple serial-like communication (e.g. Nordic UART Service)
  private SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
  private TX_CHAR_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // Write
  private RX_CHAR_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // Notify

  constructor() {}

  private setStatus(newStatus: BluetoothStatus) {
    this.status = newStatus;
    this.onStatusChangeCallbacks.forEach(cb => cb(newStatus));
  }

  public onStatusChange(callback: (status: BluetoothStatus) => void) {
    this.onStatusChangeCallbacks.push(callback);
    callback(this.status);
    return () => {
      this.onStatusChangeCallbacks = this.onStatusChangeCallbacks.filter(c => c !== callback);
    };
  }

  public onDataReceived(callback: (data: string) => void) {
    this.onDataReceivedCallbacks.push(callback);
    return () => {
      this.onDataReceivedCallbacks = this.onDataReceivedCallbacks.filter(c => c !== callback);
    };
  }

  public async connect(): Promise<void> {
    try {
      if (!navigator.bluetooth) {
        throw new Error('Web Bluetooth is not supported in this browser/context.');
      }

      this.setStatus('scanning');
      
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'SmartKey' }],
        optionalServices: [this.SERVICE_UUID]
      });

      this.device.addEventListener('gattserverdisconnected', this.onDisconnected.bind(this));

      this.setStatus('connecting');
      this.server = await this.device.gatt?.connect() || null;
      
      if (!this.server) throw new Error('Failed to connect to GATT Server');

      const service = await this.server.getPrimaryService(this.SERVICE_UUID);
      this.characteristic = await service.getCharacteristic(this.RX_CHAR_UUID);
      
      await this.characteristic.startNotifications();
      this.characteristic.addEventListener('characteristicvaluechanged', this.handleNotifications.bind(this));

      this.setStatus('connected');
      console.log('Bluetooth connected to:', this.device.name);
    } catch (error: any) {
      console.error('Bluetooth connection failed:', error);
      this.setStatus('error');
      throw error;
    }
  }

  private onDisconnected() {
    console.log('Bluetooth device disconnected');
    this.setStatus('disconnected');
    this.device = null;
    this.server = null;
    this.characteristic = null;
  }

  private handleNotifications(event: any) {
    const value = event.target.value;
    const decoder = new TextDecoder();
    const message = decoder.decode(value);
    this.onDataReceivedCallbacks.forEach(cb => cb(message));
  }

  public async sendCommand(command: string): Promise<void> {
    if (!this.server || !this.device) throw new Error('Not connected to Bluetooth');
    
    try {
      const service = await this.server.getPrimaryService(this.SERVICE_UUID);
      const txChar = await service.getCharacteristic(this.TX_CHAR_UUID);
      const encoder = new TextEncoder();
      const data = encoder.encode(command + '\n');
      await txChar.writeValue(data);
    } catch (error) {
      console.error('Failed to send Bluetooth command:', error);
      throw error;
    }
  }

  public disconnect() {
    if (this.device && this.device.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.onDisconnected();
  }

  // Helper to parse status messages from HW if needed
  public parseStatus(msg: string): ControllerStatus | null {
    try {
      if (msg.startsWith('{') && msg.endsWith('}')) {
        return JSON.parse(msg);
      }
    } catch (e) {
      return null;
    }
    return null;
  }
}

export const bluetoothService = new BluetoothService();
