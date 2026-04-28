
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AiExecutiveSummaryProps {
  aiReport: string;
  isEnabled: boolean;
  isLoading?: boolean;
  onRetry?: () => void;
}

export const AiExecutiveSummary: React.FC<AiExecutiveSummaryProps> = ({ 
  aiReport, 
  isEnabled, 
  isLoading, 
  onRetry 
}) => {
  if (!isEnabled) return null;

  return (
    <div className="bg-purple-50 p-8 rounded-[40px] border border-purple-100 shadow-sm animate-fadeIn mb-8 relative overflow-hidden group">
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-200/20 rounded-full blur-3xl group-hover:bg-purple-300/30 transition-colors duration-700"></div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-purple-900 text-lg tracking-tight flex items-center gap-3">
            <i className={`fa-solid ${isLoading ? 'fa-spinner animate-spin' : 'fa-robot'} text-purple-600`}></i> 
            Executive AI Summary
          </h3>
          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-purple-400 bg-white/50 px-3 py-1 rounded-full border border-purple-100 shadow-sm">
            Powered by Gemini 3.0
          </span>
        </div>
        
        {isLoading ? (
          <div className="py-6 space-y-3">
            <div className="h-2 w-3/4 bg-purple-200 animate-pulse rounded-full"></div>
            <div className="h-2 w-1/2 bg-purple-200 animate-pulse rounded-full"></div>
            <div className="h-2 w-2/3 bg-purple-200 animate-pulse rounded-full"></div>
          </div>
        ) : aiReport ? (
          <div className="text-purple-900 text-xs leading-relaxed font-medium">
            <ReactMarkdown 
               remarkPlugins={[remarkGfm]}
               components={{
                 strong: ({node, ...props}) => (
                   <span className="font-black text-purple-700 bg-white/60 px-1.5 py-0.5 rounded shadow-sm border border-purple-100 mx-0.5 inline-block" {...props} />
                 ),
                 ul: ({node, ...props}) => (
                   <ul className="space-y-2 mt-4 mb-4 bg-white/40 p-4 rounded-2xl border border-purple-100/50 backdrop-blur-sm" {...props} />
                 ),
                 li: ({node, ...props}) => (
                   <li className="flex gap-2.5 items-start" {...props}>
                     <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0"></span>
                     <span className="flex-1">{props.children}</span>
                   </li>
                 ),
                 p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />
               }}
             >
               {aiReport}
             </ReactMarkdown>
          </div>
        ) : (
          <div className="py-6 flex flex-col items-center text-center">
            <p className="text-[10px] font-black uppercase text-purple-400 mb-4 tracking-widest">Waiting for input telemetry...</p>
            <button 
              onClick={onRetry}
              className="px-6 py-2 bg-white text-purple-600 rounded-xl text-[9px] font-black uppercase shadow-sm border border-purple-100 hover:bg-purple-100 transition-all"
            >
              Initialize Inference
            </button>
          </div>
        )}
      </div>
      
      {aiReport && (
        <div className="mt-6 pt-4 border-t border-purple-100 flex items-center gap-2">
          <i className="fa-solid fa-wand-magic-sparkles text-purple-400 text-[10px]"></i>
          <p className="text-[9px] font-bold text-purple-400 uppercase tracking-tight">
            Inference complete. Insights based on current hardware cycle counts and compliance logs.
          </p>
        </div>
      )}
    </div>
  );
};
