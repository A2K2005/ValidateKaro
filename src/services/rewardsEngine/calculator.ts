/**
 * Calculator Service - Rewards Calculation with Partner Conversions
 *
 * This service calculates:
 * 1. Bank/card reward points earned from transactions
 * 2. Partner point conversion options
 * 3. Display reference values (for UI only, never for comparisons)
 */

import {
  getAvailablePartners,
  calculatePartnerPoints,
  getCardType,
  getPartnerPointsType,
} from './redemptions';
import type {
  AvailablePartner,
  PartnerConversionOption,
  TransactionRewardsResult,
  RewardBreakdownItem,
  DisplayReference,
} from './types';

// Re-export types for convenience
export type { PartnerConversionOption, TransactionRewardsResult, RewardBreakdownItem };

// Card reward program names for display
const CARD_POINTS_TYPE: Record<string, string> = {
  // HDFC cards
  hdfc_infinia: 'Infinia Reward Points',
  hdfc_infinia_credit_card: 'Infinia Reward Points',
  hdfc_diners_black: 'Diners Reward Points',
  hdfc_diners_club_black_credit_card: 'Diners Reward Points',
  hdfc_diners_black_metal: 'Diners Reward Points',
  hdfc_diners_club_black_metal_credit_card: 'Diners Reward Points',
  hdfc_regalia_gold: 'Regalia Reward Points',
  hdfc_regalia_gold_credit_card: 'Regalia Reward Points',
  hdfc_millenia: 'Millenia Reward Points',

  // AMEX cards
  amex_platinum: 'Membership Rewards',
  amex_platinum_card: 'Membership Rewards',
  american_express_platinum_card: 'Membership Rewards',
  amex_gold: 'Membership Rewards',
  amex_membership_rewards: 'Membership Rewards',
  amex_platinum_reserve: 'Membership Rewards',
  amex_platinum_travel: 'Membership Rewards',
  amex_smart_earn: 'Membership Rewards',
  mrcc: 'Membership Rewards',

  // Axis cards
  axis_atlas: 'EDGE Rewards',
  axis_atlas_credit_card: 'EDGE Rewards',
  axis_magnus: 'EDGE Rewards',
  axis_magnus_credit_card: 'EDGE Rewards',
  axis_magnus_burgundy: 'EDGE Rewards',
  axis_magnus_burgundy_credit_card: 'EDGE Rewards',
  axis_burgundy: 'EDGE Rewards',
  axis_burgundy_private: 'EDGE Rewards',
  axis_horizon: 'EDGE Rewards',
  axis_bank_horizon_credit_card: 'EDGE Rewards',
  axis_rewards: 'EDGE Rewards',
  axis_select: 'EDGE Rewards',
  axis_privilege: 'EDGE Rewards',
  axis_my_zone: 'EDGE Rewards',
  axis_vistara: 'Club Vistara Points',

  // SBI cards
  sbi_card_miles: 'Reward Points',
  sbi_elite: 'Reward Points',
  sbi_elite_card: 'Reward Points',
  sbi_prime: 'Reward Points',
  sbi_bpcl_octane: 'Reward Points',

  // AU Bank cards
  au_zenith_plus: 'Reward Points',
  au_zenith: 'Reward Points',
  au_altura: 'Reward Points',
  au_altura_plus: 'Reward Points',

  // HSBC cards
  hsbc_travel_one: 'Reward Points',

  // Default fallback
  default: 'Reward Points',
};

// Normalize card name to identifier
function normalizeCardName(cardName: string): string {
  return cardName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Get the display name for the bank's reward points
 */
export function getBankPointsType(cardName: string): string {
  const normalized = normalizeCardName(cardName);

  // Try exact match
  if (CARD_POINTS_TYPE[normalized]) {
    return CARD_POINTS_TYPE[normalized];
  }

  // Try partial match
  for (const [key, value] of Object.entries(CARD_POINTS_TYPE)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }

  return CARD_POINTS_TYPE['default'];
}

/**
 * Calculate rewards earned from a transaction
 *
 * @param transactionAmount - Transaction amount in rupees
 * @param cardName - Credit card name/identifier
 * @param rewardRate - Points earned per 100 rupees (e.g., 5 = 5 points per 100)
 * @param category - Optional spending category for breakdown
 * @returns TransactionRewardsResult with earned points and partner conversion options
 */
export function calculateRewardsForTransaction(
  transactionAmount: number,
  cardName: string,
  rewardRate: number,
  category: string = 'General'
): TransactionRewardsResult {
  // Calculate base reward points
  const exactPoints = (transactionAmount / 100) * rewardRate;
  const earnedPoints = Math.floor(exactPoints);
  const roundingLoss = exactPoints - earnedPoints;

  // Create breakdown
  const breakdown: RewardBreakdownItem[] = [
    {
      category,
      amount: transactionAmount,
      rate: rewardRate,
      points: earnedPoints,
      description: `${rewardRate} points per Rs.100 on ${category}`,
    },
  ];

  // Get card type
  const cardType = getCardType(cardName);

  // Get bank points type for display
  const bankPointsType = getBankPointsType(cardName);

  // Get partner conversions
  const partnerConversions = calculatePartnerConversions(earnedPoints, cardName);

  return {
    earned: earnedPoints,
    breakdown,
    roundingLoss,
    cardType,
    bankPointsType,
    partnerConversions,
  };
}

/**
 * Calculate rewards with multiple category breakdowns
 *
 * @param transactions - Array of { amount, rate, category }
 * @param cardName - Credit card name/identifier
 * @returns TransactionRewardsResult with combined earned points and partner conversions
 */
export function calculateRewardsMultiCategory(
  transactions: Array<{ amount: number; rate: number; category: string }>,
  cardName: string
): TransactionRewardsResult {
  let totalExactPoints = 0;
  const breakdown: RewardBreakdownItem[] = [];

  for (const txn of transactions) {
    const exactPoints = (txn.amount / 100) * txn.rate;
    const earnedPoints = Math.floor(exactPoints);
    totalExactPoints += exactPoints;

    breakdown.push({
      category: txn.category,
      amount: txn.amount,
      rate: txn.rate,
      points: earnedPoints,
      description: `${txn.rate} points per Rs.100 on ${txn.category}`,
    });
  }

  const totalEarned = Math.floor(totalExactPoints);
  const roundingLoss = totalExactPoints - totalEarned;

  const cardType = getCardType(cardName);
  const bankPointsType = getBankPointsType(cardName);
  const partnerConversions = calculatePartnerConversions(totalEarned, cardName);

  return {
    earned: totalEarned,
    breakdown,
    roundingLoss,
    cardType,
    bankPointsType,
    partnerConversions,
  };
}

/**
 * Calculate partner conversion options for given bank points
 *
 * @param bankPoints - Number of bank reward points
 * @param cardName - Credit card name/identifier
 * @returns Array of PartnerConversionOption with display reference values
 */
function calculatePartnerConversions(
  bankPoints: number,
  cardName: string
): PartnerConversionOption[] {
  // Get available partners for this card
  const availablePartners = getAvailablePartners(cardName);

  if (availablePartners.length === 0) {
    return [];
  }

  // Calculate conversion for each partner
  const conversions: PartnerConversionOption[] = availablePartners.map(
    (partner: AvailablePartner) => {
      const result = calculatePartnerPoints(bankPoints, cardName, partner.partnerId);

      // Calculate display reference value (FOR DISPLAY ONLY)
      const valuePerPoint = partner.valuationReference.value || 0;
      const estimatedValueINR = result.partnerPoints * valuePerPoint;

      // Get partner points type
      const partnerPointsType = getPartnerPointsType(partner.partnerId);

      // Build display reference (only if we have valuation data)
      let displayReference: DisplayReference | null = null;
      if (valuePerPoint > 0) {
        displayReference = {
          estimatedValueINR: Math.round(estimatedValueINR * 100) / 100,
          estimatedValueUSD:
            partner.valuationReference.currency === 'USD'
              ? Math.round((estimatedValueINR / 83) * 100) / 100
              : null,
          notes: partner.valuationReference.notes || '',
          warning:
            'This is a reference value only. Actual value varies significantly based on redemption option, availability, and booking class.',
        };
      }

      return {
        partnerId: partner.partnerId,
        partnerName: partner.partnerName,
        category: partner.category,
        subCategory: partner.subCategory,
        conversionRatio: partner.conversionRatio,
        bankPointsRequired: bankPoints,
        partnerPointsEarned: result.partnerPoints,
        minimumPointsRequired: partner.minimumPoints,
        canConvert: result.canConvert,
        insufficientPoints: result.insufficientPoints,
        partnerPointsType,
        displayReference,
      };
    }
  );

  return conversions;
}

/**
 * Get partner conversions for existing bank points (without calculating rewards)
 *
 * @param bankPoints - Number of bank reward points already accumulated
 * @param cardName - Credit card name/identifier
 * @returns Array of PartnerConversionOption
 */
export function getPartnerConversionsForPoints(
  bankPoints: number,
  cardName: string
): PartnerConversionOption[] {
  return calculatePartnerConversions(bankPoints, cardName);
}

/**
 * Calculate total estimated value across all partner options
 * WARNING: For comparison/display only, not for decision making
 *
 * @param bankPoints - Number of bank reward points
 * @param cardName - Credit card name/identifier
 * @returns Best estimated value (highest) or null if no conversions available
 */
export function getBestEstimatedValue(
  bankPoints: number,
  cardName: string
): { partnerId: string; partnerName: string; estimatedValue: number } | null {
  const conversions = calculatePartnerConversions(bankPoints, cardName);

  if (conversions.length === 0) {
    return null;
  }

  // Find conversion with highest estimated value that can actually convert
  const validConversions = conversions.filter(
    (c) => c.canConvert && c.displayReference !== null
  );

  if (validConversions.length === 0) {
    return null;
  }

  const best = validConversions.reduce((prev, current) =>
    (current.displayReference?.estimatedValueINR || 0) >
      (prev.displayReference?.estimatedValueINR || 0)
      ? current
      : prev
  );

  return {
    partnerId: best.partnerId,
    partnerName: best.partnerName,
    estimatedValue: best.displayReference?.estimatedValueINR || 0,
  };
}
