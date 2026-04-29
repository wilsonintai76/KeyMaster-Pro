import React, { useState } from 'react';

interface LoginProps {
  onLogin: () => void;
  onOfflineLogin: () => void; 
  isAuthenticating: boolean;
  systemID: string;
  networkMode?: 'cloud' | 'local';
  isCloudConnected?: boolean;
  onSwitchMode?: (mode: 'cloud' | 'local') => void;
  hasLocalUsers?: boolean;
  isConnecting?: boolean; // New prop to track if App is currently trying to connect to Supabase
}

export const Login: React.FC<LoginProps> = ({ 
  onLogin, 
  onOfflineLogin, 
  isAuthenticating, 
  systemID,
  networkMode = 'cloud',
  isCloudConnected = false,
  onSwitchMode,
  hasLocalUsers = false,
  isConnecting = false
}) => {
  const [mode, setMode] = useState<'cloud' | 'offline_menu' | 'offline_pin'>('cloud');
  const [staffId, setStaffId] = useState('');
  const [pin, setPin] = useState('');
  const [localIp, setLocalIp] = useState('192.168.4.1');
  const [offlineStatus, setOfflineStatus] = useState('');

  // Auto-switch UI based on network mode prop if it changes
  React.useEffect(() => {
     if (networkMode === 'local' && mode === 'cloud') {
         setMode('offline_menu');
     }
  }, [networkMode]);

  const handleManualOfflineAuth = async () => {
    if (!staffId || !pin) return;
    setOfflineStatus('Connecting to Controller...');
    
    try {
      // Send Plain JSON to ESP32
      const controllerUrl = `http://${localIp}/auth`;
      const response = await fetch(controllerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId, pin }),
        mode: 'cors' 
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'authorized') {
           setOfflineStatus(`Success! Welcome ${data.user}`);
           setTimeout(() => onOfflineLogin(), 1000);
        } else {
           setOfflineStatus('Access Denied: Invalid Credentials');
        }
      } else {
        setOfflineStatus('Error: Controller rejected request');
      }
    } catch (e) {
      console.error(e);
      setOfflineStatus('Connection Failed. Ensure connected to KC868_EMERGENCY WiFi.');
    }
  };

  const isGoogleAuthDisabled = networkMode === 'local';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6">
      <div className="bg-white rounded-[40px] shadow-2xl p-10 max-w-md w-full text-center animate-fadeIn border-t-8 border-blue-600 relative overflow-hidden">
        
        {/* Background Decor */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-50 rounded-full opacity-50"></div>
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-slate-50 rounded-full opacity-50"></div>
        
        <div className="relative z-10">
          <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
            <i className={`fa-solid ${networkMode === 'cloud' ? 'fa-microchip' : 'fa-tower-broadcast'} text-4xl text-blue-600`}></i>
          </div>
          
          <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">SmartKey Cloud</h1>
          <p className="text-slate-500 mb-4 text-sm font-bold uppercase tracking-widest opacity-60">Integrated IoT Control Panel</p>
          
          {/* Network Mode Switcher UI */}
          <div className="flex bg-slate-100 p-1 rounded-xl mb-8">
             <button 
               onClick={() => { if(onSwitchMode) onSwitchMode('cloud'); setMode('cloud'); }}
               className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${networkMode === 'cloud' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
             >
               Cloud Mode
             </button>
             <button 
               onClick={() => { 
                 if (!hasLocalUsers) return;
                 if (onSwitchMode) onSwitchMode('local'); 
                 setMode('offline_menu'); 
               }}
               disabled={!hasLocalUsers}
               className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${networkMode === 'local' ? 'bg-white text-amber-600 shadow-sm' : !hasLocalUsers ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400'}`}
               title={!hasLocalUsers ? "First-time setup must be done via Cloud Mode" : ""}
             >
               Local Mode
             </button>
          </div>
          
          {mode === 'cloud' && (
            <div className="space-y-4 animate-fadeIn">
              {isGoogleAuthDisabled ? (
                 <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-700 text-xs font-bold mb-4">
                    <i className="fa-solid fa-wifi mr-2"></i>
                    Cloud Connection Unavailable. Use Demo Login or check config.
                 </div>
              ) : null}

              <button 
                onClick={() => onOfflineLogin()}
                className="w-full text-slate-800 bg-white border border-slate-200 py-4 px-6 rounded-2xl transition-all font-black hover:bg-slate-50 uppercase text-xs tracking-widest flex items-center justify-center gap-3 mb-3 shadow-sm"
              >
                <i className="fa-solid fa-user-shield"></i>
                Demo Admin Login (Bypass)
              </button>

              <button 
                onClick={onLogin} 
                disabled={isAuthenticating || isGoogleAuthDisabled || isConnecting}
                className={`w-full text-white py-4 px-6 rounded-2xl transition-all font-black active:scale-95 shadow-xl uppercase text-xs tracking-widest flex items-center justify-center gap-3 ${
                    isGoogleAuthDisabled || isConnecting ? 'bg-slate-300 cursor-not-allowed shadow-none' : 'bg-blue-600 shadow-blue-200 hover:bg-blue-700'
                }`}
              >
                {isConnecting ? (
                  <>
                    <i className="fa-solid fa-cloud-arrow-up animate-bounce"></i>
                    Connecting to Cloud...
                  </>
                ) : isAuthenticating ? (
                  <>
                    <i className="fa-solid fa-spinner animate-spin"></i>
                    Authenticating...
                  </>
                ) : (
                  <>
                    <i className="fa-brands fa-google"></i> 
                    Auth with Google
                  </>
                )}
              </button>
              
              <div className="pt-4 border-t border-slate-100 mt-6">
                 {!hasLocalUsers ? (
                   <div className="text-[10px] text-slate-400 bg-slate-50 p-3 rounded-xl">
                     <i className="fa-solid fa-triangle-exclamation mr-1"></i>
                     <strong>Initial Setup:</strong> Please login via Cloud to download user credentials before using Offline Mode.
                   </div>
                 ) : (
                   <button 
                     onClick={() => { if(onSwitchMode) onSwitchMode('local'); setMode('offline_menu'); }}
                     className="w-full py-3 px-6 rounded-2xl transition-all font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-100"
                   >
                     <i className="fa-solid fa-tower-broadcast"></i>
                     Enter Offline Mode
                   </button>
                 )}
              </div>
            </div>
          )}

          {mode === 'offline_menu' && (
             <div className="space-y-4 animate-fadeIn">
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-amber-800 text-xs font-medium mb-4">
                  <p className="font-black uppercase mb-1">Local Failover Protocol</p>
                  Connect to WiFi: <strong>KC868_EMERGENCY</strong> (192.168.4.1)
                </div>

                <button 
                   onClick={() => onOfflineLogin()} // Triggers the MAC check logic in App.tsx
                   className="w-full py-4 px-6 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 bg-slate-800 text-white hover:bg-slate-700 shadow-lg"
                 >
                   <i className="fa-solid fa-fingerprint"></i>
                   MAC Digital Binding
                 </button>

                 <button 
                   onClick={() => setMode('offline_pin')}
                   className="w-full py-4 px-6 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 bg-white border-2 border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600"
                 >
                   <i className="fa-solid fa-keyboard"></i>
                   Manual Staff ID / PIN
                 </button>

                 <button 
                   onClick={() => { if(onSwitchMode) onSwitchMode('cloud'); setMode('cloud'); }}
                   className="text-[10px] font-black uppercase text-slate-400 mt-4 hover:text-slate-600"
                 >
                   Back to Cloud
                 </button>
             </div>
          )}

          {mode === 'offline_pin' && (
             <div className="space-y-4 animate-fadeIn text-left">
                <div>
                   <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Staff ID (4-Digit)</label>
                   <input 
                     type="text" 
                     maxLength={4}
                     value={staffId}
                     onChange={(e) => setStaffId(e.target.value)}
                     className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-center font-mono font-bold text-lg outline-none focus:border-amber-400"
                   />
                </div>

                <div>
                   <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Secure PIN</label>
                   <input 
                     type="password" 
                     maxLength={6}
                     value={pin}
                     onChange={(e) => setPin(e.target.value)}
                     className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-center font-mono font-bold text-lg outline-none focus:border-amber-400"
                   />
                </div>

                {offlineStatus && (
                  <p className={`text-[10px] font-bold text-center uppercase ${offlineStatus.includes('Success') ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {offlineStatus}
                  </p>
                )}

                <button 
                   onClick={handleManualOfflineAuth}
                   className="w-full py-4 px-6 rounded-2xl font-black uppercase text-xs tracking-widest bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-200 mt-2"
                 >
                   Verify Credentials
                 </button>

                 <button 
                   onClick={() => setMode('offline_menu')}
                   className="w-full text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 text-center"
                 >
                   Back
                 </button>
             </div>
          )}
          
          <div className="mt-8 pt-6 border-t border-slate-50 flex flex-col items-center gap-2">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Workshop Node ID
            </p>
            <div className="bg-slate-900 text-blue-400 px-4 py-1.5 rounded-full text-[10px] font-mono font-black border border-blue-900/30">
              {systemID}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};