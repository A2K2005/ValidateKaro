import React, { useState } from 'react';

interface JsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  cardName: string;
}

const JsonModal: React.FC<JsonModalProps> = ({ isOpen, onClose, data, cardName }) => {
  const [copied, setCopied] = useState(false);
  
  if (!isOpen) return null;

  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `validation_${cardName.toLowerCase().replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="bg-[#111113] border border-white/[0.06] rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden relative animate-in zoom-in-95 fade-in duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-purple-500/5 pointer-events-none"></div>
        
        <div className="relative px-6 py-5 border-b border-white/[0.04] flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-white">Raw JSON Output</h2>
            <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">{cardName} • Schema v2.10</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleCopy}
              className="btn-press px-4 py-2 bg-white/[0.03] border border-white/[0.06] text-zinc-400 text-[12px] font-semibold rounded-xl hover:bg-white/[0.06] hover:text-white transition-all flex items-center gap-2"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  Copy
                </>
              )}
            </button>
            <button 
              onClick={handleDownload}
              className="btn-press px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-[12px] font-semibold rounded-xl shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Download
            </button>
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white hover:bg-white/[0.05] rounded-xl transition-all border border-transparent hover:border-white/[0.06]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-6 no-scrollbar">
          <pre className="font-mono text-[12px] text-violet-300 leading-relaxed whitespace-pre-wrap">
            {jsonString}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default JsonModal;