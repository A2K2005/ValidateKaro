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

  const getCardStyle = () => {
    if (!isSpecified) return 'border-gray-200 bg-gray-50 hover:bg-gray-100';
    if (data.confidence >= 90) return 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white hover:shadow-emerald-100';
    if (data.confidence >= 75) return 'border-amber-200 bg-gradient-to-br from-amber-50 to-white hover:shadow-amber-100';
    return 'border-rose-200 bg-gradient-to-br from-rose-50 to-white hover:shadow-rose-100';
  };

  const hasIssues = isSpecified && (data.confidence < 75 || !data.source_in_mitc || data.source_in_mitc.toLowerCase().includes("not specified"));

  return (
    <div
      className={`p-6 rounded-2xl border-2 transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-xl ${getCardStyle()} group cursor-pointer relative overflow-hidden`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {hasIssues && <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500" />}

      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 min-w-0 pr-4">
          <h4 className="text-sm font-bold text-gray-900 truncate">{label}</h4>
          <p className="text-[10px] font-mono text-gray-500 mt-1 uppercase tracking-wide">{keyName}</p>
        </div>
        {isSpecified && (
          <div className={`text-xs font-bold px-3 py-1.5 rounded-full border-2 flex items-center gap-2 ${data.confidence >= 90 ? 'text-emerald-700 bg-emerald-100 border-emerald-300' :
              data.confidence >= 75 ? 'text-amber-700 bg-amber-100 border-amber-300' : 'text-rose-700 bg-rose-100 border-rose-300'
            }`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${data.confidence >= 90 ? 'bg-emerald-500' : data.confidence >= 75 ? 'bg-amber-500' : 'bg-rose-500'}`} />
            {data.confidence}%
          </div>
        )}
      </div>

      <div className="space-y-4">
        {isSpecified ? (
          <>
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Extracted Rule</div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-gray-900">{data.reward_rate || '-'}</span>
                <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full ${data.reward_type === 'Cashback' ? 'bg-emerald-100 text-emerald-700' :
                    data.reward_type === 'Reward Points' ? 'bg-violet-100 text-violet-700' :
                    data.reward_type === 'Complimentary' ? 'bg-sky-100 text-sky-700' :
                    data.reward_type === 'Miles' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'
                  }`}>{data.reward_type}</span>
              </div>
            </div>

            <div className={`grid grid-cols-2 gap-4 transition-all duration-500 ease-out ${isExpanded ? 'opacity-100 max-h-40 mt-4' : 'opacity-0 max-h-0 overflow-hidden'}`}>
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Limits</div>
                <div className="text-xs text-gray-700 font-medium leading-relaxed">{data.caps_limits || "No caps"}</div>
              </div>
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Exclusions</div>
                <div className="text-xs text-gray-700 font-medium leading-relaxed">{data.exclusions_conditions || "Standard terms"}</div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <span className={`text-xs font-medium truncate ${!data.source_in_mitc ? 'text-rose-600' : 'text-gray-600'}`}>
                  {data.source_in_mitc || "Missing Citation"}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-200">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" /></svg>
            </div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest">Not Applicable</p>
          </div>
        )}
      </div>

      {isSpecified && (
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out">
          <svg className={`w-4 h-4 text-gray-400 transition-transform duration-500 ease-out ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
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
    switch (process.status) {
      case 'approved': return { color: 'bg-emerald-500', textColor: 'text-emerald-700', bgColor: 'bg-emerald-100', label: 'Approved', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' };
      case 'review_required': return { color: 'bg-amber-500', textColor: 'text-amber-700', bgColor: 'bg-amber-100', label: 'Review Required', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' };
      case 'rejected': return { color: 'bg-rose-500', textColor: 'text-rose-700', bgColor: 'bg-rose-100', label: 'Rejected', icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' };
      default: return { color: 'bg-gray-500', textColor: 'text-gray-700', bgColor: 'bg-gray-100', label: 'Processing', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 via-white to-gray-50 overflow-hidden">
      <header className="bg-white border-b-2 border-gray-200 px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm z-40">
        <div className="flex items-center gap-5 w-full md:w-auto">
          <button onClick={onBack} className="p-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-300 ease-out text-gray-600 hover:text-gray-900 border-2 border-gray-200 hover:border-gray-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{process.card_name}</h2>
              <span className={`text-xs font-bold uppercase px-3 py-1.5 rounded-full flex items-center gap-2 border-2 ${statusConfig.textColor} ${statusConfig.bgColor}`}>
                <div className={`w-2 h-2 rounded-full ${statusConfig.color} animate-pulse`}></div>
                {statusConfig.label}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <p className="text-sm font-semibold text-gray-600">{process.bank_name}</p>
              <span className="text-gray-400">•</span>
              <p className="text-xs font-mono text-gray-500">{process.process_id}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
          <div className={`px-6 py-3 rounded-xl border-2 font-bold text-2xl shadow-lg ${process.confidence_score >= 90 ? 'text-emerald-700 bg-emerald-100 border-emerald-300' :
              process.confidence_score >= 75 ? 'text-amber-700 bg-amber-100 border-amber-300' : 'text-rose-700 bg-rose-100 border-rose-300'
            }`}>
            {process.confidence_score}%
          </div>

          <div className="flex gap-3">
            <button onClick={() => setIsJsonModalOpen(true)} className="px-5 py-3 bg-gray-100 border-2 border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 hover:border-gray-300 transition-all duration-300 ease-out flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
              JSON
            </button>
            <button onClick={() => onRevalidate(process)} className="px-5 py-3 bg-gray-100 border-2 border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 hover:border-gray-300 transition-all duration-300 ease-out flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Re-run
            </button>
            {process.status !== 'approved' && (
              <button
                onClick={() => onApprove(process.process_id)}
                disabled={process.status === 'rejected' || process.confidence_score < 75}
                className="px-8 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-bold rounded-xl hover:shadow-xl hover:shadow-violet-200 shadow-lg disabled:opacity-30 disabled:shadow-none transition-all duration-300 ease-out"
              >
                Approve
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden">
        {process.issues.length > 0 && (
          <div className={`bg-amber-50 border-b-2 border-amber-200 transition-all duration-500 ease-out overflow-hidden shrink-0 ${showReport ? 'max-h-80' : 'max-h-14'}`}>
            <button onClick={() => setShowReport(!showReport)} className="w-full px-8 py-4 flex items-center justify-between hover:bg-amber-100 transition-colors duration-300">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-amber-900 font-bold text-sm uppercase tracking-widest">Issues Found</span>
                <span className="text-xs bg-amber-200 text-amber-900 px-3 py-1 rounded-full font-bold">{process.issues.length}</span>
              </div>
              <svg className={`w-5 h-5 text-amber-600 transition-transform duration-500 ease-out ${showReport ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </button>
            <div className="px-8 py-5 overflow-auto max-h-64 space-y-3">
              {process.issues.map((issue, i) => (
                <div key={i} className="flex items-start gap-4 p-5 bg-white border-2 border-amber-200 rounded-xl shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 text-amber-700 font-bold text-sm border-2 border-amber-300">!</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-gray-900">{issue.label}</p>
                      <span className="text-xs text-rose-700 font-bold bg-rose-100 px-2 py-1 rounded-md">{issue.confidence}%</span>
                    </div>
                    <p className="text-sm text-gray-600 font-medium">{issue.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <main className="flex-1 overflow-auto p-8 bg-gradient-to-br from-gray-50 to-white">
          <div className="max-w-7xl mx-auto space-y-12">
            {CATEGORY_GROUPS.map((group, gIdx) => (
              <section key={gIdx} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: `${gIdx * 100}ms` }}>
                <div className="flex items-center gap-4">
                  <h3 className="text-sm font-bold text-gray-600 uppercase tracking-[0.2em] whitespace-nowrap">{group.title}</h3>
                  <div className="h-0.5 w-full bg-gradient-to-r from-gray-300 to-transparent" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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