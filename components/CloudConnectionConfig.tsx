
import React, { useState } from 'react';
import { SupabaseConfig, SystemConfig } from '../types';

interface CloudConnectionConfigProps {
  config: SupabaseConfig;
  sysConfig: SystemConfig;
  setConfig: React.Dispatch<React.SetStateAction<SupabaseConfig>>;
  onConnect: () => Promise<void>;
  onDisconnect: () => void;
  isConnected: boolean;
  networkMode: 'cloud' | 'local';
  setNetworkMode: (mode: 'cloud' | 'local') => void;
  localIp: string;
  setLocalIp: (ip: string) => void;
  onLocalConnect: () => void;
  currentUser: any; 
}

export const CloudConnectionConfig: React.FC<CloudConnectionConfigProps> = ({
  config,
  sysConfig,
  setConfig,
  onConnect,
  onDisconnect,
  isConnected,
  networkMode,
  setNetworkMode,
  localIp,
  setLocalIp,
  onLocalConnect,
  currentUser
}) => {
  // By default, collapse the advanced settings if already connected or populated
  const [isExpanded, setIsExpanded] = useState(!isConnected && (!config.supabaseAnonKey || config.supabaseAnonKey === ''));
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Provisioning State
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPass, setWifiPass] = useState('');
  const [provisionStatus, setProvisionStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleChange = (field: keyof SupabaseConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleCloudToggle = async () => {
    if (isConnected) {
      onDisconnect();
    } else {
      setIsProcessing(true);
      await onConnect();
      setIsProcessing(false);
    }
  };

  const switchMode = (mode: 'cloud' | 'local') => {
    // If switching modes, disconnect current
    if (networkMode === 'cloud' && isConnected) onDisconnect();
    setNetworkMode(mode);
  };

  const handleProvisionController = async () => {
    if (!wifiSsid || !localIp) return;
    setProvisionStatus('sending');

    // Hardware Payload
    const payload = {
      wifi_ssid: wifiSsid,
      wifi_pass: wifiPass,
      supabase_url: config.supabaseUrl,
      supabase_key: config.supabaseAnonKey,
      system_id: sysConfig.systemID
    };

    try {
      // Send to ESP32 Endpoint (requires Arduino endpoint /provision)
      const controllerUrl = `http://${localIp}/provision`;
      const response = await fetch(controllerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        mode: 'no-cors' // Often needed for local IP mixed-content, though it limits response reading
      });
      
      // Since no-cors makes response opaque, we assume success if no network error thrown
      setProvisionStatus('success');
      setTimeout(() => setProvisionStatus('idle'), 5000);
    } catch (e) {
      console.error("Provisioning Failed:", e);
      setProvisionStatus('error');
    }
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-[40px] border border-slate-100 shadow-sm transition-all">
      <div className="mb-6">
        <h3 className="font-black text-slate-900 text-sm uppercase flex items-center gap-3">
          <i className={`fa-solid ${networkMode === 'cloud' ? 'fa-cloud' : 'fa-tower-broadcast'} ${networkMode === 'cloud' ? 'text-blue-500' : 'text-amber-500'}`}></i> 
          Network Uplink Mode
        </h3>
        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1 ml-7">
          Current Protocol: {networkMode === 'cloud' ? 'HTTPS / WebSocket' : 'Direct HTTP / Layer 2'}
        </p>
      </div>

      {/* Mode Selector */}
      <div className="bg-slate-50 p-1.5 rounded-2xl flex gap-1 mb-6 border border-slate-100">
        <button
          onClick={() => switchMode('cloud')}
          className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${
            networkMode === 'cloud' 
            ? 'bg-white text-blue-600 shadow-sm' 
            : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <i className="fa-solid fa-globe"></i> Cloud Link
        </button>
        <button
          onClick={() => switchMode('local')}
          className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${
            networkMode === 'local' 
            ? 'bg-white text-amber-500 shadow-sm' 
            : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <i className="fa-solid fa-wifi"></i> Emergency AP
        </button>
      </div>

      {/* Cloud Config Panel */}
      {networkMode === 'cloud' && (
        <div className="animate-fadeIn space-y-4">
           {/* Connection Status Card */}
           <div className={`flex items-center justify-between p-4 rounded-2xl border ${isConnected ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
             <div className="flex items-center gap-3">
               <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
               <div>
                  <span className={`text-[10px] font-black uppercase block ${isConnected ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {isConnected ? 'System Online' : 'Cloud Disconnected'}
                  </span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                    Target: Supabase Realtime
                  </span>
               </div>
             </div>
             <button 
                onClick={handleCloudToggle}
                disabled={isProcessing}
                className={`w-12 h-6 rounded-full p-1 transition-colors relative ${isConnected ? 'bg-emerald-500' : 'bg-slate-300'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform transform ${isConnected ? 'translate-x-6' : 'translate-x-0'}`}></div>
              </button>
           </div>
           
           <div className="flex justify-end px-1">
             <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="py-2 text-[8px] font-black uppercase text-slate-400 hover:text-blue-500 flex items-center gap-2 transition-colors"
             >
               <i className={`fa-solid ${isExpanded ? 'fa-chevron-up' : 'fa-gear'}`}></i>
               {isExpanded ? 'Hide Advanced Config' : 'Show Advanced Connection Settings'}
             </button>
           </div>

           {/* Expanded Config (Hidden by default if connected) */}
           {isExpanded && (
             <div className="grid grid-cols-1 gap-3 pt-2 animate-fadeIn bg-slate-50 p-4 rounded-2xl border border-slate-100">
               <p className="text-[8px] font-bold text-slate-400 uppercase mb-2 border-b border-slate-200 pb-2">
                 Manual Override (Use only if hosting config fails)
               </p>
               <div>
                  <label className="text-[8px] font-black uppercase text-slate-400 ml-1 mb-1 block">Anon Key</label>
                  <input 
                    type="password"
                    value={config.supabaseAnonKey}
                    onChange={(e) => handleChange('supabaseAnonKey', e.target.value)}
                    placeholder="Enter Anon Key"
                    className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-[10px] font-mono font-bold text-slate-700 outline-none focus:border-blue-400 transition-colors"
                  />
               </div>
               <div>
                  <label className="text-[8px] font-black uppercase text-slate-400 ml-1 mb-1 block">Supabase URL</label>
                  <input 
                    type="text"
                    value={config.supabaseUrl}
                    onChange={(e) => handleChange('supabaseUrl', e.target.value)}
                    placeholder="https://project-id.supabase.co"
                    className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-[10px] font-mono font-bold text-slate-700 outline-none focus:border-blue-400 transition-colors"
                  />
               </div>
             </div>
           )}
        </div>
      )}

      {/* Local AP Config Panel */}
      {networkMode === 'local' && (
        <div className="animate-fadeIn space-y-4">
           <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-[10px] text-amber-800 leading-relaxed relative overflow-hidden">
              <span className="font-black uppercase mb-1 block">Failover Protocol</span>
              Connect to "KC868_EMERGENCY" WiFi Hotspot. The system will verify your MAC Address against the local SD Card Whitelist.
              <i className="fa-solid fa-triangle-exclamation absolute -right-3 -bottom-3 text-4xl text-amber-500/10 rotate-12"></i>
           </div>

           <div className="space-y-2">
             <label className="text-[9px] font-black uppercase text-slate-400 block ml-1">Controller Gateway IP</label>
             <input 
                type="text"
                value={localIp}
                onChange={(e) => setLocalIp(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-[11px] font-mono font-bold text-slate-700 outline-none focus:border-amber-400 transition-all"
             />
           </div>

           <div className="grid grid-cols-2 gap-3">
             <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-400 block ml-1">Binding Check</label>
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 h-[42px]">
                  <i className={`fa-solid ${currentUser.macAddress ? 'fa-check text-emerald-500' : 'fa-xmark text-rose-500'}`}></i>
                  <span className="text-[10px] font-mono text-slate-600 truncate">
                    {currentUser.macAddress ? 'MAC FOUND' : 'NO BINDING'}
                  </span>
                </div>
             </div>
             <div className="space-y-2 pt-6">
                <button 
                  onClick={onLocalConnect}
                  className="w-full h-[42px] bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                >
                  Handshake
                </button>
             </div>
           </div>

           {/* HARDWARE PROVISIONING SECTION */}
           <div className="mt-6 pt-6 border-t border-slate-100">
              <h4 className="text-[10px] font-black uppercase text-amber-600 mb-3 flex items-center gap-2">
                <i className="fa-solid fa-microchip"></i> Hardware Provisioning
              </h4>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4 relative overflow-hidden">
                {provisionStatus === 'success' && (
                  <div className="absolute inset-0 bg-emerald-500 z-10 flex flex-col items-center justify-center text-white animate-fadeIn">
                    <i className="fa-solid fa-circle-check text-3xl mb-2"></i>
                    <p className="text-[10px] font-black uppercase">Config Sent to ESP32</p>
                    <p className="text-[8px] opacity-80 mt-1">Controller is restarting...</p>
                  </div>
                )}
                
                <p className="text-[9px] text-slate-500 leading-tight">
                   Sync current <strong>Supabase credentials</strong> and <strong>WiFi settings</strong> to the controller. This overwrites the board's internal config.
                </p>
                
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-[8px] font-black uppercase text-slate-400 ml-1 mb-1 block">Target WiFi SSID</label>
                    <input 
                      type="text" 
                      value={wifiSsid}
                      onChange={(e) => setWifiSsid(e.target.value)}
                      placeholder="e.g. Workshop_2.4G"
                      className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-[10px] font-bold text-slate-700 outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-black uppercase text-slate-400 ml-1 mb-1 block">Target WiFi Password</label>
                    <input 
                      type="password" 
                      value={wifiPass}
                      onChange={(e) => setWifiPass(e.target.value)}
                      placeholder="WiFi Password"
                      className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-[10px] font-bold text-slate-700 outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 bg-blue-50/50 rounded-lg border border-blue-100/50">
                  <i className="fa-solid fa-database text-blue-400 text-[10px]"></i>
                  <span className="text-[8px] font-bold text-blue-600 truncate flex-1">
                    Syncing: {config.supabaseUrl ? config.supabaseUrl.replace('https://', '') : 'No Database URL'}
                  </span>
                </div>

                <button 
                  onClick={handleProvisionController}
                  disabled={provisionStatus === 'sending' || !wifiSsid}
                  className={`w-full py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${
                    provisionStatus === 'sending' 
                    ? 'bg-slate-200 text-slate-400' 
                    : 'bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-200 active:scale-95'
                  }`}
                >
                  {provisionStatus === 'sending' ? (
                    <><i className="fa-solid fa-spinner animate-spin"></i> Uploading...</>
                  ) : (
                    <><i className="fa-solid fa-upload"></i> Upload Config to ESP32</>
                  )}
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
