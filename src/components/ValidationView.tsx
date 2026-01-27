import React, { useState, useEffect, useMemo } from 'react';
import { ValidationProcess, CategoryFields } from '../types';
import { SPEND_KEY_LABELS } from '../constants';
import JsonModal from './JsonModal';
import { calculateRewardsForTransaction } from '../services/rewardsEngine/calculator';
import { getCardType } from '../services/rewardsEngine/redemptionsV2';
import PartnerConversionPanel from './PartnerConversionPanel';
import { mapToCompleteProductionFormat } from '../services/productionMapper';

interface ValidationViewProps {
  process: ValidationProcess;
  onApprove: (id: string) => void;
  onRevalidate: (process: ValidationProcess) => void;
  onBack: () => void;
}

const CATEGORY_GROUPS = [
  { title: "E-Commerce & Food", keys: ['amazon_spends', 'flipkart_spends', 'other_online_spends', 'grocery_spends_online', 'online_food_ordering', 'offline_grocery'] },
  { title: "Utilities & Bills", keys: ['mobile_phone_bills', 'electricity_bills', 'water_bills', 'rent', 'school_fees', 'ott_channels'] },
  { title: "Travel & Lifestyle", keys: ['fuel', 'dining_or_going_out', 'flights_annual', 'hotels_annual', 'domestic_lounge_usage_quarterly', 'international_lounge_usage_quarterly'] },
  { title: "Insurance & General", keys: ['insurance_health_annual', 'insurance_car_or_bike_annual', 'life_insurance', 'other_offline_spends'] },
  { title: "Shopping & Health", keys: ['large_electronics_purchase_like_mobile_tv_etc', 'all_pharmacy'] }
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

              {/* Points Earned Calculator */}
              {(() => {
                const rewardType = (data.reward_type || '').toLowerCase();
                const isRewardPoints = rewardType.includes('reward') || rewardType.includes('point') || rewardType.includes('mile') || rewardType.includes('avios');

                if (!isRewardPoints) return null;

                const rateString = data.reward_rate || '';
                // Robust regex for all reward types: EDGE, Points, Avios, Miles, Ranges
                const pointsMatch = rateString.match(/(\d+(?:-\d+)?)[^\d]*?(?:EDGE|reward|points?|avios|miles)/i);
                const amountMatch = rateString.match(/(?:per|\/)\s*(?:Rs\.?|INR|₹)\s*(\d+\.?\d*)/i);

                if (pointsMatch && amountMatch) {
                  const pointsStr = pointsMatch[1].split('-')[0];
                  const points = parseFloat(pointsStr);
                  const amount = parseFloat(amountMatch[1]);

                  const travelCategories = ['flights_annual', 'hotels_annual'];
                  const sampleSpend = travelCategories.includes(keyName) ? 150000 : 30000;
                  const pointsEarned = Math.floor((sampleSpend / amount) * points);

                  return (
                    <div className="mt-3 p-3 bg-violet-50 border-2 border-violet-200 rounded-lg">
                      <div className="text-[10px] font-bold text-violet-700 uppercase tracking-widest mb-1.5">Points You'll Earn</div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs text-gray-600">For ₹{(sampleSpend / 1000).toFixed(0)}k spend →</span>
                        <span className="text-xl font-bold text-violet-700">{pointsEarned.toLocaleString()}</span>
                        <span className="text-xs text-violet-600 font-semibold">points</span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            <div className={`grid grid-cols-2 gap-4 transition-all duration-500 ease-out ${isExpanded ? 'opacity-100 max-h-[200px] mt-4' : 'opacity-0 max-h-0 overflow-hidden'}`}>
              <div className="space-y-1.5 min-w-0">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Limits</div>
                <div className="text-xs text-gray-700 font-medium leading-relaxed break-words overflow-y-auto max-h-24">{data.caps_limits || "No caps"}</div>
              </div>
              <div className="space-y-1.5 min-w-0">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Exclusions</div>
                <div className="text-xs text-gray-700 font-medium leading-relaxed break-words overflow-y-auto max-h-24">{data.exclusions_conditions || "Standard terms"}</div>
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
  const [activeTab, setActiveTab] = useState<'categories' | 'partner-transfers'>('categories');

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => { if (e.key === 'Escape') onBack(); };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [onBack]);

  // Calculate rewards for partner transfers
  const categoryRewards = useMemo(() => {
    if (!process.data?.categories) return [];

    const travelCategories = ['flights_annual', 'hotels_annual'];

    return travelCategories.map(category => {
      const categoryData = process.data?.categories[category];
      if (!categoryData) return null;

      const rewardType = (categoryData.reward_type || '').toLowerCase();
      // Case insensitive check for reward points
      const isRewardPoints = rewardType.includes('reward') || rewardType.includes('point') || rewardType.includes('mile') || rewardType.includes('avios');

      if (!isRewardPoints || rewardType === 'n/a') return null;

      // Robust regex for all reward types: EDGE, Points, Avios, Miles, Ranges
      const rateString = categoryData.reward_rate || '';
      const pointsMatch = rateString.match(/(\d+(?:-\d+)?)[^\d]*?(?:EDGE|reward|points?|avios|miles)/i);
      const amountMatch = rateString.match(/(?:per|\/)\s*(?:Rs\.?|INR|₹)\s*(\d+\.?\d*)/i);

      let rewardRate = 0;
      if (pointsMatch && amountMatch) {
        const pointsStr = pointsMatch[1].split('-')[0]; // Take lower bound for ranges
        const points = parseFloat(pointsStr);
        const amount = parseFloat(amountMatch[1]);
        rewardRate = (points / amount) * 100; // Normalized to points per 100
      }

      if (rewardRate === 0) return null;

      const sampleAmount = 150000; // Fixed 1.5L for travel categories
      const transactionResult = calculateRewardsForTransaction(
        sampleAmount,           // transactionAmount
        process.card_name,      // cardName
        rewardRate,             // rewardRate (points per 100)
        category                // category name
      );

      // Force update earned points based on our extracted rate if needed
      // But usually calculateRewardsForTransaction uses the engine's data. 
      // For display purposes we trust the calculation engine but filtering mainly happens here.

      return {
        category,
        label: SPEND_KEY_LABELS[category as any],
        rewardData: categoryData,
        sampleAmount,
        transactionResult
      };
    }).filter((item): item is NonNullable<typeof item> => item !== null);
  }, [process.data, process.card_name]);

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
            <button 
              onClick={() => {
                if (!process.data) return;
                // Card ID starts from 1 - update this after DB import if needed
                const productionData = mapToCompleteProductionFormat(process.data, 1);
                const blob = new Blob([JSON.stringify(productionData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${process.card_name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_production.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              className="px-5 py-3 bg-violet-50 border-2 border-violet-200 text-violet-700 text-sm font-semibold rounded-xl hover:bg-violet-100 hover:border-violet-300 transition-all duration-300 ease-out flex items-center gap-2"
              title="Download Production SQL JSON"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              SQL JSON
            </button>
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
                onClick={() => {
                  const isManualOverride = process.confidence_score < 75 || process.status === 'rejected';
                  const message = isManualOverride
                    ? `Manually approve "${process.card_name}"?\n\nThis will override the automatic validation (Score: ${process.confidence_score}%).\n\nAre you sure you want to proceed?`
                    : `Approve "${process.card_name}" for production?`;
                  
                  if (window.confirm(message)) {
                    onApprove(process.process_id);
                  }
                }}
                className="px-8 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-bold rounded-xl hover:shadow-xl hover:shadow-violet-200 shadow-lg transition-all duration-300 ease-out flex items-center gap-2"
                title={process.confidence_score < 75 || process.status === 'rejected' ? 'Manual Approval (Overrides automatic validation)' : 'Approve for production'}
              >
                {process.confidence_score < 75 || process.status === 'rejected' ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Manual Approve
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Approve
                  </>
                )}
              </button>
            )}
            {process.status === 'approved' && (
              <button
                onClick={() => {
                  if (window.confirm(`Un-approve "${process.card_name}"?\n\nThis will change the status back to review required.`)) {
                    onApprove(process.process_id);
                  }
                }}
                className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold rounded-xl hover:shadow-xl hover:shadow-amber-200 shadow-lg transition-all duration-300 ease-out flex items-center gap-2"
                title="Un-approve this card"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Un-approve
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

        {/* Tab Navigation */}
        <div className="bg-white border-b-2 border-gray-200 px-8 shrink-0 flex gap-2">
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-6 py-4 font-semibold text-sm transition-all duration-300 border-b-4 flex items-center gap-2 ${activeTab === 'categories'
              ? 'text-violet-700 border-violet-600 bg-violet-50/50'
              : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
              }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
            Category Details
          </button>
          <button
            onClick={() => setActiveTab('partner-transfers')}
            className={`px-6 py-4 font-semibold text-sm transition-all duration-300 border-b-4 flex items-center gap-2 ${activeTab === 'partner-transfers'
              ? 'text-violet-700 border-violet-600 bg-violet-50/50'
              : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
              }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            Partner Transfers
            {categoryRewards.length > 0 && (
              <span className="ml-1 bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full text-xs font-bold ring-1 ring-violet-200">
                {categoryRewards.length}
              </span>
            )}
          </button>
        </div>

        <main className="flex-1 overflow-auto p-8 bg-gradient-to-br from-gray-50 to-white">
          <div className="max-w-7xl mx-auto space-y-12">

            {/* Category Details View */}
            {activeTab === 'categories' && (
              <>
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
              </>
            )}

            {/* Partner Transfers View */}
            {activeTab === 'partner-transfers' && (
              <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                {/* Header */}
                <div className="text-center space-y-3">
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                    Partner Transfer Options
                  </h2>
                  <p className="text-gray-600 max-w-2xl mx-auto">
                    Convert your {process.card_name} reward points to airline miles, hotel points, or vouchers.
                    Below are the available transfer partners for each spending category.
                  </p>
                </div>

                {categoryRewards.length === 0 ? (
                  (() => {
                    const cardType = getCardType(process.card_name);
                    const isCashback = cardType === 'cashback';
                    
                    return (
                      <div className="text-center py-16">
                        <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${
                          isCashback ? 'bg-amber-100' : 'bg-gray-100'
                        }`}>
                          {isCashback ? (
                            <svg className="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : (
                            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          )}
                        </div>
                        <h3 className={`text-xl font-semibold mb-2 ${
                          isCashback ? 'text-amber-700' : 'text-gray-700'
                        }`}>
                          {isCashback ? 'Cashback Card - No Partner Transfers' : 'No Reward Points Categories Found'}
                        </h3>
                        <p className="text-gray-500 max-w-md mx-auto">
                          {isCashback 
                            ? 'This is a cashback card that earns direct cashback instead of transferable reward points. Partner loyalty program transfers are not available for this card type.'
                            : "This card doesn't have any categories that earn transferable reward points, or the reward structure hasn't been extracted yet."
                          }
                        </p>
                      </div>
                    );
                  })()
                ) : (
                  <div className="space-y-10">
                    {/* 1. Category Summary Cards (Flight/Hotel) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {categoryRewards.map((item) => (
                        <div key={item.category} className="p-6 bg-white rounded-2xl border-2 border-violet-200 shadow-sm hover:shadow-md transition-shadow duration-300">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="text-lg font-bold text-gray-900">{item.label}</h3>
                              <p className="text-sm text-gray-500 mt-1 font-medium">{item.rewardData.reward_rate} • {item.rewardData.reward_type}</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-violet-50 flex items-center justify-center text-violet-600">
                              {item.category.includes('flight') ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                              )}
                            </div>
                          </div>

                          <div className="pt-4 border-t border-gray-100">
                            <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Points Earned</div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-sm text-gray-400">On ₹{(item.sampleAmount / 1000).toFixed(0)}k spend →</span>
                              <span className="text-2xl font-bold text-violet-700">{item.transactionResult.earned.toLocaleString()}</span>
                              <span className="text-sm text-violet-600 font-bold">{item.transactionResult.bankPointsType || 'points'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 2. Unified Partner Transfer Options Section - displayed ONCE */}
                    <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden">
                      <div className="bg-gradient-to-r from-violet-600 to-purple-700 p-8 text-white">
                        <h3 className="text-2xl font-bold mb-2">Transfer Partners</h3>
                        <p className="opacity-90 max-w-2xl">
                          Below are the transfer partners available for these points. Conversion ratios apply to the points earned above.
                        </p>
                      </div>

                      <div className="p-8">
                        {/* Use the first category's result as they should share the same reward program/partners */}
                        {categoryRewards[0].transactionResult.partnerConversions && categoryRewards[0].transactionResult.partnerConversions.length > 0 ? (
                          <PartnerConversionPanel
                            bankPoints={categoryRewards[0].transactionResult.earned}
                            bankPointsType={categoryRewards[0].transactionResult.bankPointsType}
                            sourceCard={process.card_name}
                            partnerConversions={categoryRewards[0].transactionResult.partnerConversions}
                          />
                        ) : (
                          <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
                            <p className="text-gray-500 italic">No direct partner transfer options identified for this card's reward program.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </main>
      </div>

      <JsonModal isOpen={isJsonModalOpen} onClose={() => setIsJsonModalOpen(false)} data={process.data} cardName={process.card_name} />
    </div>
  );
};

export default ValidationView;