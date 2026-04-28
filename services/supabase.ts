import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { KeySlot, LogEntry, UserAccount, SystemConfig, SupabaseConfig, ControllerStatus } from '../types';

class SupabaseService {
  private client: SupabaseClient | undefined;
  public isConnected: boolean = false;
  private configChannel: any;
  private hardwareChannel: any;
  private slotsChannel: any;

  constructor() {
    this.isConnected = false;
  }

  public async validateConfig(config: SupabaseConfig): Promise<{ valid: boolean; message?: string }> {
    try {
      if (!config.supabaseUrl || !config.supabaseAnonKey) {
        throw new Error("Missing Supabase URL or Anon Key");
      }
      
      const testClient = createClient(config.supabaseUrl, config.supabaseAnonKey);
      // Try to fetch something simple or just check if URL is reachable
      // actually if the anon key is wrong, DB queries will just return 401/403 or empty. 
      // let's do a simple count or dummy network request via ping
      // The simplest way to test connection is to query a table, e.g., 'config' with limit 1
      const { error } = await testClient.from('config').select('*').limit(1);
      
      if (error && error.code !== '42P01') { // 42P01 is relation does not exist, which is fine if DB is empty
         console.warn("Validation error code:", error);
         if (error.message.includes('Invalid API key') || error.code === 'PGRST301') {
             return { valid: false, message: "Invalid Anon Key."};
         }
      }
      return { valid: true };
    } catch (error: any) {
      return { valid: false, message: error.message || "Invalid Configuration." };
    }
  }

  public async connect(config: SupabaseConfig): Promise<boolean> {
    try {
      if (!config.supabaseUrl || !config.supabaseAnonKey) {
        throw new Error("Missing Supabase URL or Anon Key");
      }
      
      this.client = createClient(config.supabaseUrl, config.supabaseAnonKey);
      this.isConnected = true;
      return true;
    } catch (error: any) {
      // Swallowing the connection error silently to avoid console flooding or automated system alerts
      // if the user simply has an invalid/local URL set.
      this.isConnected = false;
      this.client = undefined;
      return false;
    }
  }

  public async disconnect() {
    if (this.client) {
      if (this.configChannel) {
        this.client.removeChannel(this.configChannel);
      }
      if (this.slotsChannel) {
        this.client.removeChannel(this.slotsChannel);
      }
      if (this.hardwareChannel) {
        this.client.removeChannel(this.hardwareChannel);
      }
      this.client = undefined;
    }
    this.isConnected = false;
    console.log("Supabase Service: Disconnected.");
  }

  // --- Auth Methods ---
  public async loginGoogle(): Promise<User | null> {
    if (!this.client) throw new Error("Client not initialized.");
    
    // Supabase standard OAuth sign in
    // Note: in an iframe, popup auth might be required or redirect.
    // For this context, standard signInWithOAuth handles redirect.
    const { data, error } = await this.client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });

    if (error) {
      throw error;
    }

    // if redirected, it might reload the page.
    return null;
  }

  public async logout(): Promise<void> {
      if (this.client) {
          await this.client.auth.signOut();
      }
  }

  public async getCurrentUser(): Promise<User | null> {
      if (!this.client) return null;
      const { data: { session } } = await this.client.auth.getSession();
      return session?.user || null;
  }

  // --- Realtime Listeners ---

  // Because Supabase realtime uses postgres changes, we listen to inserts/updates using channels.
  // BUT the user may not have setup tables yet. So we will catch errors.

  public subscribeToSlots(callback: (slots: KeySlot[]) => void): () => void {
    if (!this.client) return () => {};
    // First fetch initial state
    this.client.from('slots').select('*').then(({data, error}) => {
       if (!error && data) callback(data as KeySlot[]);
    });

    this.slotsChannel = this.client.channel('custom-all-channel-slots')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'slots' },
        (payload) => {
          // If they update a slot we should re-fetch all for simplicity, or handle local state
          this.client?.from('slots').select('*').then(({data, error}) => {
             if (!error && data) callback(data as KeySlot[]);
          });
        }
      )
      .subscribe();
      
    return () => {
       if (this.slotsChannel) this.client?.removeChannel(this.slotsChannel);
    };
  }

  public subscribeToConfig(callback: (config: SystemConfig) => void): () => void {
    if (!this.client) return () => {};
    this.client.from('config').select('*').limit(1).single().then(({data, error}) => {
       if (!error && data) callback(data as SystemConfig);
    });

    this.configChannel = this.client.channel('custom-all-channel-config')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'config' },
        (payload) => {
          if (payload.new) callback(payload.new as SystemConfig);
        }
      )
      .subscribe();
      
    return () => {
       if (this.configChannel) this.client?.removeChannel(this.configChannel);
    };
  }

  public subscribeToEmergencyTrigger(callback: (triggered: boolean) => void): () => void {
    if (!this.client) return () => {};
    this.client.from('hardware').select('emergencyTrigger').limit(1).single().then(({data, error}) => {
       if (!error && data) callback(data.emergencyTrigger || false);
    });

    this.hardwareChannel = this.client.channel('custom-all-channel-hardware')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hardware' },
        (payload: any) => {
          if (payload.new && payload.new.emergencyTrigger !== undefined) {
              callback(payload.new.emergencyTrigger);
          }
        }
      )
      .subscribe();
      
    return () => {
        if (this.hardwareChannel) this.client?.removeChannel(this.hardwareChannel);
    };
  }

  public subscribeToControllerStatus(callback: (status: ControllerStatus) => void): () => void {
    if (!this.client) return () => {};
    this.client.from('hardware').select('status').limit(1).single().then(({data, error}) => {
       if (!error && data) {
           callback(data.status as ControllerStatus);
       } else {
           callback({ online: false, lastSeen: 0, ip: '0.0.0.0', mode: 'STA' });
       }
    });
    // This is covered by the hardware channel above, but for clean separation, we can leave as is.
    return () => {};
  }


  // --- Writers ---

  public async updateSlotStatus(slotId: number, updates: Partial<KeySlot>): Promise<void> {
    if (!this.client) return;
    await this.client.from('slots').update(updates).eq('id', slotId);
  }

  public async addLog(entry: LogEntry): Promise<void> {
    if (!this.client) return;
    await this.client.from('log').insert(entry);
  }

  public async syncFullState(slots: KeySlot[], users: UserAccount[], config: SystemConfig): Promise<void> {
    if (!this.client) return;
    // For sync we assume we want to upsert or replace
    await this.client.from('slots').upsert(slots);
    await this.client.from('users').upsert(users);
    
    const configToUpsert = { id: 1, ...config }; // Assuming single row ID 1
    await this.client.from('config').upsert(configToUpsert);
  }

  public async setEmergencyTrigger(isActive: boolean): Promise<void> {
    if (!this.client) return;
    await this.client.from('hardware').upsert({ id: 1, emergencyTrigger: isActive });
  }
}

export const supabaseService = new SupabaseService();
