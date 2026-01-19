import React, { useState, useEffect } from 'react';

interface SidebarProps {
  activeTab: 'dashboard' | 'new-audit';
  onTabChange: (tab: 'dashboard' | 'new-audit') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    const checkApiStatus = async () => {
      const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
      
      if (!apiKey) {
        setApiStatus('offline');
        return;
      }

      try {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        setApiStatus(response.ok ? 'online' : 'offline');
      } catch {
        setApiStatus('offline');
      }
    };

    checkApiStatus();
    const interval = setInterval(checkApiStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-72 bg-[#0a0a0b] text-zinc-400 h-screen fixed left-0 top-0 flex flex-col z-50 border-r border-white/[0.04]">
      <div className="px-6 pt-7 pb-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-zinc-800 rounded-lg flex items-center justify-center border border-zinc-700/50">
            <svg className="w-5 h-5 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <div>
            <h1 className="text-[15px] font-semibold text-zinc-100 tracking-tight">ValidateKaro</h1>
            <p className="text-[10px] text-zinc-600 font-mono">Internal Ops Tool</p>
          </div>
        </div>
      </div>

      <div className="px-4 mb-2">
        <p className="text-[9px] font-semibold text-zinc-600 uppercase tracking-[0.15em] px-2">Menu</p>
      </div>
      
      <nav className="flex-1 px-3 space-y-1">
        <button 
          onClick={() => onTabChange('dashboard')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-300 ease-out ${
            activeTab === 'dashboard' 
              ? 'bg-zinc-800/80 text-zinc-100' 
              : 'hover:bg-zinc-800/40 text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
          </svg>
          <span>Dashboard</span>
        </button>

        <button 
          onClick={() => onTabChange('new-audit')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-300 ease-out ${
            activeTab === 'new-audit' 
              ? 'bg-zinc-800/80 text-zinc-100' 
              : 'hover:bg-zinc-800/40 text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span>New Audit</span>
          <span className="ml-auto text-[9px] font-mono text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">N</span>
        </button>
      </nav>

      <div className="p-4 mt-auto">
        <div className={`p-4 rounded-xl border ${
          apiStatus === 'online' 
            ? 'bg-emerald-950/30 border-emerald-900/50' 
            : apiStatus === 'offline'
            ? 'bg-rose-950/30 border-rose-900/50'
            : 'bg-zinc-900/50 border-zinc-800'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="relative">
              <div className={`w-2 h-2 rounded-full ${
                apiStatus === 'online' ? 'bg-emerald-400' : 
                apiStatus === 'offline' ? 'bg-rose-400' : 'bg-zinc-500'
              }`}></div>
              {apiStatus === 'online' && (
                <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-40"></div>
              )}
            </div>
            <p className={`text-[10px] font-semibold uppercase tracking-wider ${
              apiStatus === 'online' ? 'text-emerald-400' : 
              apiStatus === 'offline' ? 'text-rose-400' : 'text-zinc-500'
            }`}>
              {apiStatus === 'checking' ? 'Checking...' : apiStatus === 'online' ? 'Online' : 'Offline'}
            </p>
          </div>
          <p className="text-[14px] font-semibold text-zinc-200">GLM-4.5 Air</p>
          <p className="text-[10px] text-zinc-500 mt-1">
            {apiStatus === 'online' 
              ? 'Ready for extraction' 
              : apiStatus === 'offline'
              ? 'API key missing or invalid'
              : 'Verifying connection...'}
          </p>
        </div>
      </div>

      <div className="px-5 pb-5">
        <div className="text-[9px] text-zinc-700 font-mono">
          v2.10
        </div>
      </div>
    </div>
  );
};

export default Sidebar;