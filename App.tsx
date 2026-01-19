import React, { useState, useEffect, useMemo, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ValidationView from './components/ValidationView';
import UploadModal from './components/UploadModal';
import { ValidationProcess, ProcessStatus, ActiveJob, AuditLog } from './types';
import { processPDFsForCard, calculateFinalScore, extractIssues } from './services/aiService';
import { supabaseService } from './services/supabaseService';
import { HashRouter, Routes, Route } from 'react-router-dom';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
  });
};

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string | number, sub: string, colorClass: string }> = ({ icon, label, value, sub, colorClass }) => (
  <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm ring-1 ring-zinc-950/[0.02]">
    <div className="flex items-center gap-3 mb-4">
      <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10 text-opacity-100`}>
        {icon}
      </div>
      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{label}</p>
    </div>
    <div className="flex items-baseline gap-1">
      <p className="text-2xl font-black text-zinc-900 tracking-tight">{value}</p>
    </div>
    <p className="text-[10px] text-zinc-500 font-medium mt-1 uppercase tracking-tighter opacity-70">{sub}</p>
  </div>
);

const Dashboard: React.FC<{ 
  processes: ValidationProcess[], 
  activeJobs: ActiveJob[],
  search: string,
  setSearch: (s: string) => void,
  filter: string,
  setFilter: (f: any) => void,
  sortKey: string,
  setSortKey: (s: any) => void,
  onView: (p: ValidationProcess) => void,
  onNewValidation: () => void,
  page: number,
  setPage: (p: number) => void,
  pageSize: number
}> = ({ 
  processes, activeJobs, search, setSearch, filter, setFilter, 
  sortKey, setSortKey, onView, onNewValidation, page, setPage, pageSize 
}) => {
  
  const [localSearch, setLocalSearch] = useState(search);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Debounced search logic
  useEffect(() => {
    const timer = setTimeout(() => setSearch(localSearch), 300);
    return () => clearTimeout(timer);
  }, [localSearch, setSearch]);

  const stats = useMemo(() => {
    const total = processes.length;
    const approved = processes.filter(p => p.status === 'approved').length;
    const avgConfidence = total > 0 
      ? Math.round(processes.reduce((acc, curr) => acc + curr.confidence_score, 0) / total)
      : 0;
    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;
    
    return { active: activeJobs.length, total, avgConfidence, approvalRate };
  }, [processes, activeJobs]);

  const filtered = useMemo(() => {
    let result = processes.filter(p => {
      const matchSearch = p.card_name.toLowerCase().includes(search.toLowerCase()) || 
                          p.bank_name.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === 'all' || p.status === filter;
      return matchSearch && matchFilter;
    });

    if (sortKey === 'date') {
      result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } else {
      result.sort((a, b) => b.confidence_score - a.confidence_score);
    }
    return result;
  }, [processes, search, filter, sortKey]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  // Vim-style navigation and selection
  useEffect(() => {
    const handleKeyNav = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      
      if (e.key === 'j') {
        setSelectedIndex(prev => Math.min(prev + 1, paginated.length - 1));
      } else if (e.key === 'k') {
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && selectedIndex !== -1) {
        onView(paginated[selectedIndex]);
      }
    };
    window.addEventListener('keydown', handleKeyNav);
    return () => window.removeEventListener('keydown', handleKeyNav);
  }, [paginated, selectedIndex, onView]);

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-12 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Audit Console</h1>
          <p className="text-zinc-500 font-medium mt-1">Real-time compliance pipeline monitor</p>
        </div>
        <button 
          onClick={onNewValidation}
          className="btn-press bg-zinc-900 text-white px-5 py-2.5 rounded-xl font-bold shadow-xl shadow-zinc-950/20 hover:bg-zinc-800 transition-all flex items-center gap-2 group"
        >
          <svg className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
          </svg>
          New Audit <span className="opacity-30 text-[10px] font-black ml-1 uppercase">N</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
          label="Active Jobs" 
          value={`${stats.active}/3`} 
          sub="Current pipeline load" 
          colorClass="bg-indigo-500 text-indigo-600"
        />
        <StatCard 
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          label="Approval Rate" 
          value={`${stats.approvalRate}%`} 
          sub="Historical pass rate" 
          colorClass="bg-emerald-500 text-emerald-600"
        />
        <StatCard 
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>}
          label="Confidence" 
          value={`${stats.avgConfidence}%`} 
          sub="Mean extraction score" 
          colorClass="bg-amber-500 text-amber-600"
        />
        <StatCard 
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
          label="Truth Registry" 
          value={stats.total} 
          sub="Total validated assets" 
          colorClass="bg-zinc-500 text-zinc-600"
        />
      </div>

      <div className="space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <input 
              id="search-input"
              type="text" 
              placeholder="Search by card or bank... (/)" 
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-medium focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all placeholder:text-zinc-300 shadow-sm"
            />
            <svg className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-auto">
              <select 
                value={filter} 
                onChange={e => setFilter(e.target.value as any)} 
                className="appearance-none w-full md:w-auto bg-white border border-zinc-200 rounded-xl px-4 py-2.5 pr-10 text-[11px] font-bold uppercase tracking-widest outline-none cursor-pointer hover:bg-zinc-50 transition-all shadow-sm"
              >
                <option value="all">Status: All</option>
                <option value="approved">Approved</option>
                <option value="review_required">In Review</option>
                <option value="rejected">Rejected</option>
              </select>
              <svg className="w-3.5 h-3.5 absolute right-3.5 top-3.5 pointer-events-none text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
            </div>
            <div className="relative w-full md:w-auto">
              <select 
                value={sortKey} 
                onChange={e => setSortKey(e.target.value as any)} 
                className="appearance-none w-full md:w-auto bg-white border border-zinc-200 rounded-xl px-4 py-2.5 pr-10 text-[11px] font-bold uppercase tracking-widest outline-none cursor-pointer hover:bg-zinc-50 transition-all shadow-sm"
              >
                <option value="date">Sort: Newest</option>
                <option value="confidence">Sort: Confidence</option>
              </select>
              <svg className="w-3.5 h-3.5 absolute right-3.5 top-3.5 pointer-events-none text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-zinc-200 shadow-xl shadow-zinc-950/[0.03] overflow-hidden">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="bg-zinc-50/50 border-b border-zinc-100">
                <tr className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">
                  <th className="px-8 py-5">Audit Identity</th>
                  <th className="px-8 py-5">Bank Authority</th>
                  <th className="px-8 py-5 text-center">Score</th>
                  <th className="px-8 py-5 text-center">Status</th>
                  <th className="px-8 py-5 text-right">Last Verified</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {paginated.map((p, idx) => (
                  <tr 
                    key={p.process_id} 
                    onClick={() => {
                      setSelectedIndex(idx);
                      onView(p);
                    }} 
                    className={`hover:bg-zinc-50/80 transition-all cursor-pointer group ${selectedIndex === idx ? 'bg-indigo-50/50 border-l-4 border-l-indigo-500' : ''}`}
                  >
                    <td className="px-8 py-6">
                      <div className="text-sm font-bold text-zinc-900 group-hover:text-indigo-600 transition-colors tracking-tight">{p.card_name}</div>
                      <div className="text-[10px] font-mono text-zinc-400 uppercase mt-0.5 tracking-tighter opacity-70">Job_{p.process_id}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">{p.bank_name}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex justify-center">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs border ${
                          p.confidence_score >= 90 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 
                          p.confidence_score >= 75 ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-rose-50 border-rose-100 text-rose-700'
                        }`}>
                          {p.confidence_score}%
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex justify-center">
                        <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full border flex items-center gap-1.5 tracking-widest ${
                          p.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                          p.status === 'review_required' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            p.status === 'approved' ? 'bg-emerald-500' : 
                            p.status === 'review_required' ? 'bg-amber-500' : 'bg-rose-500'
                          }`}></div>
                          {p.status.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="text-xs font-bold text-zinc-800">{new Date(p.timestamp).toLocaleDateString()}</div>
                      <div className="text-[10px] text-zinc-400 font-medium opacity-70">{new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {paginated.length === 0 && (
            <div className="py-32 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-zinc-100 shadow-inner">
                <svg className="w-8 h-8 text-zinc-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <h3 className="text-lg font-bold text-zinc-900 tracking-tight">No audit assets found</h3>
              <p className="text-zinc-500 text-xs font-medium mt-1 max-w-xs mx-auto leading-relaxed">The compliance ledger is currently empty. Initialize your first automated extraction to populate the registry.</p>
              <button onClick={onNewValidation} className="mt-8 px-6 py-2.5 bg-white border border-zinc-200 text-zinc-900 text-xs font-bold rounded-xl hover:bg-zinc-50 transition-all shadow-sm">Initialize First Job</button>
            </div>
          )}
        </div>
        
        {totalPages > 1 && (
          <div className="flex justify-between items-center px-2">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(page - 1)} className="px-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold disabled:opacity-30 hover:bg-zinc-50 transition-all shadow-sm">Prev</button>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold disabled:opacity-30 hover:bg-zinc-50 transition-all shadow-sm">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const [processes, setProcesses] = useState<ValidationProcess[]>([]);
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [selectedProcess, setSelectedProcess] = useState<ValidationProcess | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'new-audit'>('dashboard');
  
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | ProcessStatus>('all');
  const [sortKey, setSortKey] = useState<'date' | 'confidence'>('date');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  useEffect(() => {
    const loadProcesses = async () => {
      try {
        const data = await supabaseService.getProcesses();
        setProcesses(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Error loading processes:', e);
        setProcesses([]);
      }
    };
    loadProcesses();
  }, []);

  useEffect(() => {
    if (activeTab === 'new-audit') {
      setIsUploadModalOpen(true);
      setActiveTab('dashboard');
    }
  }, [activeTab]);

  const startAuditJob = async (bank: string, name: string, files: File[]) => {
    const jobId = Math.random().toString(36).substr(2, 6).toUpperCase();
    const newJob: ActiveJob = { id: jobId, cardName: name, bankName: bank, progress: 10, status: 'uploading' };
    setActiveJobs(prev => [...prev, newJob]);
    setIsUploadModalOpen(false);

    const logs: AuditLog[] = [{ timestamp: new Date().toISOString(), action: 'INIT', details: 'Audit pipeline initiated.', status: 'info' }];

    try {
      await supabaseService.uploadBatch(files, jobId);
      logs.push({ timestamp: new Date().toISOString(), action: 'UPLOAD', details: `${files.length} PDFs stored.`, status: 'success' });
      setActiveJobs(prev => prev.map(j => j.id === jobId ? { ...j, progress: 30, status: 'extracting' } : j));

      const pdfBase64s = await Promise.all(files.map(file => fileToBase64(file)));
      setActiveJobs(prev => prev.map(j => j.id === jobId ? { ...j, progress: 50, status: 'validating' } : j));

      const aiData = await processPDFsForCard(name, pdfBase64s);
      const score = calculateFinalScore(aiData);
      const issues = extractIssues(aiData);

      const finalStatus: ProcessStatus = score >= 90 ? 'approved' : score < 75 ? 'rejected' : 'review_required';
      const gate = score >= 90 ? 'Production Ready' : score < 75 ? 'Must Re-run' : 'Blocked';

      const process: ValidationProcess = {
        process_id: jobId,
        card_id: `card_${name.toLowerCase().replace(/\s+/g, '_')}`,
        card_name: name,
        bank_name: bank,
        status: finalStatus,
        storage_path: `storage/mitc/${jobId}`,
        confidence_score: score,
        approval_gate: gate as any,
        data: aiData,
        issues,
        logs,
        timestamp: new Date().toISOString()
      };

      await supabaseService.saveProcess(process);
        const refreshed = await supabaseService.getProcesses();
        setProcesses(Array.isArray(refreshed) ? refreshed : []);
        setActiveJobs(prev => prev.filter(j => j.id !== jobId));
        setSelectedProcess(process);
    } catch (err: any) {
      setActiveJobs(prev => prev.filter(j => j.id !== jobId));
      alert(`Critical System Failure: ${err.message}`);
    }
  };

  const handleApprove = async (id: string) => {
      await supabaseService.updateStatus(id, 'approved', 'Production Ready');
      const refreshed = await supabaseService.getProcesses();
      setProcesses(Array.isArray(refreshed) ? refreshed : []);
    };

  const handleRevalidate = (process: ValidationProcess) => {
    setSelectedProcess(null);
    setIsUploadModalOpen(true);
  };

  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if (e.key === '/') { 
        if (document.activeElement?.tagName !== 'INPUT') {
          e.preventDefault();
          document.getElementById('search-input')?.focus();
        }
      }
      if (e.key.toLowerCase() === 'n' && document.activeElement?.tagName !== 'INPUT') {
        setIsUploadModalOpen(true);
      }
      if (e.key === 'Escape') {
        setSelectedProcess(null);
        setIsUploadModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, []);

  if (selectedProcess) {
    return (
      <div className="flex h-screen bg-zinc-50 overflow-hidden">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="ml-64 flex-1 h-full overflow-hidden no-scrollbar">
          <ValidationView 
            process={selectedProcess} 
            onBack={() => setSelectedProcess(null)} 
            onApprove={handleApprove} 
            onRevalidate={handleRevalidate}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="ml-64 flex-1 h-full overflow-y-auto no-scrollbar">
        <Dashboard 
          processes={processes} 
          activeJobs={activeJobs}
          search={search}
          setSearch={setSearch}
          filter={filter}
          setFilter={setFilter}
          sortKey={sortKey}
          setSortKey={setSortKey}
          onView={setSelectedProcess}
          onNewValidation={() => setIsUploadModalOpen(true)}
          page={page}
          setPage={setPage}
          pageSize={PAGE_SIZE}
        />
        <UploadModal 
          isOpen={isUploadModalOpen} 
          onClose={() => setIsUploadModalOpen(false)} 
          onStart={startAuditJob} 
          activeCount={activeJobs.length} 
        />
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<AppContent />} />
      </Routes>
    </HashRouter>
  );
};

export default App;