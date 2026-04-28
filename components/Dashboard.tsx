
import React from 'react';
import { KeyCard } from './KeyCard';
import { TelemetryCard } from './TelemetryCard';
import { AuditTrail } from './AuditTrail';
import { ConnectivityStatus } from './ConnectivityStatus';
import { KeyStatus, KeySlot, LogEntry, SystemConfig, ControllerStatus } from '../types';

interface DashboardProps {
  slots: KeySlot[];
  activeModuleIndex: number;
  setActiveModuleIndex: (index: number) => void;
  isAdminMode: boolean;
  initiateUnlock: (id: number) => void;
  handleForceReturn: (id: number) => void;
  handleMaintenanceRequest: (id: number) => void;
  config: SystemConfig;
  logs: LogEntry[];
  isSystemLocked: boolean;
  addLog: (userName: string, action: string, keyLabel: string, type: 'success' | 'warning' | 'info') => void;
  exportLogs: () => void;
  unlockQueue?: number[]; 
  isEmergencySequencing?: boolean; 
  sequenceProgress?: string;       
  isPostEmergency?: boolean;
  onSystemReset?: () => void;
  isHardwareTriggerActive?: boolean;
  controllerStatus?: ControllerStatus;
  isCloudConnected?: boolean;
  onSwitchToLocalMode: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  slots,
  activeModuleIndex,
  setActiveModuleIndex,
  isAdminMode,
  initiateUnlock,
  handleForceReturn,
  handleMaintenanceRequest,
  config,
  logs,
  isSystemLocked,
  addLog,
  exportLogs,
  unlockQueue = [],
  isEmergencySequencing = false,
  sequenceProgress = "",
  isPostEmergency = false,
  onSystemReset,
  isHardwareTriggerActive = false,
  controllerStatus,
  isCloudConnected = false,
  onSwitchToLocalMode
}) => {
  // Utility to group slots into racks of 4
  const chunkedSlots: KeySlot[][] = [];
  for (let i = 0; i < slots.length; i += 4) {
    chunkedSlots.push(slots.slice(i, i + 4));
  }

  const getRackName = (index: number) => `Rack ${String(index + 1).padStart(2, '0')}`;

  const hasStatusInChunk = (chunk: KeySlot[], status: 'overdue' | 'borrowed') => {
    if (status === 'overdue') {
      return chunk.some(s => {
        if (s.status !== KeyStatus.BORROWED || !s.borrowedAt) return false;
        const elapsed = (new Date().getTime() - new Date(s.borrowedAt).getTime()) / 60000;
        return elapsed >= (config.maxBorrowDuration + config.gracePeriod);
      });
    }
    return chunk.some(s => s.status === KeyStatus.BORROWED);
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-[1920px] mx-auto">
      
      {/* 1. SEQUENCING BANNER */}
      {isEmergencySequencing && (
        <div className="bg-amber-500 text-white p-6 rounded-[32px] shadow-2xl shadow-amber-500/40 mb-8 flex flex-col md:flex-row items-center justify-between gap-6 animate-pulse border-4 border-amber-300 relative overflow-hidden">
           <i className="fa-solid fa-person-running absolute -right-6 -bottom-6 text-9xl text-amber-600/20 -rotate-12"></i>
           <div className="flex items-center gap-5 relative z-10">
             <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                <i className="fa-solid fa-fire text-4xl text-amber-500 animate-bounce"></i>
             </div>
             <div>
               <h3 className="font-black uppercase tracking-widest text-xl md:text-2xl leading-none">Emergency Release Active</h3>
               <p className="font-bold text-amber-100 text-xs md:text-sm mt-1">Sequential Solenoid Discharge Protocol Engaged</p>
             </div>
           </div>
           <div className="flex flex-col items-end relative z-10">
              <span className="text-[10px] font-black uppercase text-amber-100 tracking-widest mb-1">Release Progress</span>
              <div className="bg-white/20 px-8 py-2 rounded-2xl font-mono font-black text-4xl backdrop-blur-sm border border-white/30">
                 {sequenceProgress}
              </div>
           </div>
        </div>
      )}

      {/* 2. HARDWARE ACTIVE BANNER (RED - LATCHED) */}
      {!isEmergencySequencing && isHardwareTriggerActive && (
         <div className="bg-rose-600 text-white p-6 rounded-[32px] shadow-2xl shadow-rose-900/50 mb-8 flex flex-col md:flex-row items-center justify-between gap-6 border-4 border-rose-400 relative overflow-hidden animate-pulse">
            <i className="fa-solid fa-hand absolute -left-4 -bottom-4 text-9xl text-white/10 rotate-12"></i>
            
            <div className="flex items-center gap-5 relative z-10">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                 <i className="fa-solid fa-power-off text-3xl text-rose-600"></i>
              </div>
              <div>
                <h3 className="font-black uppercase tracking-widest text-xl md:text-2xl leading-none text-white">HARDWARE EMERGENCY ACTIVE</h3>
                <p className="font-bold text-rose-100 text-xs md:text-sm mt-1">Physical E-Stop Button is Engaged (Latched).</p>
                <div className="bg-black/20 inline-block px-3 py-1 rounded-lg mt-2">
                  <p className="text-[10px] text-white font-mono font-bold uppercase">Action Required: Twist Button to Release</p>
                </div>
              </div>
            </div>

            {isAdminMode ? (
              <button 
                onClick={onSystemReset}
                className="relative z-10 px-8 py-4 bg-rose-800 text-rose-200 rounded-2xl font-black uppercase tracking-widest shadow-lg border border-rose-500/50 flex items-center gap-3 hover:bg-rose-700 transition-colors"
                title="Will fail until hardware is released"
              >
                <i className="fa-solid fa-rotate-left"></i> Attempt Reset
              </button>
            ) : (
               <div className="relative z-10 px-6 py-3 bg-rose-800 rounded-2xl border border-rose-700 text-center">
                 <p className="text-[10px] font-black uppercase text-rose-200">System Locked by Hardware</p>
               </div>
            )}
         </div>
      )}

      {/* 3. POST-EMERGENCY BANNER (AMBER - SAFE TO RESET) */}
      {!isEmergencySequencing && !isHardwareTriggerActive && isPostEmergency && (
         <div className="bg-slate-900 text-white p-6 rounded-[32px] shadow-2xl shadow-slate-900/50 mb-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-700 relative overflow-hidden">
            <i className="fa-solid fa-triangle-exclamation absolute -left-4 -bottom-4 text-9xl text-white/5 rotate-12"></i>
            
            <div className="flex items-center gap-5 relative z-10">
              <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                 <i className="fa-solid fa-check text-3xl text-white"></i>
              </div>
              <div>
                <h3 className="font-black uppercase tracking-widest text-xl md:text-2xl leading-none text-emerald-400">System Reset Required</h3>
                <p className="font-bold text-slate-400 text-xs md:text-sm mt-1">Hardware E-Stop has been released. Solenoids returned to idle state.</p>
                <p className="text-[10px] text-slate-500 mt-2 font-medium">To resume normal operations, an Admin must acknowledge this event.</p>
              </div>
            </div>

            {isAdminMode ? (
              <button 
                onClick={onSystemReset}
                className="relative z-10 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-3"
              >
                <i className="fa-solid fa-check-circle"></i> Acknowledge & Reset
              </button>
            ) : (
               <div className="relative z-10 px-6 py-3 bg-slate-800 rounded-2xl border border-slate-700 text-center">
                 <p className="text-[10px] font-black uppercase text-slate-400">Admin Authorization Needed</p>
               </div>
            )}
         </div>
      )}

      {/* REUSABLE CONNECTIVITY STATUS BANNER */}
      <ConnectivityStatus 
        isCloudConnected={isCloudConnected || false}
        controllerStatus={controllerStatus}
        onSwitchToLocalMode={onSwitchToLocalMode}
        isEmergencySequencing={isEmergencySequencing}
        isHardwareTriggerActive={isHardwareTriggerActive}
        isPostEmergency={isPostEmergency}
      />

      {/* LOCKDOWN BANNER (Only if no higher priority emergency) */}
      {isSystemLocked && !isEmergencySequencing && !isPostEmergency && !isHardwareTriggerActive && (
        <div className="bg-rose-600 text-white p-4 rounded-2xl shadow-xl shadow-rose-200 mb-8 flex items-center justify-center gap-3 animate-pulse border border-rose-400">
          <i className="fa-solid fa-lock text-xl"></i>
          <span className="font-black uppercase tracking-widest text-xs md:text-sm">Emergency Protocols Active: Workshop Lockdown</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Main Resource Panel */}
        <div className="lg:col-span-8 xl:col-span-9 bg-white p-6 md:p-8 lg:p-10 rounded-[40px] border border-slate-100 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Workshop Resources</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Real-time Node Monitoring</p>
            </div>
          </div>

          {/* Rack Selection Tabs */}
          <div className="flex items-center gap-3 overflow-x-auto pb-4 mb-4 custom-scrollbar">
            {chunkedSlots.length > 0 ? chunkedSlots.map((chunk, idx) => {
              const isActive = activeModuleIndex === idx;
              const hasOverdue = hasStatusInChunk(chunk, 'overdue');
              const hasBorrowed = hasStatusInChunk(chunk, 'borrowed');
              return (
                <button
                  key={idx}
                  onClick={() => setActiveModuleIndex(idx)}
                  className={`flex-shrink-0 px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-wide transition-all border-2 flex items-center gap-2 relative ${
                    isActive 
                    ? 'bg-slate-900 text-white border-slate-900 shadow-lg' 
                    : 'bg-white text-slate-400 border-slate-100 hover:border-blue-200 hover:text-blue-500'
                  }`}
                >
                  {getRackName(idx)}
                  {hasOverdue && <span className="w-2 h-2 rounded-full bg-rose-50 animate-pulse"></span>}
                  {!hasOverdue && hasBorrowed && <span className="w-2 h-2 rounded-full bg-blue-50"></span>}
                </button>
              );
            }) : (
              <div className="text-[10px] font-bold text-slate-300 uppercase p-2">System Empty - Initialize in Control Hub</div>
            )}
          </div>

          {/* Grid of Slots */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-4 gap-6 min-h-[400px]">
            {chunkedSlots[activeModuleIndex] ? (
              chunkedSlots[activeModuleIndex].map(s => (
                <KeyCard 
                  key={s.id} 
                  slot={s} 
                  onUnlock={initiateUnlock} 
                  onForceReturn={handleForceReturn}
                  onMaintenance={handleMaintenanceRequest}
                  isAdminMode={isAdminMode} 
                  isSystemLocked={isSystemLocked || isPostEmergency || isHardwareTriggerActive} // Locked during ANY emergency phase
                  maxDuration={config.maxBorrowDuration} 
                  gracePeriod={config.gracePeriod}
                  maintenanceThreshold={config.maintenanceThreshold}
                  isQueued={unlockQueue.includes(s.id)}
                />
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center text-slate-300 p-12">
                <i className="fa-solid fa-server text-4xl mb-4"></i>
                <p className="text-sm font-black uppercase">No Racks Configured</p>
                {isAdminMode && <p className="text-[10px] mt-2 text-slate-400">Go to Control Hub to initialize hardware.</p>}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Telemetry & Audit */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-6 lg:sticky lg:top-[120px] h-fit">
          <TelemetryCard status={controllerStatus} />
          <AuditTrail 
            logs={logs} 
            isAdminMode={isAdminMode} 
            onExport={exportLogs} 
          />
        </div>
      </div>
    </div>
  );
};
