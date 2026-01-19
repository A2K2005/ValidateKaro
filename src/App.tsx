import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import ValidationView from './components/ValidationView';
import UploadModal from './components/UploadModal';
import { ValidationProcess, ProcessStatus, ActiveJob, AuditLog } from './types';
import { processPDFsForCard, calculateFinalScore, extractIssues } from './services/aiService';
import { supabaseService } from './services/supabaseService';
import HoverReceiver from "./visual-edits/VisualEditsMessenger";

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
  });
};

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string | number, sub: string, gradient: string }> = ({ icon, label, value, sub, gradient }) => (
  <div className="group relative bg-[#111113] p-6 rounded-2xl border border-white/[0.04] hover:border-white/[0.08] transition-all duration-300 overflow-hidden">
    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${gradient}`}></div>
    <div className="relative">
      <div className="flex items-center justify-between mb-5">
        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.04] text-zinc-400 group-hover:text-white transition-colors">
          {icon}
        </div>
        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.15em]">{label}</p>
      </div>
      <p className="text-[32px] font-bold text-white tracking-tight leading-none">{value}</p>
      <p className="text-[11px] text-zinc-500 mt-2 font-medium">{sub}</p>
    </div>
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
    <div className="min-h-screen bg-[#09090b] mesh-gradient">
      <div className="p-8 lg:p-12 max-w-[1600px] mx-auto space-y-10 animate-in fade-in duration-700">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse"></div>
              <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Live Dashboard</p>
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight">Audit Console</h1>
            <p className="text-zinc-500 mt-2 text-[14px]">Real-time compliance monitoring & validation pipeline</p>
          </div>
          <button 
            onClick={onNewValidation}
            className="btn-press bg-gradient-to-r from-violet-600 to-purple-600 text-white px-6 py-3.5 rounded-xl font-bold shadow-xl shadow-violet-500/20 hover:shadow-violet-500/30 transition-all flex items-center gap-3 group"
          >
            <div className="p-1 bg-white/20 rounded-lg group-hover:rotate-90 transition-transform duration-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            New Audit
            <span className="text-[10px] font-mono text-violet-200/60 ml-1 bg-white/10 px-2 py-0.5 rounded-md">N</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard 
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
            label="Active" 
            value={`${stats.active}/3`} 
            sub="Current pipeline load" 
            gradient="bg-gradient-to-br from-violet-500/10 to-transparent"
          />
          <StatCard 
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            label="Pass Rate" 
            value={`${stats.approvalRate}%`} 
            sub="Historical approvals" 
            gradient="bg-gradient-to-br from-emerald-500/10 to-transparent"
          />
          <StatCard 
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
            label="Confidence" 
            value={`${stats.avgConfidence}%`} 
            sub="Mean extraction score" 
            gradient="bg-gradient-to-br from-amber-500/10 to-transparent"
          />
          <StatCard 
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>}
            label="Registry" 
            value={stats.total} 
            sub="Total validated assets" 
            gradient="bg-gradient-to-br from-rose-500/10 to-transparent"
          />
        </div>

        <div className="space-y-5">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <input 
                id="search-input"
                type="text" 
                placeholder="Search audits..." 
                value={localSearch}
                onChange={e => setLocalSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-[#111113] border border-white/[0.04] rounded-xl text-[13px] font-medium text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/30 outline-none transition-all placeholder:text-zinc-600"
              />
              <svg className="w-5 h-5 absolute left-4 top-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <span className="absolute right-4 top-3.5 text-[10px] font-mono text-zinc-600 bg-white/[0.03] px-2 py-1 rounded-md border border-white/[0.04]">/</span>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-auto">
                <select 
                  value={filter} 
                  onChange={e => setFilter(e.target.value as any)} 
                  className="appearance-none w-full md:w-40 bg-[#111113] border border-white/[0.04] rounded-xl px-4 py-3.5 pr-10 text-[12px] font-semibold text-zinc-300 uppercase tracking-wider outline-none cursor-pointer hover:border-white/[0.08] transition-all"
                >
                  <option value="all">All Status</option>
                  <option value="approved">Approved</option>
                  <option value="review_required">Review</option>
                  <option value="rejected">Rejected</option>
                </select>
                <svg className="w-4 h-4 absolute right-3 top-4 pointer-events-none text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
              <div className="relative w-full md:w-auto">
                <select 
                  value={sortKey} 
                  onChange={e => setSortKey(e.target.value as any)} 
                  className="appearance-none w-full md:w-40 bg-[#111113] border border-white/[0.04] rounded-xl px-4 py-3.5 pr-10 text-[12px] font-semibold text-zinc-300 uppercase tracking-wider outline-none cursor-pointer hover:border-white/[0.08] transition-all"
                >
                  <option value="date">Newest</option>
                  <option value="confidence">Confidence</option>
                </select>
                <svg className="w-4 h-4 absolute right-3 top-4 pointer-events-none text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          <div className="bg-[#111113] rounded-2xl border border-white/[0.04] overflow-hidden">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="border-b border-white/[0.04]">
                  <tr className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
                    <th className="px-6 py-5">Card Identity</th>
                    <th className="px-6 py-5">Bank</th>
                    <th className="px-6 py-5 text-center">Score</th>
                    <th className="px-6 py-5 text-center">Status</th>
                    <th className="px-6 py-5 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                  {paginated.map((p, idx) => (
                    <tr 
                      key={p.process_id} 
                      onClick={() => {
                        setSelectedIndex(idx);
                        onView(p);
                      }} 
                      className={`hover:bg-white/[0.02] transition-all cursor-pointer group ${selectedIndex === idx ? 'bg-violet-500/5 border-l-2 border-l-violet-500' : ''}`}
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 flex items-center justify-center text-violet-400 font-bold text-[11px] border border-violet-500/20">
                            {p.card_name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-[13px] font-semibold text-white group-hover:text-violet-300 transition-colors">{p.card_name}</div>
                            <div className="text-[10px] font-mono text-zinc-600 mt-0.5">{p.process_id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-[12px] font-semibold text-zinc-400">{p.bank_name}</div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-center">
                          <div className={`px-3 py-1.5 rounded-lg font-bold text-[12px] border ${
                            p.confidence_score >= 90 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 
                            p.confidence_score >= 75 ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                          }`}>
                            {p.confidence_score}%
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-center">
                          <span className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg flex items-center gap-2 tracking-wider ${
                            p.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : 
                            p.status === 'review_required' ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              p.status === 'approved' ? 'bg-emerald-400' : 
                              p.status === 'review_required' ? 'bg-amber-400' : 'bg-rose-400'
                            }`}></div>
                            {p.status === 'review_required' ? 'Review' : p.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="text-[12px] font-medium text-zinc-400">{new Date(p.timestamp).toLocaleDateString()}</div>
                        <div className="text-[10px] text-zinc-600 font-mono mt-0.5">{new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {paginated.length === 0 && (
              <div className="py-24 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="w-20 h-20 bg-white/[0.02] rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/[0.04]">
                  <svg className="w-10 h-10 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <h3 className="text-lg font-bold text-white">No audit records</h3>
                <p className="text-zinc-500 text-[13px] mt-2 max-w-xs mx-auto">Start your first compliance extraction to populate the registry.</p>
                <button onClick={onNewValidation} className="mt-8 px-6 py-3 bg-white/[0.03] border border-white/[0.06] text-white text-[13px] font-semibold rounded-xl hover:bg-white/[0.05] hover:border-white/[0.1] transition-all">
                  Initialize First Audit
                </button>
              </div>
            )}
          </div>
          
          {totalPages > 1 && (
            <div className="flex justify-between items-center px-2">
              <p className="text-[11px] font-bold text-zinc-600">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage(page - 1)} className="px-4 py-2 bg-[#111113] border border-white/[0.04] rounded-lg text-[12px] font-semibold text-zinc-400 disabled:opacity-30 hover:bg-white/[0.03] transition-all">Prev</button>
                <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-4 py-2 bg-[#111113] border border-white/[0.04] rounded-lg text-[12px] font-semibold text-zinc-400 disabled:opacity-30 hover:bg-white/[0.03] transition-all">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ActiveJobsOverlay: React.FC<{ jobs: ActiveJob[] }> = ({ jobs }) => {
  if (jobs.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[60] w-80 space-y-3 animate-in slide-in-from-right-8 duration-500">
      {jobs.map(job => (
        <div key={job.id} className="bg-[#111113] text-white p-5 rounded-2xl shadow-2xl border border-white/[0.06] backdrop-blur-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent pointer-events-none"></div>
          <div className="relative">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="w-2 h-2 rounded-full bg-violet-500"></div>
                    <div className="absolute inset-0 w-2 h-2 rounded-full bg-violet-500 animate-ping"></div>
                  </div>
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">Processing</h4>
                </div>
                <p className="text-[14px] font-semibold mt-1.5">{job.cardName}</p>
              </div>
              <span className="text-[10px] font-mono text-zinc-600 bg-white/[0.03] px-2 py-1 rounded-md">{job.id}</span>
            </div>
            
            <div className="space-y-2.5">
              <div className="flex justify-between items-end text-[11px] font-semibold">
                <span className="text-violet-400 capitalize">{job.status}</span>
                <span className="text-zinc-500">{job.progress}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/[0.03] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-1000 ease-out rounded-full" 
                  style={{ width: `${job.progress}%` }} 
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const App: React.FC = () => {
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
    const fetchProcesses = async () => {
      const data = await supabaseService.getProcesses();
      setProcesses(data);
    };
    fetchProcesses();
  }, []);

  useEffect(() => {
    if (activeTab === 'new-audit') {
      setIsUploadModalOpen(true);
      setActiveTab('dashboard');
    }
  }, [activeTab]);

  const startAuditJob = async (bank: string, name: string, files: File[]) => {
    console.log(`[ValidateKaro] Starting audit job for ${name} from ${bank}`);
    console.log(`[ValidateKaro] Files:`, files.map(f => f.name));
    
    const jobId = Math.random().toString(36).substr(2, 6).toUpperCase();
    const newJob: ActiveJob = { id: jobId, cardName: name, bankName: bank, progress: 10, status: 'uploading' };
    setActiveJobs(prev => [...prev, newJob]);
    setIsUploadModalOpen(false);

    const logs: AuditLog[] = [{ timestamp: new Date().toISOString(), action: 'INIT', details: 'Audit pipeline initiated.', status: 'info' }];

    try {
      console.log(`[ValidateKaro] Uploading files...`);
      await supabaseService.uploadBatch(files, jobId);
      logs.push({ timestamp: new Date().toISOString(), action: 'UPLOAD', details: `${files.length} PDFs stored.`, status: 'success' });
      setActiveJobs(prev => prev.map(j => j.id === jobId ? { ...j, progress: 30, status: 'extracting' } : j));

      console.log(`[ValidateKaro] Converting to base64...`);
      const pdfBase64s = await Promise.all(files.map(file => fileToBase64(file)));
      console.log(`[ValidateKaro] Base64 conversion complete. Sizes:`, pdfBase64s.map(b => b.length));
      setActiveJobs(prev => prev.map(j => j.id === jobId ? { ...j, progress: 50, status: 'validating' } : j));

      console.log(`[ValidateKaro] Calling AI service...`);
      const aiData = await processPDFsForCard(name, pdfBase64s);
      console.log(`[ValidateKaro] AI response received`);
      const score = calculateFinalScore(aiData);
      const issues = extractIssues(aiData);
      console.log(`[ValidateKaro] Score: ${score}, Issues: ${issues.length}`);

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
      const updatedProcesses = await supabaseService.getProcesses();
      setProcesses(updatedProcesses);
      setActiveJobs(prev => prev.filter(j => j.id !== jobId));
      setSelectedProcess(process);
      console.log(`[ValidateKaro] Audit complete!`);
    } catch (err: any) {
      console.error(`[ValidateKaro] Error:`, err);
      setActiveJobs(prev => prev.filter(j => j.id !== jobId));
      alert(`Critical System Failure: ${err.message}`);
    }
  };

  const handleApprove = async (id: string) => {
    await supabaseService.updateStatus(id, 'approved', 'Production Ready');
    const updatedProcesses = await supabaseService.getProcesses();
    setProcesses(updatedProcesses);
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
      <div className="flex h-screen bg-[#09090b] overflow-hidden">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="ml-72 flex-1 h-full overflow-hidden no-scrollbar">
          <HoverReceiver />
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
    <div className="flex h-screen bg-[#09090b] overflow-hidden">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="ml-72 flex-1 h-full overflow-y-auto no-scrollbar scroll-smooth">
        <HoverReceiver />
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
        <ActiveJobsOverlay jobs={activeJobs} />
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

export default App;