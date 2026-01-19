import React, { useState, useEffect } from 'react';
import { ValidationProcess, CategoryFields } from '../types';
import { SPEND_KEY_LABELS } from '../constants';
import JsonModal from './JsonModal';

interface ValidationViewProps {
  process: ValidationProcess;
  onApprove: (id: string) => void;
  onRevalidate: (process: ValidationProcess) => void;
  onBack: () => void;
}

const CATEGORY_GROUPS = [
  { title: "E-Commerce & Food", keys: ['amazon_spends', 'flipkart_spends', 'other_online_spends', 'grocery_spends_online', 'online_food_ordering'] },
  { title: "Utilities & Bills", keys: ['mobile_phone_bills', 'electricity_bills', 'water_bills', 'rent', 'school_fees'] },
  { title: "Travel & Lifestyle", keys: ['fuel', 'dining_or_going_out', 'flights_annual', 'hotels_annual', 'domestic_lounge_usage_quarterly', 'international_lounge_usage_quarterly'] },
  { title: "Insurance & General", keys: ['insurance_health_annual', 'insurance_car_or_bike_annual', 'other_offline_spends'] }
];

const CategoryCard: React.FC<{ label: string, keyName: string, data?: CategoryFields }> = ({ label, keyName, data }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isSpecified = data && data.reward_type !== 'N/A';
  
  const getBorderColor = () => {
    if (!isSpecified) return 'border-white/[0.03] bg-white/[0.01] opacity-50';
    if (data.confidence >= 90) return 'border-emerald-500/20 bg-emerald-500/5';
    if (data.confidence >= 75) return 'border-amber-500/20 bg-amber-500/5';
    return 'border-rose-500/20 bg-rose-500/5';
  };

  const hasIssues = isSpecified && (data.confidence < 75 || !data.source_in_mitc || data.source_in_mitc.toLowerCase().includes("not specified"));

  return (
    <div 
      className={`p-5 rounded-2xl border transition-all duration-300 ease-out hover:scale-[1.015] hover:shadow-lg ${getBorderColor()} group cursor-pointer relative overflow-hidden`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {hasIssues && <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />}
      
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 min-w-0 pr-4">
          <h4 className="text-[13px] font-semibold text-white truncate">{label}</h4>
          <p className="text-[9px] font-mono text-zinc-600 mt-0.5 uppercase">{keyName}</p>
        </div>
        {isSpecified && (
          <div className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
            data.confidence >= 90 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 
            data.confidence >= 75 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${data.confidence >= 90 ? 'bg-emerald-400' : data.confidence >= 75 ? 'bg-amber-400' : 'bg-rose-400'}`} />
            {data.confidence}%
          </div>
        )}
      </div>

      <div className="space-y-4">
        {isSpecified ? (
          <>
            <div>
              <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Extracted Rule</div>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-white">{data.reward_rate || '-'}</span>
                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md ${
                  data.reward_type === 'Cashback' ? 'bg-emerald-500/10 text-emerald-400' :
                  data.reward_type === 'Reward Points' ? 'bg-violet-500/10 text-violet-400' : 'bg-zinc-500/10 text-zinc-400'
                }`}>{data.reward_type}</span>
              </div>
            </div>

            <div className={`grid grid-cols-2 gap-4 transition-all duration-500 ease-out ${isExpanded ? 'opacity-100 max-h-40 mt-4' : 'opacity-0 max-h-0 overflow-hidden'}`}>
              <div className="space-y-1">
                <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Limits</div>
                <div className="text-[11px] text-zinc-400 font-medium leading-relaxed">{data.caps_limits || "No caps"}</div>
              </div>
              <div className="space-y-1">
                <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Exclusions</div>
                <div className="text-[11px] text-zinc-400 font-medium leading-relaxed">{data.exclusions_conditions || "Standard terms"}</div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.04] flex items-center justify-between">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <svg className="w-3 h-3 text-zinc-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <span className={`text-[10px] font-medium truncate ${!data.source_in_mitc ? 'text-rose-400' : 'text-zinc-500'}`}>
                  {data.source_in_mitc || "Missing Citation"}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-4 space-y-2">
            <div className="w-8 h-8 rounded-full bg-white/[0.02] flex items-center justify-center border border-white/[0.04]">
              <svg className="w-4 h-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" /></svg>
            </div>
            <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-widest">Not Applicable</p>
          </div>
        )}
      </div>
      
      {isSpecified && (
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out">
          <svg className={`w-3 h-3 text-zinc-600 transition-transform duration-500 ease-out ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
        </div>
      )}
    </div>
  );
};

const ValidationView: React.FC<ValidationViewProps> = ({ process, onApprove, onRevalidate, onBack }) => {
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [showReport, setShowReport] = useState(process.issues.length > 0);

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => { if (e.key === 'Escape') onBack(); };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [onBack]);

  const getStatusConfig = () => {
    switch(process.status) {
      case 'approved': return { color: 'bg-emerald-500', textColor: 'text-emerald-400', label: 'Approved', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' };
      case 'review_required': return { color: 'bg-amber-500', textColor: 'text-amber-400', label: 'Review Required', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' };
      case 'rejected': return { color: 'bg-rose-500', textColor: 'text-rose-400', label: 'Rejected', icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' };
      default: return { color: 'bg-zinc-500', textColor: 'text-zinc-400', label: 'Processing', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="flex flex-col h-full bg-[#09090b] overflow-hidden">
        <header className="bg-[#111113] border-b border-white/[0.04] px-8 py-5 flex flex-col md:flex-row justify-between items-center gap-6 z-40">
          <div className="flex items-center gap-5 w-full md:w-auto">
            <button onClick={onBack} className="btn-press p-2.5 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl transition-all duration-300 ease-out text-zinc-500 hover:text-white border border-white/[0.04]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white tracking-tight">{process.card_name}</h2>
              <span className={`text-[9px] font-bold uppercase px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${statusConfig.textColor} bg-current/10`}>
                <div className={`w-1.5 h-1.5 rounded-full ${statusConfig.color}`}></div>
                {statusConfig.label}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[11px] font-semibold text-zinc-500">{process.bank_name}</p>
              <span className="text-zinc-700">•</span>
              <p className="text-[10px] font-mono text-zinc-600">{process.process_id}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
          <div className={`px-5 py-2.5 rounded-xl border font-bold text-xl ${
            process.confidence_score >= 90 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 
            process.confidence_score >= 75 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
          }`}>
            {process.confidence_score}%
          </div>

            <div className="flex gap-3">
              <button onClick={() => setIsJsonModalOpen(true)} className="btn-press px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] text-zinc-400 text-[12px] font-semibold rounded-xl hover:bg-white/[0.06] hover:text-white transition-all duration-300 ease-out flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                JSON
              </button>
              <button onClick={() => onRevalidate(process)} className="btn-press px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] text-zinc-400 text-[12px] font-semibold rounded-xl hover:bg-white/[0.06] hover:text-white transition-all duration-300 ease-out flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Re-run
              </button>
              {process.status !== 'approved' && (
                <button 
                  onClick={() => onApprove(process.process_id)}
                  disabled={process.status === 'rejected' || process.confidence_score < 75}
                  className="btn-press px-6 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-[12px] font-bold rounded-xl hover:shadow-violet-500/30 shadow-lg shadow-violet-500/20 disabled:opacity-30 disabled:shadow-none transition-all duration-300 ease-out"
                >
                  Approve
                </button>
              )}
            </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden no-scrollbar">
        {process.issues.length > 0 && (
          <div className={`bg-[#111113] border-b border-white/[0.04] transition-all duration-500 ease-out overflow-hidden shrink-0 ${showReport ? 'max-h-80' : 'max-h-12'}`}>
            <button onClick={() => setShowReport(!showReport)} className="w-full px-8 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors duration-300">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-white font-semibold text-[12px] uppercase tracking-widest">Issues Found</span>
                <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-lg font-bold">{process.issues.length}</span>
              </div>
              <svg className={`w-4 h-4 text-zinc-500 transition-transform duration-500 ease-out ${showReport ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </button>
            <div className="px-8 py-5 overflow-auto max-h-64 smooth-scrollbar space-y-3">
              {process.issues.map((issue, i) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 text-amber-400 font-bold text-[11px] border border-amber-500/20">!</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-[12px] font-semibold text-white">{issue.label}</p>
                      <span className="text-[9px] text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded-md">{issue.confidence}%</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 font-medium">{issue.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <main className="flex-1 overflow-auto p-8 smooth-scrollbar scroll-smooth mesh-gradient">
          <div className="max-w-7xl mx-auto space-y-10">
            {CATEGORY_GROUPS.map((group, gIdx) => (
              <section key={gIdx} className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: `${gIdx * 100}ms` }}>
                <div className="flex items-center gap-4">
                  <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.2em] whitespace-nowrap">{group.title}</h3>
                  <div className="h-[1px] w-full bg-white/[0.04]" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {group.keys.map((key) => (
                    <CategoryCard key={key} label={SPEND_KEY_LABELS[key as any]} keyName={key} data={process.data?.categories[key]} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </main>
      </div>

      <JsonModal isOpen={isJsonModalOpen} onClose={() => setIsJsonModalOpen(false)} data={process.data} cardName={process.card_name} />
    </div>
  );
};

export default ValidationView;