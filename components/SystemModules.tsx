
import React, { useState } from 'react';
import { SystemConfig } from '../types';

interface SystemModulesProps {
  config: SystemConfig;
  onUpdateConfig: (updates: Partial<SystemConfig>) => void;
}

export const SystemModules: React.FC<SystemModulesProps> = ({ config, onUpdateConfig }) => {
  const [showAiGuide, setShowAiGuide] = useState(false);
  const [isKeyConfigExpanded, setIsKeyConfigExpanded] = useState(false);

  // Check if API key exists and is not empty
  const hasApiKey = !!config.geminiApiKey && config.geminiApiKey.trim().length > 0;
  
  // Visual state depends on both enabled flag AND having a key.
  // This ensures "Live Processing" isn't shown if the key is missing, even if default config is true.
  const isAiActive = config.enableAI && hasApiKey; 

  const toggleAI = () => {
    // If no key is present, auto-expand the config section instead of toggling
    if (!hasApiKey) {
      setIsKeyConfigExpanded(true);
      return;
    }
    onUpdateConfig({ enableAI: !config.enableAI });
  };

  const handleKeyChange = (val: string) => {
    const isClearing = !val || val.trim().length === 0;
    
    // If clearing the key, we must also force disable AI to maintain consistency
    if (isClearing) {
       onUpdateConfig({ geminiApiKey: val, enableAI: false });
    } else {
       onUpdateConfig({ geminiApiKey: val });
    }
  };

  const systemDefaultKey = process.env.API_KEY;

  return (
    <div className="bg-white p-6 md:p-8 rounded-[40px] border border-slate-100 shadow-sm">
      <h3 className="font-black text-slate-900 text-sm uppercase mb-6 flex items-center gap-3">
        <i className="fa-solid fa-microchip text-purple-600"></i> System Modules
      </h3>
      
      <div className="space-y-4">
        {/* AI Engine Module */}
        <div className={`p-5 rounded-[24px] border transition-colors ${isAiActive ? 'bg-purple-50 border-purple-100' : 'bg-slate-50 border-slate-100'}`}>
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm ${
                isAiActive 
                ? 'bg-purple-600 text-white shadow-purple-200' 
                : 'bg-slate-200 text-slate-400'
              }`}>
                <i className={`fa-solid ${isAiActive ? 'fa-robot' : 'fa-power-off'} text-sm`}></i>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-slate-700 block tracking-widest">AI Gemini Engine</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${isAiActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                    {isAiActive 
                      ? 'Live Processing' 
                      : !hasApiKey 
                        ? 'Credential Missing' 
                        : 'Service Suspended'}
                  </span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={toggleAI} 
              className={`w-14 h-7 rounded-full relative transition-all duration-300 shadow-inner ${
                isAiActive 
                ? 'bg-purple-600' 
                : !hasApiKey
                  ? 'bg-slate-200'
                  : 'bg-slate-300 hover:bg-slate-400'
              }`}
              title={!hasApiKey ? 'Configure API Key to Enable' : 'Toggle AI Engine'}
            >
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-md ${
                isAiActive ? 'left-8' : 'left-1'
              }`}></div>
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-purple-200/50">
             <div className="flex justify-between items-center">
                <button 
                  onClick={() => setIsKeyConfigExpanded(!isKeyConfigExpanded)}
                  className="text-[9px] font-black uppercase text-purple-500 hover:text-purple-700 flex items-center gap-2 transition-colors focus:outline-none"
                >
                  <i className={`fa-solid fa-gear transition-transform ${isKeyConfigExpanded ? 'rotate-90' : ''}`}></i> Configure API Key
                </button>

                {hasApiKey ? (
                    <div className="flex items-center gap-1.5">
                        <i className="fa-solid fa-check-circle text-emerald-500 text-[10px]"></i>
                        <span className="text-[8px] font-black uppercase text-emerald-600">Key Ready</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5 animate-pulse">
                        <i className="fa-solid fa-triangle-exclamation text-rose-500 text-[10px]"></i>
                        <span className="text-[8px] font-black uppercase text-rose-500">Key Required</span>
                    </div>
                )}
             </div>

             {isKeyConfigExpanded && (
               <div className="mt-4 space-y-3 animate-fadeIn">
                 <div className="flex justify-between items-center">
                    <label className="text-[9px] font-black uppercase text-purple-400 tracking-widest">Gemini API Key</label>
                    <button 
                      onClick={() => setShowAiGuide(!showAiGuide)}
                      className="text-[8px] font-bold text-purple-400 hover:text-purple-600 flex items-center gap-1"
                    >
                      <i className="fa-solid fa-circle-question"></i> Help
                    </button>
                 </div>

                 {showAiGuide && (
                   <div className="bg-white p-3 rounded-xl text-[9px] text-slate-500 border border-purple-100 animate-fadeIn">
                     <ol className="list-decimal pl-4 space-y-1">
                       <li>Go to <strong>aistudio.google.com</strong></li>
                       <li>Sign in and click <strong>"Get API key"</strong>.</li>
                       <li>Click <strong>"Create API key"</strong>.</li>
                       <li>Paste the key below.</li>
                     </ol>
                   </div>
                 )}

                 <div className="relative">
                   <input 
                     type="password"
                     value={config.geminiApiKey || ''}
                     onChange={(e) => handleKeyChange(e.target.value)}
                     placeholder="Enter Gemini API Key"
                     className="w-full bg-white border border-purple-200 p-3 rounded-xl text-[10px] font-mono font-bold text-purple-900 outline-none focus:ring-2 focus:ring-purple-500/20 transition-all placeholder-purple-300 pr-24"
                   />
                   {systemDefaultKey && config.geminiApiKey !== systemDefaultKey && (
                     <button 
                       onClick={() => handleKeyChange(systemDefaultKey)}
                       className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-black uppercase text-purple-500 bg-purple-50 px-2 py-1.5 rounded-lg hover:bg-purple-100 transition-colors border border-purple-100"
                     >
                       Use Default
                     </button>
                   )}
                 </div>
                 
                 <p className="text-[8px] text-purple-400/70 font-medium italic">
                   This key is stored locally in your browser cache.
                 </p>
               </div>
             )}
          </div>
        </div>

        {/* Placeholder for future modules */}
        <div className="p-4 rounded-[24px] border border-dashed border-slate-200 opacity-40">
           <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center">
               <i className="fa-solid fa-plus text-slate-300"></i>
             </div>
             <span className="text-[9px] font-black uppercase text-slate-300 tracking-widest">Add Custom Extension</span>
           </div>
        </div>
      </div>
    </div>
  );
};
