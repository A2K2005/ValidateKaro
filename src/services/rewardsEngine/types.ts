/**
 * Types for Rewards Engine
 *
 * Contains all TypeScript interfaces and types used across the rewards engine.
 */

// Category types
export type PartnerCategory = 'airline' | 'hotel' | 'voucher';
export type PartnerSubCategory = 'domestic' | 'international' | null;
export type CardRewardType = 'cashback' | 'rewards';
export type TransferMode = 'transfer' | 'co_branded' | 'voucher';

// Card type detection result
export type CardType = CardRewardType | null;

// Display reference for partner valuations (DISPLAY ONLY - never use for calculations)
export interface DisplayReference {
  estimatedValueINR: number;
  estimatedValueUSD: number | null;
  notes: string;
  warning: 'This is a reference value only. Actual value varies significantly based on redemption option, availability, and booking class.';
}

// Partner conversion option in calculation results
export interface PartnerConversionOption {
  partnerId: string;
  partnerName: string;
  category: PartnerCategory;
  subCategory: PartnerSubCategory;
  conversionRatio: string;
  bankPointsRequired: number;
  partnerPointsEarned: number;
  minimumPointsRequired: number;
  canConvert: boolean;
  insufficientPoints: boolean;
  partnerPointsType: string; // "Club Vistara Points", "Marriott Bonvoy Points"
  displayReference: DisplayReference | null;
}

// Conversion ratio lookup result
export interface ConversionRatio {
  ratio: string;
  bankPoints: number;
  partnerPoints: number;
  minimumPoints: number;
  sourceProgram: string;
}

// Partner points calculation result
export interface PartnerPointsResult {
  partnerPoints: number;
  conversionRatio: string;
  minimumPointsRequired: number;
  canConvert: boolean;
  insufficientPoints: boolean;
  partnerProgramName: string;
}

// Available partner for a card
export interface AvailablePartner {
  partnerId: string;
  partnerName: string;
  category: PartnerCategory;
  subCategory: PartnerSubCategory;
  conversionRatio: string;
  minimumPoints: number;
  transferMode: TransferMode;
  valuationReference: {
    value: number | null;
    currency: string | null;
    notes: string | null;
  };
}

// Transaction reward breakdown item
export interface RewardBreakdownItem {
  category: string;
  amount: number;
  rate: number;
  points: number;
  description: string;
}

// Main result type for transaction rewards calculation
export interface TransactionRewardsResult {
  earned: number;
  breakdown: RewardBreakdownItem[];
  roundingLoss: number;
  cardType: CardType;
  bankPointsType: string;
  partnerConversions: PartnerConversionOption[];
}

// Missing data tracking
export type MissingDataReason =
  | 'no_ratio_in_database'
  | 'card_not_supported'
  | 'cashback_card'
  | 'partner_not_supported';

export interface MissingConversionRatio {
  sourceCard: string;
  partnerProgram: string;
  reason: MissingDataReason;
  timestamp: Date;
  attemptCount: number;
}

export interface MissingDataReport {
  totalMissing: number;
  byCard: Map<string, number>;
  byPartner: Map<string, number>;
  suggestions: string[];
  topMissing: Array<{
    card: string;
    partner: string;
    attempts: number;
  }>;
}

// JSON data structures (from redemption_data.json)
export interface RedemptionDataJson {
  cardRewardTypes: Record<string, CardRewardType>;
  partners: PartnerJson[];
}

export interface PartnerJson {
  partnerId: string;
  partnerName: string;
  category: PartnerCategory;
  subCategory: PartnerSubCategory;
  supportedBy: Array<{
    bankOrProgram: string;
    mode: TransferMode;
  }>;
  conversionRatios: Array<{
    sourceProgram: string;
    ratio: string;
    minimumPoints: number | null;
  }>;
  constraints: string[];
  valuationReference: {
    value: number | null;
    currency: string | null;
    asOf: string | null;
    notes: string | null;
  };
}

// Card to reward program mapping
export interface CardProgramMapping {
  cardId: string;
  programName: string;
  displayName: string;
}
