import React, { useState, useEffect } from 'react';
import { 
  KeySlot, 
  LogEntry, 
  UserAccount, 
  SystemConfig, 
  SupabaseConfig, 
  ControllerStatus,
  KeyStatus
} from './types';
import { INITIAL_SLOTS, DEFAULT_SYSTEM_CONFIG, DEFAULT_SUPABASE_CONFIG } from './constants';
import { supabaseService } from './services/supabase';
import { generateSystemInsight } from './services/geminiService';
import { dbService } from './services/db'; // New IndexedDB Service
import { mqttService } from './services/mqttService'; // Cloud MQTT Service

import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { AdminHub } from './components/AdminHub';
import { Analytics } from './components/Analytics';
import { LoadingSpinner } from './components/LoadingSpinner';
import { SettingsView } from './components/SettingsView';
import { OnboardingWizard } from './components/OnboardingWizard';
import { UserProfile } from './components/UserProfile';
import { SystemGuide } from './components/SystemGuide';
import { ProjectConsultant } from './components/ProjectConsultant';

// Extended User Profile Interface for App State
interface UserProfileData {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'staff' | 'admin';
  phone?: string;
  macAddress?: string;
  staffId?: string;
  offlinePin?: string;
}

interface Toast {
  title: string;
  message: string;
  type: 'success' | 'warning' | 'danger' | 'info';
  action?: () => void;
}

export const App: React.FC = () => {
  // --- STATE MANAGEMENT ---
  const [isLoading, setIsLoading] = useState(true); // New loading state for DB init
  const [isConnecting, setIsConnecting] = useState(false); // Track cloud connection attempt
  const [user, setUser] = useState<UserProfileData | null>(null);
  const [registeredUsers, setRegisteredUsers] = useState<UserAccount[]>([]);
  const [config, setConfig] = useState<SystemConfig>(DEFAULT_SYSTEM_CONFIG);
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(DEFAULT_SUPABASE_CONFIG);
  
  // --- UI STATE MANAGEMENT ---
  const [uiState, setUiState] = useState({
    view: 'dashboard' as 'dashboard' | 'admin' | 'analytics',
    showSettings: false,
    settingsTab: 'account' as 'account' | 'security',
    showGuide: false,
    toast: null as Toast | null,
    isAuthenticating: false,
    isGlobalLoading: false,
    globalError: null as string | null,
  });

  const updateUI = (updates: Partial<typeof uiState>) => {
    setUiState(prev => ({ ...prev, ...updates }));
  };

  const showToast = (toast: Toast) => updateUI({ toast });
  const clearToast = () => updateUI({ toast: null });
  const setView = (view: 'dashboard' | 'admin' | 'analytics') => updateUI({ view, showSettings: false });

  // System Data
  const [slots, setSlots] = useState<KeySlot[]>(INITIAL_SLOTS);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // Connectivity
  const [networkMode, setNetworkMode] = useState<'cloud' | 'local'>('cloud');
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [localIp, setLocalIp] = useState('192.168.4.1');
  const [controllerStatus, setControllerStatus] = useState<ControllerStatus | undefined>(undefined);

  // Admin Hub State
  const [tempConfig, setTempConfig] = useState<SystemConfig>(DEFAULT_SYSTEM_CONFIG);
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [activeAdminModuleIndex, setActiveAdminModuleIndex] = useState(0);
  const [isAddingModule, setIsAddingModule] = useState(false);
  
  // Emergency / Hardware State
  const [isSystemLocked, setIsSystemLocked] = useState(false);
  const [unlockQueue, setUnlockQueue] = useState<number[]>([]);
  const [isEmergencySequencing, setIsEmergencySequencing] = useState(false);
  const [sequenceProgress, setSequenceProgress] = useState("");
  const [isHardwareTriggerActive, setIsHardwareTriggerActive] = useState(false);
  const [isPostEmergency, setIsPostEmergency] = useState(false);
  const [recentlyMaintained, setRecentlyMaintained] = useState<number | null>(null);

  // AI State
  const [aiReport, setAiReport] = useState<string>('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // --- EFFECTS ---

  // 1. Initial Data Load from IndexedDB
  useEffect(() => {
    const initData = async () => {
      try {
        await dbService.init();
        
        const storedSysConfig = await dbService.getSystemConfig();
        const storedSbConfig = await dbService.getSupabaseConfig();
        const storedUsers = await dbService.getUsers();
        const storedLogs = await dbService.getLogs();
        const storedSlots = await dbService.getSlots();

        if (storedSysConfig) {
           setConfig(storedSysConfig);
           setTempConfig(storedSysConfig);
        } else {
           setConfig(DEFAULT_SYSTEM_CONFIG);
           setTempConfig(DEFAULT_SYSTEM_CONFIG);
           await dbService.saveSystemConfig(DEFAULT_SYSTEM_CONFIG);
        }
        
        if (storedSbConfig && storedSbConfig.supabaseUrl && storedSbConfig.supabaseUrl.startsWith("http") && !storedSbConfig.supabaseUrl.includes("mock.supabase.co")) {
           setSupabaseConfig(storedSbConfig);
        } else {
           setSupabaseConfig(DEFAULT_SUPABASE_CONFIG);
           await dbService.saveSupabaseConfig(DEFAULT_SUPABASE_CONFIG);
        }
        
        if (storedUsers.length > 0) setRegisteredUsers(storedUsers);
        if (storedLogs.length > 0) setLogs(storedLogs);
        if (storedSlots.length > 0) setSlots(storedSlots);

      } catch (e) {
        console.error("Failed to load IndexedDB data", e);
      } finally {
        setIsLoading(false);
      }
    };
    initData();
  }, []);

  // 2. Persist Config Changes to DB
  useEffect(() => {
      if (config) dbService.saveSystemConfig(config);
  }, [config]);

  // 3. Persist User List Changes to DB
  useEffect(() => {
      if (registeredUsers.length > 0) {
        dbService.saveUsers(registeredUsers);
      }
  }, [registeredUsers]);
  
  // 4. Persist Slots (Offline State)
  useEffect(() => {
      if (slots.length > 0) {
        dbService.saveSlots(slots);
      }
  }, [slots]);

  // Supabase and MQTT Connection
  useEffect(() => {
      const connect = async () => {
           if (supabaseConfig && networkMode === 'cloud') {
               setIsConnecting(true);
               const connected = await supabaseService.connect(supabaseConfig);
               setIsCloudConnected(connected);
               if (connected) {
                   // Subscribe to data
                   supabaseService.subscribeToSlots((data) => {
                       if (data) setSlots(data);
                   });
                   supabaseService.subscribeToControllerStatus((status) => {
                       setControllerStatus(status);
                   });
               }
               
               if (config && config.mqttUrl && config.mqttTopicPrefix) {
                   mqttService.connect(config.mqttUrl, config.mqttTopicPrefix);
               }

               setIsConnecting(false);
           }
      };
      if (!isLoading) connect();
      return () => { 
        supabaseService.disconnect(); 
        mqttService.disconnect();
      }
  }, [supabaseConfig, config?.mqttUrl, config?.mqttTopicPrefix, networkMode, isLoading]);

  // --- HELPERS ---

  const addLog = (userName: string, action: string, keyLabel: string, type: 'success' | 'warning' | 'info') => {
      const newLog: LogEntry = {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleString(),
          user: userName,
          action,
          keyLabel,
          type
      };
      // Optimistic update
      setLogs(prev => [newLog, ...prev]);
      
      // Async Save to DB
      dbService.addLog(newLog);

      if (isCloudConnected) {
          supabaseService.addLog(newLog);
      }
  };

  const handleOfflineLogin = () => {
      setNetworkMode('local');
      // Simulate offline login for demo/fallback
      const offlineUser: UserProfileData = {
          id: 'offline_user',
          name: 'Technician (Offline)',
          email: 'offline@local',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=offline',
          role: 'admin'
      };
      setUser(offlineUser);
      addLog('Technician', 'Offline Login', 'System', 'warning');
      showToast({ title: 'Offline Mode', message: 'Logged in locally. Features may be limited.', type: 'warning' });
  };

  const handleLogin = async () => {
    updateUI({ isAuthenticating: true });
    
    // Check if we are still using the default mock configuration
    if (supabaseConfig.supabaseAnonKey === 'mock-anon-key' || !supabaseConfig.supabaseAnonKey) {
        updateUI({ isAuthenticating: false });
        handleOfflineLogin();
        return;
    }

    if (networkMode === 'cloud' && isCloudConnected) {
        try {
            const googleUser = await supabaseService.loginGoogle();
            if (googleUser) {
                const email = googleUser.email || "";
                const existingUser = registeredUsers.find(u => u.email === email);
                
                // 1. Determine Role Strategy
                // Priority: Configured Admin Email > Existing Role > Default 'staff'
                let role: 'staff' | 'admin' = 'staff';
                
                if (config?.adminEmail && email === config.adminEmail) {
                    role = 'admin'; // Enforce Admin for the configured email
                } else if (existingUser) {
                    role = existingUser.role as 'staff' | 'admin';
                }

                // 2. Build Profile Object (Merge Google Data with Local Data)
                const profileData: UserProfileData = {
                    id: existingUser ? existingUser.id : `u_${Date.now()}`,
                    name: googleUser.user_metadata?.full_name || "User",
                    email: email,
                    avatar: googleUser.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
                    role: role,
                    phone: existingUser?.phone,
                    macAddress: existingUser?.macAddress,
                    staffId: existingUser?.staffId,
                    offlinePin: existingUser?.offlinePin
                };

                // 3. Set Active Session
                setUser(profileData);

                // 4. Sync to Global Registry (IndexedDB + State)
                setRegisteredUsers(prev => {
                    const exists = prev.some(u => u.id === profileData.id);
                    if (exists) {
                        return prev.map(u => u.id === profileData.id ? { 
                          ...u, 
                          name: profileData.name, 
                          avatar: profileData.avatar,
                          role: role // Update role if it changed (e.g. became admin)
                        } : u);
                    } else {
                        const newUser: UserAccount = {
                            ...profileData,
                            status: 'active' 
                        };
                        return [...prev, newUser];
                    }
                });

                addLog(profileData.name, 'Cloud Auth Success', 'Google OAuth', 'success');
            }
        } catch (error: any) {
            showToast({ title: 'Auth Error', message: error.message, type: 'danger' });
        } finally {
            updateUI({ isAuthenticating: false });
        }
    } else {
        updateUI({ isAuthenticating: false });
        showToast({ 
          title: 'Cloud service is offline.', 
          message: 'Unable to reach authentication server. Switch to Offline Mode?', 
          type: 'warning',
          action: () => handleOfflineLogin() 
        });
    }
  };

  const handleLogout = async () => {
      await supabaseService.logout();
      setUser(null);
      setView('dashboard');
  };

  // --- ACTIONS ---

  const initiateUnlock = (id: number) => {
      const slot = slots.find(s => s.id === id);
      if (slot && user) {
          if (mqttService.isConnected && config?.mqttTopicPrefix) {
              mqttService.publishCommand(config.mqttTopicPrefix, 'unlock', { slotId: id, user: user.name });
          }
          
          const updatedSlots = slots.map(s => s.id === id ? { ...s, status: KeyStatus.BORROWED, borrowedBy: user.name, borrowedAt: new Date().toISOString(), usageCount: s.usageCount + 1 } : s);
          setSlots(updatedSlots);
          addLog(user.name, 'Key Withdrawn', slot.label, 'success');
      }
  };

  const handleForceReturn = (id: number) => {
      const slot = slots.find(s => s.id === id);
      if (slot && user) {
           if (mqttService.isConnected && config?.mqttTopicPrefix) {
               mqttService.publishCommand(config.mqttTopicPrefix, 'force_return', { slotId: id, user: user.name });
           }
           const updatedSlots = slots.map(s => s.id === id ? { ...s, status: KeyStatus.AVAILABLE, borrowedBy: undefined, borrowedAt: undefined } : s);
           setSlots(updatedSlots);
           addLog(user.name, 'Force Return', slot.label, 'warning');
      }
  };

  const handleMaintenanceRequest = (id: number) => {
      setRecentlyMaintained(id);
      if (mqttService.isConnected && config?.mqttTopicPrefix) {
          mqttService.publishCommand(config.mqttTopicPrefix, 'maintenance', { slotId: id, action: 'cycle_test' });
      }
      setTimeout(() => setRecentlyMaintained(null), 3000);
      if (user) addLog(user.name, 'Maintenance Cycle', `Slot ${id}`, 'info');
  };

  const saveConfig = () => {
      if (tempConfig) {
          setConfig(tempConfig);
          if (mqttService.isConnected && tempConfig.mqttTopicPrefix) {
              mqttService.publishCommand(tempConfig.mqttTopicPrefix, 'config_update', tempConfig);
          }
          addLog(user?.name || 'System', 'Config Updated', 'Global Policy', 'info');
          showToast({ title: 'Configuration Saved', message: 'System policies updated successfully.', type: 'success' });
      }
  };

  const generateAiReport = async () => {
      if (!config?.geminiApiKey) return;
      setIsGeneratingAi(true);
      try {
          const insight = await generateSystemInsight(config.geminiApiKey, slots, logs);
          setAiReport(insight);
      } catch (e: any) {
          showToast({ title: 'AI Error', message: e.message, type: 'danger' });
      } finally {
          setIsGeneratingAi(false);
      }
  };

  const exportLogs = () => {
      const csvContent = "data:text/csv;charset=utf-8," + logs.map(e => `${e.timestamp},${e.user},${e.action},${e.keyLabel}`).join("\n");
      const encodedUri = encodeURI(csvContent);
      window.open(encodedUri);
  };

  // --- RENDER ---

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
      return (
          <>
            <Login 
                onLogin={handleLogin}
                onOfflineLogin={handleOfflineLogin}
                isAuthenticating={uiState.isAuthenticating}
                systemID={config.systemID}
                networkMode={networkMode} // Pass network state to control buttons
                isCloudConnected={isCloudConnected}
                onSwitchMode={(mode) => setNetworkMode(mode)}
                hasLocalUsers={registeredUsers.length > 0}
                isConnecting={isConnecting} // Pass connecting state
            />
            {uiState.toast && (
                <div className={`fixed top-4 right-4 p-4 rounded-xl shadow-2xl z-[300] bg-white border-l-4 ${uiState.toast.type === 'danger' ? 'border-rose-500' : 'border-blue-500'} animate-fadeIn`}>
                    <h4 className="font-bold text-slate-900">{uiState.toast.title}</h4>
                    <p className="text-sm text-slate-600">{uiState.toast.message}</p>
                    {uiState.toast.action && <button onClick={() => { uiState.toast?.action?.(); clearToast(); }} className="mt-2 text-xs font-bold underline text-blue-600">Proceed</button>}
                    <button onClick={clearToast} className="absolute top-1 right-2 text-slate-400 hover:text-slate-600"><i className="fa-solid fa-xmark"></i></button>
                </div>
            )}
          </>
      );
  }

  const isAdmin = user.role === 'admin';

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100 flex flex-col relative overflow-hidden">
        {/* Toast Container */}
        {uiState.toast && (
            <div className={`fixed bottom-4 right-4 md:top-4 md:bottom-auto p-4 rounded-xl shadow-2xl z-[300] bg-white border-l-4 ${uiState.toast.type === 'danger' ? 'border-rose-500' : uiState.toast.type === 'warning' ? 'border-amber-500' : 'border-emerald-500'} animate-fadeIn max-w-sm`}>
                <div className="flex justify-between items-start gap-3">
                    <div>
                        <h4 className="font-black text-slate-900 text-sm uppercase">{uiState.toast.title}</h4>
                        <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">{uiState.toast.message}</p>
                    </div>
                    <button onClick={clearToast} className="text-slate-300 hover:text-slate-500"><i className="fa-solid fa-xmark"></i></button>
                </div>
                {uiState.toast.action && <button onClick={() => { uiState.toast?.action?.(); clearToast(); }} className="mt-3 w-full py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-black uppercase text-slate-600">Confirm Action</button>}
            </div>
        )}

        {/* Global Nav */}
        <header className="px-6 py-4 bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200/50">
           <div className="max-w-[1920px] mx-auto flex items-center justify-between">
               <div className="flex items-center gap-12">
                   <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                           <i className="fa-solid fa-microchip text-lg"></i>
                       </div>
                       <div>
                           <h1 className="text-lg font-black tracking-tight leading-none text-slate-900">SmartKey Cloud</h1>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{config.systemID} • {networkMode.toUpperCase()} MODE</p>
                       </div>
                   </div>
                   
                   {/* View Switcher - Hidden if Settings is Open to reduce clutter */}
                   {!uiState.showSettings ? (
                       <nav className="hidden md:flex bg-slate-100 p-1 rounded-xl">
                           <button onClick={() => setView('dashboard')} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${uiState.view === 'dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Dashboard</button>
                           {isAdmin && (
                               <>
                                 <button onClick={() => setView('admin')} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${uiState.view === 'admin' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Control Hub</button>
                                 <button onClick={() => setView('analytics')} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${uiState.view === 'analytics' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Analytics</button>
                               </>
                           )}
                       </nav>
                   ) : (
                       <div className="hidden md:flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase text-slate-300">Currently Editing:</span>
                            <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">User Preferences</span>
                       </div>
                   )}
               </div>

               <div className="flex items-center gap-4">
                   <button onClick={() => updateUI({ showGuide: true })} className="w-9 h-9 rounded-full bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-500 transition-colors flex items-center justify-center">
                       <i className="fa-solid fa-circle-question"></i>
                   </button>
                   <UserProfile 
                       user={user} 
                       isAdminMode={isAdmin} 
                       onLogout={handleLogout} 
                       onOpenSettings={(tab) => {
                           updateUI({ settingsTab: tab, showSettings: true });
                       }} 
                   />
               </div>
           </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-4 md:p-8 max-w-[1920px] mx-auto w-full">
            {uiState.showSettings ? (
                <SettingsView 
                    user={user} 
                    setUser={setUser} 
                    config={config} 
                    setConfig={setConfig} 
                    subTab={uiState.settingsTab} 
                    setSubTab={(tab) => updateUI({ settingsTab: tab })} 
                    onClose={() => updateUI({ showSettings: false })} 
                    onShowToast={showToast} 
                />
            ) : uiState.view === 'dashboard' ? (
                <Dashboard 
                    slots={slots}
                    activeModuleIndex={activeModuleIndex}
                    setActiveModuleIndex={setActiveModuleIndex}
                    isAdminMode={isAdmin}
                    initiateUnlock={initiateUnlock}
                    handleForceReturn={handleForceReturn}
                    handleMaintenanceRequest={handleMaintenanceRequest}
                    config={config}
                    logs={logs}
                    isSystemLocked={isSystemLocked}
                    addLog={addLog}
                    exportLogs={exportLogs}
                    unlockQueue={unlockQueue}
                    isEmergencySequencing={isEmergencySequencing}
                    sequenceProgress={sequenceProgress}
                    isPostEmergency={isPostEmergency}
                    onSystemReset={() => setIsPostEmergency(false)} // Mock reset
                    isHardwareTriggerActive={isHardwareTriggerActive}
                    controllerStatus={controllerStatus}
                    isCloudConnected={isCloudConnected}
                    onSwitchToLocalMode={() => setNetworkMode('local')}
                />
            ) : uiState.view === 'admin' ? (
                <AdminHub 
                    slots={slots}
                    registeredUsers={registeredUsers}
                    config={config}
                    tempConfig={tempConfig}
                    setTempConfig={setTempConfig}
                    saveConfig={saveConfig}
                    onUpdateConfig={(updates) => { setConfig(prev => ({...prev, ...updates})); }}
                    isSystemLocked={isSystemLocked}
                    setIsSystemLocked={setIsSystemLocked}
                    isAdminMode={isAdmin}
                    onApproveUser={(id) => setRegisteredUsers(prev => prev.map(u => u.id === id ? {...u, status: 'active'} : u))}
                    onToggleUserRole={(id) => setRegisteredUsers(prev => prev.map(u => u.id === id ? {...u, role: u.role === 'admin' ? 'staff' : 'admin'} : u))}
                    onDeactivateUser={(id) => setRegisteredUsers(prev => prev.map(u => u.id === id ? {...u, status: 'inactive'} : u))}
                    onActivateUser={(id) => setRegisteredUsers(prev => prev.map(u => u.id === id ? {...u, status: 'active'} : u))}
                    onUnlockUser={(id) => setRegisteredUsers(prev => prev.map(u => u.id === id ? {...u, status: 'active'} : u))}
                    onDeleteUser={(id) => setRegisteredUsers(prev => prev.filter(u => u.id !== id))}
                    onUpdateUserCredentials={(updatedUser) => setRegisteredUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u))}
                    onAddModule={() => {
                        setIsAddingModule(false);
                        const newId = slots.length + 1;
                        const newSlots = Array.from({length: 4}, (_, i) => ({
                            id: newId + i,
                            label: `Key ${newId + i}`,
                            status: KeyStatus.AVAILABLE,
                            usageCount: 0,
                            lastUpdated: new Date().toISOString()
                        } as KeySlot));
                        setSlots([...slots, ...newSlots]);
                    }}
                    onDeleteModule={(idx) => {
                         const start = idx * 4;
                         const newSlots = [...slots];
                         newSlots.splice(start, 4);
                         setSlots(newSlots);
                    }}
                    onUpdateSlotLabel={(id, label) => setSlots(prev => prev.map(s => s.id === id ? {...s, label} : s))}
                    onToggleSlotLock={(id) => setSlots(prev => prev.map(s => s.id === id ? {...s, isLocked: !s.isLocked} : s))}
                    onMaintenanceRequest={handleMaintenanceRequest}
                    recentlyMaintained={recentlyMaintained}
                    isUserBorrowing={(name) => slots.some(s => s.borrowedBy === name)}
                    activeAdminModuleIndex={activeAdminModuleIndex}
                    setActiveAdminModuleIndex={setActiveAdminModuleIndex}
                    isAddingModule={isAddingModule}
                    setIsAddingModule={setIsAddingModule}
                    supabaseConfig={supabaseConfig}
                    setSupabaseConfig={setSupabaseConfig}
                    isCloudConnected={isCloudConnected}
                    onConnect={async () => {
                        if (supabaseConfig) {
                            const connected = await supabaseService.connect(supabaseConfig);
                            setIsCloudConnected(connected);
                        }
                    }}
                    onDisconnect={() => supabaseService.disconnect()}
                    networkMode={networkMode}
                    setNetworkMode={setNetworkMode}
                    localIp={localIp}
                    setLocalIp={setLocalIp}
                    onLocalConnect={() => { showToast({title:'Handshake', message:'Mock Handshake Sent', type:'info'}) }}
                    currentUser={user}
                    onEmergencyRelease={async () => {
                         setIsEmergencySequencing(true);
                         setSequenceProgress("INIT");
                         setTimeout(() => { setIsEmergencySequencing(false); setIsSystemLocked(false); }, 3000);
                    }}
                    isEmergencySequencing={isEmergencySequencing}
                    sequenceProgress={sequenceProgress}
                    isHardwareTriggerActive={isHardwareTriggerActive}
                    controllerStatus={controllerStatus}
                />
            ) : (
                <Analytics 
                    slots={slots}
                    logs={logs}
                    config={config}
                    aiReport={aiReport}
                    isGeneratingAi={isGeneratingAi}
                    onGenerateAiReport={generateAiReport}
                    isAdminMode={isAdmin}
                    user={user}
                />
            )}
        </main>
        
        <SystemGuide isOpen={uiState.showGuide} onClose={() => updateUI({ showGuide: false })} />
        <ProjectConsultant apiKey={config.geminiApiKey} isEnabled={config.enableAI} />
        
        {/* Mobile Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 p-2 flex justify-around z-40">
            {!uiState.showSettings ? (
                <>
                <button onClick={() => setView('dashboard')} className={`flex flex-col items-center p-2 ${uiState.view === 'dashboard' ? 'text-blue-600' : 'text-slate-400'}`}>
                    <i className="fa-solid fa-table-cells text-xl mb-1"></i>
                    <span className="text-[9px] font-black uppercase">Dash</span>
                </button>
                {isAdmin && (
                    <>
                    <button onClick={() => setView('admin')} className={`flex flex-col items-center p-2 ${uiState.view === 'admin' ? 'text-blue-600' : 'text-slate-400'}`}>
                        <i className="fa-solid fa-sliders text-xl mb-1"></i>
                        <span className="text-[9px] font-black uppercase">Admin</span>
                    </button>
                    <button onClick={() => setView('analytics')} className={`flex flex-col items-center p-2 ${uiState.view === 'analytics' ? 'text-blue-600' : 'text-slate-400'}`}>
                        <i className="fa-solid fa-chart-pie text-xl mb-1"></i>
                        <span className="text-[9px] font-black uppercase">Stats</span>
                    </button>
                    </>
                )}
                </>
            ) : (
                <button onClick={() => updateUI({ showSettings: false })} className="flex flex-col items-center p-2 text-rose-500 w-full">
                    <i className="fa-solid fa-arrow-left text-xl mb-1"></i>
                    <span className="text-[9px] font-black uppercase">Back to Terminal</span>
                </button>
            )}
            
            {!uiState.showSettings && (
                <button onClick={() => updateUI({ showSettings: true })} className={`flex flex-col items-center p-2 text-slate-400`}>
                     <i className="fa-solid fa-gear text-xl mb-1"></i>
                     <span className="text-[9px] font-black uppercase">Settings</span>
                </button>
            )}
        </nav>
    </div>
  );
};
