import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import ValidationView from './components/ValidationView';
import UploadModal from './components/UploadModal';
import { ValidationProcess, ProcessStatus, ActiveJob, AuditLog } from './types';
import { processPDFsForCard, calculateFinalScore, extractIssues } from './services/aiService';
import { supabaseService } from './services/supabaseService';
import HoverReceiver from "./visual-edits/VisualEditsMessenger";



const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string | number, sub: string, gradient: string }> = ({ icon, label, value, sub, gradient }) => (
  <div className="group relative bg-white p-6 rounded-2xl border-2 border-gray-200 hover:border-gray-300 hover:shadow-xl transition-all duration-300 overflow-hidden">
    <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 ${gradient}`}></div>
    <div className="relative">
      <div className="flex items-center justify-between mb-5">
        <div className="p-3 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 border-2 border-violet-200 text-violet-600 group-hover:text-violet-700 transition-colors">
          {icon}
        </div>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">{label}</p>
      </div>
      <p className="text-[32px] font-bold text-gray-900 tracking-tight leading-none">{value}</p>
      <p className="text-sm text-gray-600 mt-2 font-medium">{sub}</p>
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <div className="p-8 lg:p-12 max-w-[1600px] mx-auto space-y-10 animate-in fade-in duration-700">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse"></div>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-[0.2em]">Live Dashboard</p>
              </div>
              <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Audit Console</h1>
              <p className="text-gray-600 mt-2 text-sm">Real-time compliance monitoring & validation pipeline</p>
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
                  className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:ring-2 focus:ring-violet-300 focus:border-violet-400 outline-none transition-all placeholder:text-gray-400 shadow-sm"
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

            <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden shadow-lg">
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="border-b-2 border-gray-200 bg-gray-50">
                    <tr className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em]">
                      <th className="px-6 py-5">Card Identity</th>
                      <th className="px-6 py-5">Bank</th>
                      <th className="px-6 py-5 text-center">Score</th>
                      <th className="px-6 py-5 text-center">Status</th>
                      <th className="px-6 py-5 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginated.map((p, idx) => (
                      <tr
                        key={p.process_id}
                        onClick={() => {
                          setSelectedIndex(idx);
                          onView(p);
                        }}
                        className={`hover:bg-violet-50 transition-all cursor-pointer group ${selectedIndex === idx ? 'bg-violet-100 border-l-4 border-l-violet-500' : ''}`}
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 flex items-center justify-center text-violet-400 font-bold text-[11px] border border-violet-500/20">
                              {p.card_name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-gray-900 group-hover:text-violet-600 transition-colors">{p.card_name}</div>
                              <div className="text-[10px] font-mono text-gray-500 mt-0.5">{p.process_id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="text-sm font-semibold text-gray-700">{p.bank_name}</div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex justify-center">
                            <div className={`px-3 py-1.5 rounded-lg font-bold text-xs border-2 ${p.confidence_score >= 90 ? 'bg-emerald-100 border-emerald-300 text-emerald-700' :
                              p.confidence_score >= 75 ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-rose-100 border-rose-300 text-rose-700'
                              }`}>
                              {p.confidence_score}%
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex justify-center">
                            <span className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-full flex items-center gap-2 tracking-wider border-2 ${p.status === 'approved' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' :
                              p.status === 'review_required' ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-rose-100 text-rose-700 border-rose-300'
                              }`}>
                              <div className={`w-2 h-2 rounded-full animate-pulse ${p.status === 'approved' ? 'bg-emerald-500' :
                                p.status === 'review_required' ? 'bg-amber-500' : 'bg-rose-500'
                                }`}></div>
                              {p.status === 'review_required' ? 'Review' : p.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="text-sm font-medium text-gray-700">{new Date(p.timestamp).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500 font-mono mt-0.5">{new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {paginated.length === 0 && (
                <div className="py-24 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6 border-2 border-gray-200">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">No audit records</h3>
                  <p className="text-gray-600 text-sm mt-2 max-w-xs mx-auto">Start your first compliance extraction to populate the registry.</p>
                  <button onClick={onNewValidation} className="mt-8 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold rounded-xl hover:shadow-xl shadow-lg transition-all">
                    Initialize First Audit
                  </button>
                </div>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-between items-center px-2">
                <p className="text-xs font-bold text-gray-600">Page {page} of {totalPages}</p>
                <div className="flex gap-2">
                  <button disabled={page === 1} onClick={() => setPage(page - 1)} className="px-4 py-2 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-700 disabled:opacity-30 hover:bg-gray-50 hover:border-gray-300 transition-all">Prev</button>
                  <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-4 py-2 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-700 disabled:opacity-30 hover:bg-gray-50 hover:border-gray-300 transition-all">Next</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

// Enhanced job type with detailed status tracking
interface EnhancedJob extends ActiveJob {
  statusMessage?: string;
  error?: string;
  logs?: string[];
  completedAt?: string;
  result?: 'success' | 'failed';
}

const ActiveJobsOverlay: React.FC<{ jobs: ActiveJob[], onDismiss: (id: string) => void }> = ({ jobs, onDismiss }) => {
  if (jobs.length === 0) return null;

  const enhancedJobs = jobs as EnhancedJob[];

  const getStatusIcon = (job: EnhancedJob) => {
    if (job.result === 'success') return '✅';
    if (job.result === 'failed') return '❌';
    if (job.status === 'uploading') return '📤';
    if (job.status === 'converting') return '🔄';
    if (job.status === 'analyzing') return '🤖';
    if (job.status === 'scoring') return '📊';
    if (job.status === 'saving') return '💾';
    return '⏳';
  };

  const getStatusColor = (job: EnhancedJob) => {
    if (job.result === 'success') return 'from-emerald-500/10 to-transparent';
    if (job.result === 'failed') return 'from-rose-500/10 to-transparent';
    return 'from-violet-500/5 to-transparent';
  };

  const getProgressColor = (job: EnhancedJob) => {
    if (job.result === 'success') return 'from-emerald-500 to-emerald-400';
    if (job.result === 'failed') return 'from-rose-500 to-rose-400';
    return 'from-violet-500 to-purple-500';
  };

  return (
    <div className="fixed bottom-6 right-6 z-[60] w-96 space-y-3 animate-in slide-in-from-right-8 duration-500 max-h-[80vh] overflow-y-auto no-scrollbar">
      {enhancedJobs.map(job => (
        <div key={job.id} className="bg-white p-5 rounded-2xl shadow-xl border-2 border-gray-200 relative overflow-hidden">
          <div className={`absolute inset-0 bg-gradient-to-br ${getStatusColor(job)} pointer-events-none`}></div>
          <div className="relative">
            {/* Header with dismiss button */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getStatusIcon(job)}</span>
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500">
                    {job.result ? (job.result === 'success' ? 'Complete' : 'Failed') : 'Processing'}
                  </h4>
                </div>
                <p className="text-sm font-bold text-gray-900 mt-1.5">{job.cardName}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded-md border border-gray-200">{job.id}</span>
                {job.result && (
                  <button
                    onClick={() => onDismiss(job.id)}
                    className="text-gray-400 hover:text-gray-700 transition-colors p-1.5 hover:bg-gray-100 rounded-md"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-end text-[11px] font-semibold">
                <span className={`capitalize ${job.result === 'failed' ? 'text-rose-400' : job.result === 'success' ? 'text-emerald-400' : 'text-violet-400'}`}>
                  {job.statusMessage || job.status}
                </span>
                <span className="text-gray-600">{job.progress}%</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                <div
                  className={`h-full bg-gradient-to-r ${getProgressColor(job)} transition-all duration-1000 ease-out rounded-full`}
                  style={{ width: `${job.progress}%` }}
                />
              </div>
            </div>

            {/* Error message if failed */}
            {job.error && (
              <div className="mt-3 p-3 bg-rose-50 border-2 border-rose-200 rounded-lg">
                <p className="text-xs text-rose-700 font-bold">Error:</p>
                <p className="text-xs text-rose-600 mt-1 break-words">{job.error}</p>
              </div>
            )}

            {/* Recent logs */}
            {(job.logs && job.logs.length > 0) && (
              <div className="mt-3 space-y-1 max-h-24 overflow-y-auto">
                <p className="text-[10px] text-gray-600 font-bold uppercase tracking-wider">Recent Activity:</p>
                {job.logs.slice(-3).map((log, idx) => (
                  <p key={idx} className="text-xs text-gray-700 font-mono truncate">{log}</p>
                ))}
              </div>
            )}

            {/* Completion timestamp */}
            {job.completedAt && (
              <p className="mt-3 text-[10px] text-zinc-500">
                {job.result === 'success' ? 'Completed' : 'Failed'} at {new Date(job.completedAt).toLocaleTimeString()}
              </p>
            )}
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
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔵 STEP 1: VALIDATION STARTED');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📋 Bank:', bank);
    console.log('💳 Card:', name);
    console.log('📄 Files to process:', files.map(f => ({ name: f.name, size: `${(f.size / 1024).toFixed(1)} KB`, type: f.type })));
    console.log('⏰ Timestamp:', new Date().toISOString());

    const jobId = Math.random().toString(36).substr(2, 6).toUpperCase();
    console.log('🆔 Generated Job ID:', jobId);

    const newJob: ActiveJob = { id: jobId, cardName: name, bankName: bank, progress: 5, status: 'initializing' };
    setActiveJobs(prev => [...prev, newJob]);
    setIsUploadModalOpen(false);

    const logs: AuditLog[] = [{ timestamp: new Date().toISOString(), action: 'INIT', details: 'Audit pipeline initiated.', status: 'info' }];

    const updateJobStatus = (progress: number, status: string, details?: string) => {
      console.log(`📊 Progress: ${progress}% | Status: ${status}${details ? ` | ${details}` : ''}`);
      setActiveJobs(prev => prev.map(j => j.id === jobId ? { ...j, progress, status } : j));
    };

    try {
      // STEP 2: Create Audit Record in Database
      console.log('');
      console.log('───────────────────────────────────────────────────────────');
      console.log('🔵 STEP 2: CREATING AUDIT RECORD IN DATABASE');
      console.log('───────────────────────────────────────────────────────────');
      updateJobStatus(5, 'initializing', 'Creating audit record...');

      const audit = await supabaseService.createAuditRecord(bank, name, jobId);
      const auditId = audit?.id;

      if (!auditId) {
        console.warn('⚠️ WARNING: Could not create audit record in Supabase. Will use localStorage only.');
      } else {
        console.log('✅ Audit record created with ID:', auditId);
      }

      // STEP 3: Upload PDFs to Supabase Storage
      console.log('');
      console.log('───────────────────────────────────────────────────────────');
      console.log('🔵 STEP 3: UPLOADING PDFs TO SUPABASE STORAGE');
      console.log('───────────────────────────────────────────────────────────');
      updateJobStatus(10, 'uploading', 'Uploading PDFs to cloud storage...');

      const uploadStartTime = performance.now();
      const uploadPaths = await supabaseService.uploadBatch(files, jobId, auditId);
      const uploadDuration = ((performance.now() - uploadStartTime) / 1000).toFixed(2);

      console.log('✅ Upload complete in', uploadDuration, 'seconds');
      console.log('📁 Upload paths returned:', uploadPaths);

      if (uploadPaths.length === 0) {
        console.warn('⚠️ WARNING: No upload paths returned - files may not have been uploaded to Supabase');
      } else if (!auditId) {
        console.warn('⚠️ WARNING: Files were not uploaded to Supabase (no audit ID). Using fake paths.');
      } else {
        console.log('✅ Files successfully uploaded to Supabase Storage');
      }

      logs.push({ timestamp: new Date().toISOString(), action: 'UPLOAD', details: `${files.length} PDFs stored. Paths: ${uploadPaths.join(', ')}`, status: 'success' });
      updateJobStatus(25, 'uploaded', `${files.length} files uploaded`);

      // STEP 4: Get Public URLs from Supabase
      console.log('');
      console.log('───────────────────────────────────────────────────────────');
      console.log('🔵 STEP 4: GETTING PUBLIC URLs FROM SUPABASE');
      console.log('───────────────────────────────────────────────────────────');
      updateJobStatus(30, 'converting', 'Getting file URLs...');

      const pdfUrls: string[] = [];

      // Check if files were actually uploaded to Supabase (paths contain timestamp)
      const filesWereUploaded = uploadPaths.length > 0 && uploadPaths.some(p => p.includes('/') && /\d{13}/.test(p));
      console.log('📁 Files uploaded to Supabase:', filesWereUploaded);

      if (filesWereUploaded) {
        // Files were uploaded to Supabase - get public URLs
        for (const path of uploadPaths) {
          const publicUrl = supabaseService.getPDFUrl(path);
          pdfUrls.push(publicUrl);
          console.log(`  📎 Public URL: ${publicUrl}`);
        }
        console.log('✅ Got', pdfUrls.length, 'public URLs from Supabase');
      }

      updateJobStatus(40, 'converted', 'PDFs ready for AI processing');

      // STEP 5: Call GLM API via OpenRouter
      console.log('');
      console.log('───────────────────────────────────────────────────────────');
      console.log('🔵 STEP 5: CALLING GLM-4.5-AIR API VIA OPENROUTER');
      console.log('───────────────────────────────────────────────────────────');
      console.log('🌐 Endpoint: https://openrouter.ai/api/v1/chat/completions');
      console.log('🤖 Model: z-ai/glm-4.5-air');
      console.log('📄 Sending', pdfUrls.length, 'PDF(s) for analysis...');
      updateJobStatus(50, 'analyzing', 'AI is analyzing documents...');

      const apiStartTime = performance.now();
      let aiData;
      try {
        aiData = await processPDFsForCard(name, pdfUrls);
        const apiDuration = ((performance.now() - apiStartTime) / 1000).toFixed(2);
        console.log('✅ AI API call successful in', apiDuration, 'seconds');
        console.log('📦 AI Response categories:', Object.keys(aiData.categories || {}));
        console.log('📊 Token usage:', aiData.token_usage);
      } catch (apiError: any) {
        console.error('❌ AI API CALL FAILED:');
        console.error('  Error type:', apiError.name);
        console.error('  Error message:', apiError.message);
        console.error('  Full error:', apiError);
        throw apiError;
      }

      updateJobStatus(70, 'scoring', 'Calculating confidence score...');

      // STEP 6: Calculate Score and Extract Issues
      console.log('');
      console.log('───────────────────────────────────────────────────────────');
      console.log('🔵 STEP 6: CALCULATING SCORE & EXTRACTING ISSUES');
      console.log('───────────────────────────────────────────────────────────');

      const score = calculateFinalScore(aiData);
      const issues = extractIssues(aiData);

      console.log('📊 Final Confidence Score:', score);
      console.log('⚠️ Issues found:', issues.length);
      if (issues.length > 0) {
        console.log('📋 Issues breakdown:');
        issues.forEach((issue, idx) => {
          console.log(`  ${idx + 1}. [${issue.key}] ${issue.description} (confidence: ${issue.confidence})`);
        });
      }

      const finalStatus: ProcessStatus = score >= 90 ? 'approved' : score < 75 ? 'rejected' : 'review_required';
      const gate = score >= 90 ? 'Production Ready' : score < 75 ? 'Must Re-run' : 'Blocked';

      console.log('🚦 Final Status:', finalStatus);
      console.log('🚪 Approval Gate:', gate);

      updateJobStatus(85, 'saving', 'Saving results to database...');

      // STEP 7: Save to Database
      console.log('');
      console.log('───────────────────────────────────────────────────────────');
      console.log('🔵 STEP 7: SAVING TO SUPABASE DATABASE');
      console.log('───────────────────────────────────────────────────────────');

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

      console.log('💾 Saving process object...');
      const saveStartTime = performance.now();

      try {
        await supabaseService.saveProcess(process);
        const saveDuration = ((performance.now() - saveStartTime) / 1000).toFixed(2);
        console.log('✅ Process saved to Supabase in', saveDuration, 'seconds');
      } catch (saveError: any) {
        console.error('❌ DATABASE SAVE FAILED:');
        console.error('  Error:', saveError.message);
        throw saveError;
      }

      console.log('📥 Fetching updated processes list...');
      const updatedProcesses = await supabaseService.getProcesses();
      console.log('✅ Fetched', updatedProcesses.length, 'total processes');

      setProcesses(updatedProcesses);

      // Mark job as complete instead of removing it
      setActiveJobs(prev => prev.map(j =>
        j.id === jobId
          ? {
            ...j,
            progress: 100,
            status: 'complete',
            result: 'success' as const,
            statusMessage: `Validation complete! Score: ${score}%`,
            completedAt: new Date().toISOString(),
            logs: [
              'PDFs uploaded successfully',
              'AI analysis completed',
              `Confidence score: ${score}%`,
              'Saved to database'
            ]
          }
          : j
      ));

      setSelectedProcess(process);

      // COMPLETE!
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🎉 VALIDATION COMPLETE!');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🆔 Process ID:', jobId);
      console.log('💳 Card:', name);
      console.log('🏦 Bank:', bank);
      console.log('📊 Score:', score);
      console.log('🚦 Status:', finalStatus);
      console.log('═══════════════════════════════════════════════════════════');

    } catch (err: any) {
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.error('❌ VALIDATION FAILED!');
      console.log('═══════════════════════════════════════════════════════════');
      console.error('Error type:', err.name || 'Unknown');
      console.error('Error message:', err.message || 'No message');
      console.error('Error stack:', err.stack || 'No stack trace');
      console.error('Full error object:', err);
      console.log('═══════════════════════════════════════════════════════════');

      // Mark job as failed instead of removing it
      setActiveJobs(prev => prev.map(j =>
        j.id === jobId
          ? {
            ...j,
            progress: 100,
            status: 'failed',
            result: 'failed' as const,
            error: err.message || 'Unknown error occurred',
            statusMessage: 'Validation failed',
            completedAt: new Date().toISOString(),
            logs: [
              'Process started',
              `Error: ${err.message}`,
              'Check console for details'
            ]
          }
          : j
      ));

      // Don't show alert - error is visible in overlay
      console.error('💡 TIP: Check the validation status card on the right for error details');
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
      <div className="flex h-screen bg-gradient-to-br from-gray-50 to-white overflow-hidden">
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
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-white overflow-hidden">
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
        <ActiveJobsOverlay
          jobs={activeJobs}
          onDismiss={(id) => setActiveJobs(prev => prev.filter(j => j.id !== id))}
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

export default App;