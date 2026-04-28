
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

interface ProjectConsultantProps {
  apiKey: string;
  isEnabled: boolean; // New prop to respect global AI toggle
}

type ConsultantMode = 'academic' | 'technical';

export const ProjectConsultant: React.FC<ProjectConsultantProps> = ({ apiKey, isEnabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<ConsultantMode>('technical');
  
  const ACADEMIC_CONTEXT = `
  *** ACADEMIC SYSTEM CONTEXT (FOR REPORT WRITING) ***
  
  1. **Architecture**: "Split-Brain" IoT Architecture. Hybrid Online (Supabase Realtime) and Offline (Local ESP32 AP).
  2. **Novelty**: "Digital Binding" - resolving browser MAC address privacy restrictions by manual user binding + On-Chip SPI Flash (LittleFS) Whitelisting.
  3. **Methodology**: 
     - Frontend: React 18, Tailwind, TypeScript.
     - Backend: Supabase (PostgreSQL), Edge Functions.
     - Hardware: KC868-A4 Controller, ESP32, LAN8720 Ethernet.
  4. **Math Model**: CBM (Condition Based Maintenance) uses linear degradation logic: Health % = $100 - ((\\frac{Usage}{Threshold}) \\times 100)$.
  5. **Objectives**: High Availability (99.9%), Secure Offline Access, Predictive Maintenance.
  `;

  const TECHNICAL_CONTEXT = `
  *** USER SUPPORT MANUAL (FOR TROUBLESHOOTING) ***

  1. **How to Unlock a Key**:
     - Click the large blue button on the Key Card. 
     - If the button is Grey, the key is under maintenance.
     - If the button is Red (System Lock), a global lockdown is active.

  2. **Understanding Status Colors**:
     - **Blue**: Key is borrowed (In Use).
     - **Green**: Key is docked and available.
     - **Red (Pulse)**: Key is Overdue or System is in Lockdown.
     - **Amber**: Key requires maintenance or connection is local only.

  3. **Offline Mode / Internet Loss**:
     - If the "Cloud Link" status is inactive, go to "Control Hub" -> "Connection".
     - Switch to "Emergency AP".
     - Connect your device to WiFi "KC868_EMERGENCY".
     - Click "Initialize Handshake". *Note: You must have your MAC address registered in Settings.*

  4. **Account Locked**:
     - If your account status is "Locked", you have an overdue key. Return it immediately to auto-unlock your account.
     - If status is "Inactive", contact an Admin.

  5. **Maintenance Rail**:
     - The bar at the bottom of a card shows mechanical health. 
     - If it drops below 20%, the system flags it for inspection.
  `;

  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am the SmartKey AI Assistant. I can help you troubleshoot issues or explain how the system works. \n\n*Switch to "Academic Mode" above if you need help writing your thesis.*' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const askConsultant = async (prompt: string, userLabel: string) => {
    if (!apiKey || !isEnabled) return;

    setMessages(prev => [...prev, { role: 'user', content: userLabel }]);
    setIsLoading(true);

    const activeContext = mode === 'academic' ? ACADEMIC_CONTEXT : TECHNICAL_CONTEXT;
    
    const systemInstruction = mode === 'academic' 
      ? `Act as a Senior Mechanical Engineering and IoT Academic Consultant. 
         Use **LaTeX** for math ($...$) and **Markdown Tables** for data. 
         Focus on technical novelty, architecture defense, and academic writing style.`
      : `Act as a friendly and precise **Technical Support Agent** for the SmartKey Cloud system.
         Your goal is to help non-technical staff troubleshoot issues or understand the dashboard.
         Keep answers short, actionable, and user-friendly. Use bullet points for steps.`;

    try {
      const ai = new GoogleGenAI({ apiKey: apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `
        ${systemInstruction}
        
        [SYSTEM KNOWLEDGE BASE]
        ${activeContext}
        
        The user asks: ${prompt}
        `
      });

      setMessages(prev => [...prev, { role: 'assistant', content: response.text || "I apologize, I couldn't process that request." }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Connection Error: Unable to reach the AI knowledge base. Check your API Key." }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Completely hide if no API key is provided OR AI is disabled globally
  if (!apiKey || !isEnabled) return null;

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 w-16 h-16 rounded-[24px] shadow-2xl z-[120] items-center justify-center group hover:scale-110 transition-all border border-white/10 pointer-events-auto ${isOpen ? 'hidden md:flex' : 'flex'} ${mode === 'academic' ? 'bg-slate-900 text-white' : 'bg-emerald-600 text-white'}`}
        title="AI Assistant"
      >
        <i className={`fa-solid ${isOpen ? 'fa-xmark' : mode === 'academic' ? 'fa-user-graduate' : 'fa-headset'} text-2xl group-hover:rotate-6 transition-transform`}></i>
        {!isOpen && <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full border-2 border-slate-900 animate-pulse"></div>}
      </button>

      {isOpen && (
        <div className="fixed inset-0 md:inset-auto md:bottom-24 md:right-6 w-full h-full md:w-[450px] md:h-[650px] bg-white md:rounded-[40px] shadow-2xl z-[120] flex flex-col border border-slate-100 animate-fadeIn pointer-events-auto overflow-hidden font-sans">
          <div className={`p-5 text-white flex flex-col gap-4 shrink-0 transition-colors ${mode === 'academic' ? 'bg-slate-900' : 'bg-emerald-600'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <i className={`fa-solid ${mode === 'academic' ? 'fa-user-graduate' : 'fa-headset'}`}></i>
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-widest">{mode === 'academic' ? 'Project Consultant' : 'System Assistant'}</h3>
                  <p className="text-[9px] text-white/70 font-bold uppercase">{mode === 'academic' ? 'Academic & Thesis Support' : 'Live Troubleshooting & Help'}</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="md:hidden w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="flex bg-black/20 p-1 rounded-xl">
              <button onClick={() => setMode('technical')} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${mode === 'technical' ? 'bg-white text-emerald-700 shadow-sm' : 'text-white/50 hover:text-white'}`}>
                <i className="fa-solid fa-life-ring mr-2"></i> Support
              </button>
              <button onClick={() => setMode('academic')} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${mode === 'academic' ? 'bg-white text-slate-900 shadow-sm' : 'text-white/50 hover:text-white'}`}>
                <i className="fa-solid fa-graduation-cap mr-2"></i> Academic
              </button>
            </div>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-50/50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                <div className={`max-w-[95%] p-4 rounded-3xl text-xs leading-relaxed font-medium shadow-sm overflow-hidden ${m.role === 'user' ? (mode === 'academic' ? 'bg-slate-800 text-white rounded-tr-none' : 'bg-emerald-600 text-white rounded-tr-none') : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'}`}>
                  {m.role === 'user' ? <p>{m.content}</p> : <div className="markdown-content"><ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{m.content}</ReactMarkdown></div>}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-100 p-4 rounded-3xl rounded-tl-none shadow-sm flex gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${mode === 'academic' ? 'bg-slate-400' : 'bg-emerald-400'}`}></div>
                  <div className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.2s] ${mode === 'academic' ? 'bg-slate-400' : 'bg-emerald-400'}`}></div>
                  <div className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.4s] ${mode === 'academic' ? 'bg-slate-400' : 'bg-emerald-400'}`}></div>
                </div>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-slate-100 bg-white space-y-2 shrink-0 pb-8 md:pb-4">
            <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-3 px-2">
              {mode === 'academic' ? 'Thesis Tools' : 'Common Issues'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {mode === 'technical' ? (
                <>
                  <button onClick={() => askConsultant("I cannot unlock a key. The button is disabled or red. What should I do?", "Cannot Unlock Key")} className="p-3 bg-emerald-50 rounded-2xl text-[9px] font-black uppercase text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-100 text-left">
                    <i className="fa-solid fa-lock-open mb-1 block text-emerald-500"></i> Unlock Issues
                  </button>
                  <button onClick={() => askConsultant("The internet is down. Walk me through how to use the 'Emergency AP' mode step-by-step.", "Internet is Down")} className="p-3 bg-amber-50 rounded-2xl text-[9px] font-black uppercase text-amber-700 hover:bg-amber-100 transition-colors border border-amber-100 text-left">
                    <i className="fa-solid fa-wifi mb-1 block text-amber-500"></i> Offline Mode
                  </button>
                  <button onClick={() => askConsultant("My account says 'Locked'. Why did this happen and how do I fix it?", "Account Locked")} className="p-3 bg-rose-50 rounded-2xl text-[9px] font-black uppercase text-rose-700 hover:bg-rose-100 transition-colors border border-rose-100 text-left">
                    <i className="fa-solid fa-user-lock mb-1 block text-rose-500"></i> Account Locked
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => askConsultant("Draft a comprehensive Project Paper Abstract and Problem Statement.", "Draft Project Paper")} className="p-3 bg-slate-50 rounded-2xl text-[9px] font-black uppercase text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors border border-slate-100 text-left">
                    <i className="fa-solid fa-file-invoice mb-1 block text-blue-500"></i> Draft Paper
                  </button>
                  <button onClick={() => askConsultant("Explain the 'Split-Brain' architecture and Digital Binding novelty for the viva presentation.", "Viva Defence Prep")} className="p-3 bg-purple-50 rounded-2xl text-[9px] font-black uppercase text-purple-600 hover:bg-purple-100 hover:text-purple-700 transition-colors border border-purple-100 text-left">
                    <i className="fa-solid fa-microphone-lines mb-1 block text-purple-500"></i> Viva Defence
                  </button>
                  <button onClick={() => askConsultant("Provide the LaTeX formulas for the CBM reliability calculations.", "Math Models")} className="p-3 bg-slate-50 rounded-2xl text-[9px] font-black uppercase text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors border border-slate-100 text-left">
                    <i className="fa-solid fa-square-root-variable mb-1 block text-blue-500"></i> Math Formulas
                  </button>
                  <button onClick={() => askConsultant("Compare Manual Key Logs vs IoT SmartKey Logs in a Markdown table.", "Comparison Table")} className="p-3 bg-slate-50 rounded-2xl text-[9px] font-black uppercase text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors border border-slate-100 text-left">
                    <i className="fa-solid fa-table mb-1 block text-blue-500"></i> Comparison Data
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
