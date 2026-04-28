
import { KeyStatus, KeySlot, SystemConfig, SupabaseConfig } from './types';

const currentTime = new Date();
const oneHourAgo = new Date(currentTime.getTime() - (60 * 60 * 1000));

// ENGINEERING CONSTANTS
export const SOLENOID_MAX_CYCLES = 50000; // Heat/Coil degradation limit
export const SWITCH_MAX_CYCLES = 100000;  // Mechanical spring fatigue limit
export const RTC_NOMINAL_VOLTAGE = 3.0;   // CR2032

export const INITIAL_SLOTS: KeySlot[] = [];

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  maxBorrowDuration: 12,
  gracePeriod: 15,
  officeOpenTime: '09:00',
  officeCloseTime: '17:00',
  maintenanceThreshold: 300,
  enableAI: false,
  geminiApiKey: '',
  systemID: 'SYS-001',
  sessionTimeout: 30,
  offlineStorage: 'browser',
  adminEmail: 'admin@example.com',
  mqttUrl: 'wss://broker.emqx.io:8084/mqtt',
  mqttTopicPrefix: 'smartkey/sys-001'
};

export const DEFAULT_SUPABASE_CONFIG: SupabaseConfig = {
  supabaseUrl: "https://wyxumptzaduqedwayzeq.supabase.co",
  supabaseAnonKey: "sb_publishable_el93VMYaUMTveaR6ojlfiw_pcUD6891",
};
