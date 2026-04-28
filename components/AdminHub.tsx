
import React from 'react';
import { KeySlot, UserAccount, SystemConfig, SupabaseConfig, ControllerStatus } from '../types';
import { IdentityList } from './IdentityList';
import { CbmPanel } from './CbmPanel';
import { GlobalPolicyConfig } from './GlobalPolicyConfig';
import { HardwareRegistration } from './HardwareRegistration';
import { RackTopology } from './RackTopology';
import { SystemModules } from './SystemModules';
import { CloudConnectionConfig } from './CloudConnectionConfig';
import { ConnectivityStatus } from './ConnectivityStatus';

interface AdminHubProps {
  slots: KeySlot[];
  registeredUsers: UserAccount[];
  config: SystemConfig;
  tempConfig: SystemConfig;
  setTempConfig: React.Dispatch<React.SetStateAction<SystemConfig>>;
  saveConfig: () => void;
  onUpdateConfig: (updates: Partial<SystemConfig>) => void;
  isSystemLocked: boolean;
  setIsSystemLocked: (val: boolean) => void;
  isAdminMode: boolean;
  onApproveUser: (id: string) => void;
  onToggleUserRole: (id: string) => void;
  onDeactivateUser: (id: string) => void;
  onActivateUser: (id: string) => void;
  onUnlockUser: (id: string) => void;
  onDeleteUser: (id: string) => void;
  onUpdateUserCredentials?: (user: UserAccount) => void; // Added prop
  onAddModule: () => void;
  onDeleteModule: (idx: number) => void;
  onUpdateSlotLabel: (id: number, label: string) => void;
  onToggleSlotLock: (id: number) => void;
  onMaintenanceRequest: (id: number) => void;
  recentlyMaintained: number | null;
  isUserBorrowing: (name: string) => boolean;
  activeAdminModuleIndex: number;
  setActiveAdminModuleIndex: (idx: number) => void;
  isAddingModule: boolean;
  setIsAddingModule: (val: boolean) => void;
  supabaseConfig: SupabaseConfig;
  setSupabaseConfig: React.Dispatch<React.SetStateAction<SupabaseConfig>>;
  isCloudConnected: boolean;
  onConnect: () => Promise<void>;
  onDisconnect: () => void;
  networkMode: 'cloud' | 'local';
  setNetworkMode: (mode: 'cloud' | 'local') => void;
  localIp: string;
  setLocalIp: (ip: string) => void;
  onLocalConnect: () => void;
  currentUser: any;
  onEmergencyRelease: () => Promise<void>;
  isEmergencySequencing: boolean;
  sequenceProgress: string;
  isHardwareTriggerActive?: boolean;
  controllerStatus?: ControllerStatus;
}

export const AdminHub: React.FC<AdminHubProps> = ({
  slots,
  registeredUsers,
  config,
  tempConfig,
  setTempConfig,
  saveConfig,
  onUpdateConfig,
  isSystemLocked,
  setIsSystemLocked,
  isAdminMode,
  onApproveUser,
  onToggleUserRole,
  onDeactivateUser,
  onActivateUser,
  onUnlockUser,
  onDeleteUser,
  onUpdateUserCredentials,
  onAddModule,
  onDeleteModule,
  onUpdateSlotLabel,
  onToggleSlotLock,
  onMaintenanceRequest,
  recentlyMaintained,
  isUserBorrowing,
  activeAdminModuleIndex,
  setActiveAdminModuleIndex,
  isAddingModule,
  setIsAddingModule,
  supabaseConfig,
  setSupabaseConfig,
  isCloudConnected,
  onConnect,
  onDisconnect,
  networkMode,
  setNetworkMode,
  localIp,
  setLocalIp,
  onLocalConnect,
  currentUser,
  onEmergencyRelease,
  isEmergencySequencing,
  sequenceProgress,
  isHardwareTriggerActive,
  controllerStatus
}) => {
  if (!isAdminMode) return null;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fadeIn">
      <ConnectivityStatus 
        isCloudConnected={isCloudConnected}
        controllerStatus={controllerStatus}
        onSwitchToLocalMode={() => setNetworkMode('local')}
        isEmergencySequencing={isEmergencySequencing}
        isHardwareTriggerActive={isHardwareTriggerActive}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          
          <IdentityList 
            users={registeredUsers}
            isUserBorrowing={isUserBorrowing}
            onApproveUser={onApproveUser}
            onToggleUserRole={onToggleUserRole}
            onDeactivateUser={onDeactivateUser}
            onActivateUser={onActivateUser}
            onUnlockUser={onUnlockUser}
            onDeleteUser={onDeleteUser}
            onUpdateUserCredentials={onUpdateUserCredentials}
          />

          <CbmPanel 
            slots={slots}
            config={config}
            onMaintenanceRequest={onMaintenanceRequest}
            recentlyMaintained={recentlyMaintained}
            controllerStatus={controllerStatus}
          />

        </div>

        <div className="lg:col-span-4 space-y-6">
          <CloudConnectionConfig 
            config={supabaseConfig}
            sysConfig={config}
            setConfig={setSupabaseConfig}
            onConnect={onConnect}
            onDisconnect={onDisconnect}
            isConnected={isCloudConnected}
            networkMode={networkMode}
            setNetworkMode={setNetworkMode}
            localIp={localIp}
            setLocalIp={setLocalIp}
            onLocalConnect={onLocalConnect}
            currentUser={currentUser}
          />

          <SystemModules 
            config={config}
            onUpdateConfig={onUpdateConfig}
          />

          <GlobalPolicyConfig 
            tempConfig={tempConfig}
            setTempConfig={setTempConfig}
            onSave={saveConfig}
          />

          <HardwareRegistration 
            isAddingModule={isAddingModule}
            setIsAddingModule={setIsAddingModule}
            onAddModule={onAddModule}
            currentRackCount={Math.ceil(slots.length / 4)}
          />

          <RackTopology 
            slots={slots}
            activeAdminModuleIndex={activeAdminModuleIndex}
            setActiveAdminModuleIndex={setActiveAdminModuleIndex}
            onUpdateSlotLabel={onUpdateSlotLabel}
            onToggleSlotLock={onToggleSlotLock}
            onDeleteModule={onDeleteModule}
            isSystemLocked={isSystemLocked}
            setIsSystemLocked={setIsSystemLocked}
            onEmergencyRelease={onEmergencyRelease}
            isEmergencySequencing={isEmergencySequencing}
            sequenceProgress={sequenceProgress}
            isHardwareTriggerActive={isHardwareTriggerActive}
          />
        </div>
      </div>
    </div>
  );
};
