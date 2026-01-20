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
    <div className="w-72 bg-white text-gray-700 h-screen fixed left-0 top-0 flex flex-col z-50 border-r-2 border-gray-200 shadow-xl">
      <div className="px-6 pt-7 pb-8 border-b-2 border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-200">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 tracking-tight">ValidateKaro</h1>
            <p className="text-[10px] text-gray-500 font-medium">Internal Ops Tool</p>
          </div>
        </div>
      </div>

      <div className="px-4 mb-2 mt-6">
        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.15em] px-2">Menu</p>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        <button
          onClick={() => onTabChange('dashboard')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ease-out ${activeTab === 'dashboard'
              ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-200'
              : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
          </svg>
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => onTabChange('new-audit')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ease-out ${activeTab === 'new-audit'
              ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-200'
              : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span>New Audit</span>
          <span className="ml-auto text-[9px] font-bold text-violet-600 bg-violet-100 px-2 py-1 rounded-md">N</span>
        </button>
      </nav>

      <div className="p-4 mt-auto">
        <div className={`p-4 rounded-xl border-2 ${apiStatus === 'online'
            ? 'bg-emerald-50 border-emerald-200'
            : apiStatus === 'offline'
              ? 'bg-rose-50 border-rose-200'
              : 'bg-gray-100 border-gray-200'
          }`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="relative">
              <div className={`w-2.5 h-2.5 rounded-full ${apiStatus === 'online' ? 'bg-emerald-500' :
                  apiStatus === 'offline' ? 'bg-rose-500' : 'bg-gray-400'
                }`}></div>
              {apiStatus === 'online' && (
                <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping opacity-40"></div>
              )}
            </div>
            <p className={`text-[10px] font-bold uppercase tracking-wider ${apiStatus === 'online' ? 'text-emerald-700' :
                apiStatus === 'offline' ? 'text-rose-700' : 'text-gray-600'
              }`}>
              {apiStatus === 'checking' ? 'Checking...' : apiStatus === 'online' ? 'Online' : 'Offline'}
            </p>
          </div>
          <p className="text-sm font-bold text-gray-900">GLM-4.5 Air</p>
          <p className="text-xs text-gray-600 mt-1">
            {apiStatus === 'online'
              ? 'Ready for extraction'
              : apiStatus === 'offline'
                ? 'API key missing or invalid'
                : 'Verifying connection...'}
          </p>
        </div>
      </div>

      <div className="px-5 pb-5 border-t-2 border-gray-100 pt-4">
        <div className="text-[9px] text-gray-400 font-mono">
          v2.10
        </div>
      </div>
    </div>
  );
};

export default Sidebar;