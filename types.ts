
export enum KeyStatus {
  AVAILABLE = 'Available',
  BORROWED = 'Borrowed',
  UNLOCKED = 'Unlocked'
}

export interface KeySlot {
  id: number;
  label: string;
  status: KeyStatus;
  lastUpdated: string;
  borrowedBy?: string;
  borrowedAt?: string;
  usageCount: number;
  isLocked?: boolean;
  voltage?: number; 
  networkLatency?: number; // Replaced signalStrength with ms latency for Ethernet
}

export interface LogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  keyLabel: string;
  type: 'success' | 'warning' | 'info';
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'locked' | 'pending' | 'inactive';
  role: 'staff' | 'admin' | '';
  avatar: string;
  phone?: string;
  macAddress?: string; // Digital Binding for Offline Access
  staffId?: string;    // New: 4-Digit ID for Manual Offline
  offlinePin?: string; // New: Simple PIN for Manual Offline
}

export interface SystemConfig {
  maxBorrowDuration: number;
  gracePeriod: number;
  officeOpenTime: string;
  officeCloseTime: string;
  maintenanceThreshold: number;
  enableAI: boolean;
  geminiApiKey: string; // Added user-configurable API Key
  systemID: string;
  sessionTimeout: number; // Duration in minutes before auto-logout
  offlineStorage: 'browser' | 'board'; // New: Choose between IndexedDB or LittleFS
  adminEmail?: string; // New: Persist the Super Admin email from Wizard
  mqttUrl?: string; // e.g. wss://broker.hivemq.com:8884/mqtt
  mqttTopicPrefix?: string; // e.g. smartkey/system-1
}

export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export interface ControllerStatus {
  online: boolean;
  lastSeen: number;
  ip: string;
  mode: 'STA' | 'AP';
  voltage?: number; // Real RTC Battery Voltage
  rssi?: number;    // WiFi Signal Strength
  uptime?: string;  // System Uptime
}