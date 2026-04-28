import { SystemConfig, SupabaseConfig, UserAccount, LogEntry, KeySlot } from '../types';

const DB_NAME = 'SmartKeyDB';
const DB_VERSION = 1;

export const STORES = {
  CONFIG: 'config',
  USERS: 'users',
  LOGS: 'logs',
  SLOTS: 'slots'
};

class OfflineDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error("IndexedDB error:", request.error);
        reject(request.error);
      };

      request.onsuccess = (event) => {
        this.db = request.result;
        console.log("IndexedDB Initialized");
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = request.result;
        
        // System Config Store (Key-Value)
        if (!db.objectStoreNames.contains(STORES.CONFIG)) {
          db.createObjectStore(STORES.CONFIG);
        }
        
        // Users Store (Keypath: id)
        if (!db.objectStoreNames.contains(STORES.USERS)) {
          db.createObjectStore(STORES.USERS, { keyPath: 'id' });
        }

        // Logs Store (Keypath: id)
        if (!db.objectStoreNames.contains(STORES.LOGS)) {
          db.createObjectStore(STORES.LOGS, { keyPath: 'id' });
        }

        // KeySlots Store (Keypath: id)
        if (!db.objectStoreNames.contains(STORES.SLOTS)) {
          db.createObjectStore(STORES.SLOTS, { keyPath: 'id' });
        }
      };
    });
  }

  // --- GENERIC HELPERS ---

  private async getStore(storeName: string, mode: IDBTransactionMode): Promise<IDBObjectStore> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  // --- CONFIG METHODS ---

  async saveSystemConfig(config: SystemConfig): Promise<void> {
    const store = await this.getStore(STORES.CONFIG, 'readwrite');
    store.put(config, 'sysConfig');
  }

  async getSystemConfig(): Promise<SystemConfig | null> {
    const store = await this.getStore(STORES.CONFIG, 'readonly');
    return new Promise((resolve) => {
      const req = store.get('sysConfig');
      req.onsuccess = () => resolve(req.result || null);
    });
  }

  async saveSupabaseConfig(config: SupabaseConfig): Promise<void> {
    const store = await this.getStore(STORES.CONFIG, 'readwrite');
    store.put(config, 'sbConfig');
  }

  async getSupabaseConfig(): Promise<SupabaseConfig | null> {
    const store = await this.getStore(STORES.CONFIG, 'readonly');
    return new Promise((resolve) => {
      const req = store.get('sbConfig');
      req.onsuccess = () => resolve(req.result || null);
    });
  }

  // --- USER METHODS ---

  async saveUsers(users: UserAccount[]): Promise<void> {
    const store = await this.getStore(STORES.USERS, 'readwrite');
    // Clear old list to ensure sync then add all
    // Note: In production, efficient diffing is better, but for <50 users, this is fine.
    const clearReq = store.clear(); 
    clearReq.onsuccess = () => {
        users.forEach(user => store.put(user));
    };
  }

  async getUsers(): Promise<UserAccount[]> {
    const store = await this.getStore(STORES.USERS, 'readonly');
    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
    });
  }

  // --- SLOT METHODS (For Offline State Persistence) ---

  async saveSlots(slots: KeySlot[]): Promise<void> {
    const store = await this.getStore(STORES.SLOTS, 'readwrite');
    slots.forEach(slot => store.put(slot));
  }

  async getSlots(): Promise<KeySlot[]> {
    const store = await this.getStore(STORES.SLOTS, 'readonly');
    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
    });
  }

  // --- LOG METHODS ---

  async addLog(log: LogEntry): Promise<void> {
    const store = await this.getStore(STORES.LOGS, 'readwrite');
    store.add(log);
  }

  async getLogs(): Promise<LogEntry[]> {
    const store = await this.getStore(STORES.LOGS, 'readonly');
    return new Promise((resolve) => {
      // Get all (might need limits for large datasets)
      const req = store.getAll();
      req.onsuccess = () => {
          const logs = req.result || [];
          // Sort by timestamp desc (newest first)
          logs.sort((a: LogEntry, b: LogEntry) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          resolve(logs);
      };
    });
  }
}

export const dbService = new OfflineDB();
