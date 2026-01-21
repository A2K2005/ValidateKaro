import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PartnerConversionOption } from '@/services/rewardsEngine';

// Icons for categories
const CategoryIcon = ({ category }: { category: string }) => {
  switch (category) {
    case 'airline':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
          />
        </svg>
      );
    case 'hotel':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      );
    case 'voucher':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
          />
        </svg>
      );
    default:
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
  }
};

// Warning icon
const WarningIcon = () => (
  <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
);

// Info icon
const InfoIcon = () => (
  <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

type SortOption = 'value' | 'ratio' | 'name';
type CategoryFilter = 'all' | 'airline' | 'hotel' | 'voucher';

interface PartnerConversionPanelProps {
  bankPoints: number;
  bankPointsType: string;
  sourceCard: string;
  partnerConversions: PartnerConversionOption[];
  onTransferClick?: (partnerId: string) => void;
}

export function PartnerConversionPanel({
  bankPoints,
  bankPointsType,
  sourceCard,
  partnerConversions,
  onTransferClick,
}: PartnerConversionPanelProps) {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('value');

  // Filter and sort conversions
  const filteredConversions = useMemo(() => {
    let filtered = [...partnerConversions];

    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((c) => c.category === categoryFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'value':
          // Sort by estimated value (highest first), but put non-convertible last
          if (a.canConvert && !b.canConvert) return -1;
          if (!a.canConvert && b.canConvert) return 1;
          const aValue = a.displayReference?.estimatedValueINR || 0;
          const bValue = b.displayReference?.estimatedValueINR || 0;
          return bValue - aValue;
        case 'ratio':
          // Parse ratio and sort by best conversion (lower bank points per partner point)
          const [aBank, aPartner] = a.conversionRatio.split(':').map(Number);
          const [bBank, bPartner] = b.conversionRatio.split(':').map(Number);
          const aRatio = aBank / aPartner;
          const bRatio = bBank / bPartner;
          return aRatio - bRatio;
        case 'name':
          return a.partnerName.localeCompare(b.partnerName);
        default:
          return 0;
      }
    });

    return filtered;
  }, [partnerConversions, categoryFilter, sortBy]);

  // Count by category for tab badges
  const categoryCounts = useMemo(() => {
    const counts = { airline: 0, hotel: 0, voucher: 0 };
    partnerConversions.forEach((c) => {
      if (c.category in counts) {
        counts[c.category as keyof typeof counts]++;
      }
    });
    return counts;
  }, [partnerConversions]);

  if (partnerConversions.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
              No Transfer Partners Available
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {sourceCard} does not support point transfers to airline or hotel loyalty programs.
              Points can typically be redeemed for statement credit, vouchers, or merchandise.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border-violet-200 dark:border-violet-800">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-violet-900 dark:text-violet-100 flex items-center gap-2">
          <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
            Partner Transfer Options
          </span>
        </CardTitle>
        <CardDescription className="text-violet-700/70 dark:text-violet-300/70">
          Convert {bankPoints.toLocaleString()} {bankPointsType} to airline miles or hotel points
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Category Tabs */}
        <Tabs
          value={categoryFilter}
          onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <TabsList className="bg-violet-100/80 dark:bg-violet-900/30">
              <TabsTrigger
                value="all"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-violet-800"
              >
                All ({partnerConversions.length})
              </TabsTrigger>
              <TabsTrigger
                value="airline"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-violet-800"
                disabled={categoryCounts.airline === 0}
              >
                Airlines ({categoryCounts.airline})
              </TabsTrigger>
              <TabsTrigger
                value="hotel"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-violet-800"
                disabled={categoryCounts.hotel === 0}
              >
                Hotels ({categoryCounts.hotel})
              </TabsTrigger>
              {categoryCounts.voucher > 0 && (
                <TabsTrigger
                  value="voucher"
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-violet-800"
                >
                  Vouchers ({categoryCounts.voucher})
                </TabsTrigger>
              )}
            </TabsList>

            {/* Sort dropdown */}
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[180px] bg-white dark:bg-violet-900/50 border-violet-200 dark:border-violet-700">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="value">Est. Value (High to Low)</SelectItem>
                <SelectItem value="ratio">Best Ratio First</SelectItem>
                <SelectItem value="name">Alphabetical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Partner Cards Grid */}
          <TabsContent value={categoryFilter} className="mt-4">
            <div className="grid gap-3 md:grid-cols-2">
              {filteredConversions.map((conversion) => (
                <PartnerCard
                  key={conversion.partnerId}
                  conversion={conversion}
                  bankPoints={bankPoints}
                  bankPointsType={bankPointsType}
                  onTransferClick={onTransferClick}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Disclaimer */}
        <div className="mt-6 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <div className="flex gap-2 items-start">
            <InfoIcon />
            <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
              <strong>Important:</strong> Values shown are estimates only. Actual redemption value
              depends on availability, booking class, dates, and redemption option chosen. Research
              specific redemptions before transferring points.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Individual partner card component
interface PartnerCardProps {
  conversion: PartnerConversionOption;
  bankPoints: number;
  bankPointsType: string;
  onTransferClick?: (partnerId: string) => void;
}

const PartnerCard: React.FC<PartnerCardProps> = ({
  conversion,
  bankPoints,
  bankPointsType,
  onTransferClick,
}) => {
  const isDisabled = !conversion.canConvert;
  const hasInsufficientPoints = conversion.insufficientPoints;
  const hasDisplayReference = conversion.displayReference !== null;

  // Get subcategory label
  const getSubCategoryLabel = () => {
    if (!conversion.subCategory) return null;
    return conversion.subCategory === 'domestic' ? 'Domestic' : 'International';
  };

  return (
    <div
      className={`
        relative rounded-lg border p-4 transition-all
        ${isDisabled
          ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 opacity-60'
          : 'bg-white dark:bg-violet-900/20 border-violet-200 dark:border-violet-700 hover:border-violet-400 dark:hover:border-violet-500 hover:shadow-md'
        }
      `}
    >
      {/* Header with icon and name */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={`
              p-2 rounded-lg
              ${isDisabled
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                : conversion.category === 'airline'
                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                  : conversion.category === 'hotel'
                    ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400'
                    : 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400'
              }
            `}
          >
            <CategoryIcon category={conversion.category} />
          </div>
          <div>
            <h4 className="font-medium text-slate-900 dark:text-slate-100">
              {conversion.partnerName}
            </h4>
            <div className="flex items-center gap-1 mt-0.5">
              <Badge
                variant="outline"
                className={`text-[10px] ${conversion.category === 'airline'
                  ? 'border-blue-200 text-blue-600'
                  : conversion.category === 'hotel'
                    ? 'border-emerald-200 text-emerald-600'
                    : 'border-purple-200 text-purple-600'
                  }`}
              >
                {conversion.category}
              </Badge>
              {getSubCategoryLabel() && (
                <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-500">
                  {getSubCategoryLabel()}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Conversion details */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">Conversion:</span>
          <span className="font-medium text-slate-700 dark:text-slate-200">
            {bankPoints.toLocaleString()} {bankPointsType} {'->'}{' '}
            <span className="text-violet-600 dark:text-violet-400">
            </span>
          </span>
        </div>

        {/* Ratio Display - Hidden as per request */}
        {/* <div className="flex justify-between items-baseline pt-1">
          <span className="text-xs text-slate-400 font-medium tracking-wide">Ratio:</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-semibold text-slate-600 font-mono">
              {option.ratio}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium bg-slate-100 px-1.5 py-0.5 rounded-full border border-slate-200">
              min. {option.minimumPoints?.toLocaleString() ?? 0}
            </span>
          </div>
        </div> */}

        {/* Estimated value - with warning (only show if we have reference data) */}
        {hasDisplayReference && (
          <>
            <div className="flex items-center justify-between text-sm pt-1 border-t border-dashed border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-1">
                <WarningIcon />
                <span className="text-amber-600 dark:text-amber-400 text-xs">Reference Value:</span>
              </div>
              <span className="font-medium text-amber-700 dark:text-amber-300">
                ~Rs.{conversion.displayReference!.estimatedValueINR.toLocaleString()}
              </span>
            </div>
            {conversion.displayReference!.notes && (
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {conversion.displayReference!.notes}
              </p>
            )}
            <p className="text-[10px] text-amber-500 dark:text-amber-400 italic">
              {conversion.displayReference!.warning}
            </p>
          </>
        )}

        {!hasDisplayReference && (
          <div className="flex items-center justify-between text-sm pt-1 border-t border-dashed border-slate-200 dark:border-slate-700">
            <span className="text-slate-400 dark:text-slate-500 text-xs italic">
              No valuation reference available
            </span>
          </div>
        )}
      </div>

      {/* Warning for insufficient points */}
      {hasInsufficientPoints && (
        <div className="mb-3 p-2 rounded bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700">
          <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 text-xs">
            <WarningIcon />
            <span>Minimum {conversion.minimumPointsRequired.toLocaleString()} points required</span>
          </div>
        </div>
      )}

      {/* Action button */}
      <Button
        variant={isDisabled ? 'outline' : 'default'}
        size="sm"
        className={`w-full ${isDisabled
          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
          : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white'
          }`}
        disabled={isDisabled}
        onClick={() => onTransferClick?.(conversion.partnerId)}
      >
        {isDisabled
          ? hasInsufficientPoints
            ? 'Insufficient Points'
            : 'Not Available'
          : 'Calculate Transfer'}
      </Button>
    </div>
  );
}

export default PartnerConversionPanel;