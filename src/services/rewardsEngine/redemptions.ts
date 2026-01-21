/**
 * Redemptions Service - Credit Card Rewards Engine
 *
 * This service handles:
 * 1. Card type detection (cashback vs rewards)
 * 2. Conversion ratio lookups for partner programs
 * 3. Partner points calculations
 * 4. Available partner program listings
 *
 * IMPORTANT: valuationReference is for DISPLAY ONLY - never use in calculations
 */

import redemptionData from '../../../redemption_data.json';
import { trackMissingConversion } from './missingDataHandler';
import type {
  CardType,
  ConversionRatio,
  PartnerPointsResult,
  AvailablePartner,
  PartnerCategory,
  PartnerSubCategory,
  TransferMode,
} from './types';

// Type for JSON data structures
interface PartnerJson {
  partnerId: string;
  partnerName: string;
  category: string;
  subCategory: string | null;
  supportedBy: Array<{
    bankOrProgram: string;
    mode: string;
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

interface RedemptionDataJson {
  cardRewardTypes: Record<string, 'cashback' | 'rewards'>;
  partners: PartnerJson[];
}

// Type assertion for JSON data
const data = redemptionData as RedemptionDataJson;

// Card to reward program mapping
// Maps card identifiers to the program names used in redemption_data.json
const CARD_TO_PROGRAM_MAP: Record<string, string> = {
  // MRCC (Membership Rewards Credit Card)
  'mrcc': 'MRCC',
  'membership_rewards_credit_card': 'MRCC',

  // American Express cards
  'amex_platinum_travel': 'AMEX PLATINUM TRAVEL',
  'amex_platinum_travel_credit_card': 'AMEX PLATINUM TRAVEL',
  'american_express_platinum_travel': 'AMEX PLATINUM TRAVEL',

  'amex_smart_earn': 'AMEX SMART EARN',
  'amex_smart_earn_credit_card': 'AMEX SMART EARN',
  'american_express_smart_earn': 'AMEX SMART EARN',

  'amex_platinum': 'Amex',
  'amex_gold': 'Amex',
  'amex_membership_rewards': 'Amex',

  // AU Bank
  'au_altura': 'AU ALTURA',
  'au_altura_credit_card': 'AU ALTURA',
  'au_altura_plus': 'AU ALTURA',
  'au_zenith': 'AU ZENITH',
  'au_zenith_credit_card': 'AU ZENITH',
  'au_zenith_plus': 'AU ZENITH',
  'au_zenith_plus_credit_card': 'AU ZENITH',

  // Axis Bank - Magnus Burgundy gets superior 5:4 ratio
  'axis_magnus': 'Axis_Magnus',
  'axis_magnus_credit_card': 'Axis_Magnus',
  'axis_magnus_burgundy': 'Axis_Magnus_Burgundy', // Superior 5:4 ratio
  'axis_magnus_burgundy_credit_card': 'Axis_Magnus_Burgundy',
  'axis_burgundy': 'Axis_Magnus_Burgundy', // Burgundy variant
  'axis_burgundy_private': 'Axis_Magnus_Burgundy',
  'axis_reserve': 'Axis_Reserve',
  'axis_atlas': 'Axis_Atlas',

  // Yes Bank
  'yes_private': 'YES_Rewards',
  'yes_marquee': 'YES_Rewards',

  // Kotak
  'kotak_privy_league': 'Kotak_Rewards',
  'kotak_6e': 'Kotak',
  'kotak_indigo': 'Kotak',

  // IndusInd cards
  'indusind_avios': 'IndusInd Avios',
  'indusind_iconia': 'IndusInd',

  // ICICI cards
  'icici_emeralde': 'ICICI',
  'icici_coral': 'ICICI',

  // Standard Chartered cards
  'sc_emirates': 'Standard Chartered',
  'standard_chartered_emirates': 'Standard Chartered',

  // IDFC cards
  'idfc_club_vistara': 'IDFC FIRST',
  'idfc_first_vistara': 'IDFC FIRST',
};

// Normalize card name to identifier
function normalizeCardName(cardName: string): string {
  return cardName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

// Find reward program for a card
function getRewardProgram(cardName: string): string | null {
  const normalized = normalizeCardName(cardName);
  console.log('[RewardsEngine] getRewardProgram - Input:', cardName);
  console.log('[RewardsEngine] getRewardProgram - Normalized:', normalized);

  // Try exact match first
  if (CARD_TO_PROGRAM_MAP[normalized]) {
    console.log('[RewardsEngine] getRewardProgram - Exact match found:', CARD_TO_PROGRAM_MAP[normalized]);
    return CARD_TO_PROGRAM_MAP[normalized];
  }

  // Try partial match
  for (const [key, program] of Object.entries(CARD_TO_PROGRAM_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      console.log('[RewardsEngine] getRewardProgram - Partial match:', key, '->', program);
      return program;
    }
  }

  console.log('[RewardsEngine] getRewardProgram - No match found');
  return null;
}

/**
 * Get the card type (cashback or rewards)
 * @param cardId - Card identifier or name
 * @returns 'cashback' | 'rewards' | null
 */
export function getCardType(cardId: string): CardType {
  const normalized = normalizeCardName(cardId);

  // Check in cardRewardTypes from JSON
  if (data.cardRewardTypes[normalized]) {
    return data.cardRewardTypes[normalized];
  }

  // Try partial match
  for (const [key, type] of Object.entries(data.cardRewardTypes)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return type;
    }
  }

  // Default to rewards if we have a program mapping
  if (getRewardProgram(cardId)) {
    return 'rewards';
  }

  return null;
}

/**
 * Get conversion ratio for a card-to-partner transfer
 * @param sourceCard - The credit card identifier
 * @param partnerProgramId - The partner program identifier (e.g., 'club_vistara')
 * @returns ConversionRatio object or null if not supported
 */
export function getConversionRatio(
  sourceCard: string,
  partnerProgramId: string
): ConversionRatio | null {
  // Check if card is cashback type (no transfers)
  const cardType = getCardType(sourceCard);
  if (cardType === 'cashback') {
    trackMissingConversion(sourceCard, partnerProgramId, 'cashback_card');
    return null;
  }

  // Get reward program for this card
  const rewardProgram = getRewardProgram(sourceCard);
  if (!rewardProgram) {
    trackMissingConversion(sourceCard, partnerProgramId, 'card_not_supported');
    return null;
  }

  // Find partner in data
  const partner = data.partners.find((p: PartnerJson) => p.partnerId === partnerProgramId);
  if (!partner) {
    trackMissingConversion(sourceCard, partnerProgramId, 'partner_not_supported');
    return null;
  }

  // Check if this program is supported by the partner
  const isSupported = partner.supportedBy.some(
    (s) => s.bankOrProgram.toUpperCase() === rewardProgram.toUpperCase()
  );
  if (!isSupported) {
    trackMissingConversion(sourceCard, partnerProgramId, 'no_ratio_in_database');
    return null;
  }

  // Find conversion ratio
  const conversionRatio = partner.conversionRatios.find(
    (r) => r.sourceProgram.toUpperCase() === rewardProgram.toUpperCase()
  );
  if (!conversionRatio) {
    trackMissingConversion(sourceCard, partnerProgramId, 'no_ratio_in_database');
    return null;
  }

  // Parse ratio string (e.g., "3:1" means 3 bank points = 1 partner point)
  const ratioParts = conversionRatio.ratio.split(':').map(Number);
  const bankPoints = ratioParts[0];
  const partnerPoints = ratioParts[1];

  return {
    ratio: conversionRatio.ratio,
    bankPoints,
    partnerPoints,
    minimumPoints: conversionRatio.minimumPoints || 0,
    sourceProgram: rewardProgram,
  };
}

/**
 * Calculate partner points from bank points
 * @param bankPoints - Number of bank/card reward points
 * @param sourceCard - The credit card identifier
 * @param partnerProgramId - The partner program identifier
 * @returns PartnerPointsResult object
 */
export function calculatePartnerPoints(
  bankPoints: number,
  sourceCard: string,
  partnerProgramId: string
): PartnerPointsResult {
  const partner = data.partners.find((p: PartnerJson) => p.partnerId === partnerProgramId);
  const defaultResult: PartnerPointsResult = {
    partnerPoints: 0,
    conversionRatio: 'N/A',
    minimumPointsRequired: 0,
    canConvert: false,
    insufficientPoints: false,
    partnerProgramName: partner?.partnerName || partnerProgramId,
  };

  // Get conversion ratio
  const ratio = getConversionRatio(sourceCard, partnerProgramId);

  if (!ratio) {
    return defaultResult;
  }

  // Check minimum points
  if (bankPoints < ratio.minimumPoints) {
    return {
      ...defaultResult,
      conversionRatio: ratio.ratio,
      minimumPointsRequired: ratio.minimumPoints,
      insufficientPoints: true,
      canConvert: false,
    };
  }

  // Calculate partner points
  // For ratio "3:1", bankPoints / 3 * 1 = partner points
  const partnerPointsEarned = Math.floor(bankPoints * (ratio.partnerPoints / ratio.bankPoints));

  return {
    partnerPoints: partnerPointsEarned,
    conversionRatio: ratio.ratio,
    minimumPointsRequired: ratio.minimumPoints,
    canConvert: true,
    insufficientPoints: false,
    partnerProgramName: partner?.partnerName || partnerProgramId,
  };
}

/**
 * Get all available partner programs for a card
 * @param sourceCard - The credit card identifier
 * @returns Array of available partners with their details
 */
export function getAvailablePartners(sourceCard: string): AvailablePartner[] {
  console.log('[RewardsEngine] getAvailablePartners - sourceCard:', sourceCard);
  const normalized = normalizeCardName(sourceCard);
  console.log('[RewardsEngine] getAvailablePartners - normalized:', normalized);

  const cardType = getCardType(sourceCard);
  console.log('[RewardsEngine] getAvailablePartners - cardType:', cardType);

  // Cashback cards have no transfer partners
  if (cardType === 'cashback') {
    console.log('[RewardsEngine] getAvailablePartners - Card is cashback, returning empty');
    return [];
  }

  // Get reward program for this card
  const rewardProgram = getRewardProgram(sourceCard);
  console.log('[RewardsEngine] getAvailablePartners - rewardProgram:', rewardProgram);
  if (!rewardProgram) {
    console.log('[RewardsEngine] getAvailablePartners - No reward program found, returning empty');
    console.log('[RewardsEngine] Available mappings:', Object.keys(CARD_TO_PROGRAM_MAP).filter(k => k.includes('magnus') || k.includes('burgundy')));
    return [];
  }

  const availablePartners: AvailablePartner[] = [];

  for (const partner of data.partners as PartnerJson[]) {
    // Check if this program is supported
    const supportedEntry = partner.supportedBy.find(
      (s) => s.bankOrProgram.toUpperCase() === rewardProgram.toUpperCase()
    );

    if (!supportedEntry) {
      continue;
    }

    // Find conversion ratio
    const conversionRatio = partner.conversionRatios.find(
      (r) => r.sourceProgram.toUpperCase() === rewardProgram.toUpperCase()
    );

    // Only include partners with actual conversion ratios
    if (!conversionRatio) {
      continue;
    }

    availablePartners.push({
      partnerId: partner.partnerId,
      partnerName: partner.partnerName,
      category: partner.category as PartnerCategory,
      subCategory: partner.subCategory as PartnerSubCategory,
      conversionRatio: conversionRatio.ratio,
      minimumPoints: conversionRatio.minimumPoints || 0,
      transferMode: supportedEntry.mode as TransferMode,
      valuationReference: {
        value: partner.valuationReference.value,
        currency: partner.valuationReference.currency,
        notes: partner.valuationReference.notes,
      },
    });
  }

  console.log(`[RewardsEngine] getAvailablePartners - Found ${availablePartners.length} partners for "${rewardProgram}"`);
  if (availablePartners.length > 0) {
    console.log('[RewardsEngine] getAvailablePartners - Partners:', availablePartners.map(p => p.partnerName));
  }

  // Sort by category: airlines first, then hotels, then vouchers
  const categoryOrder: Record<string, number> = {
    airline: 1,
    hotel: 2,
    voucher: 3,
  };

  return availablePartners.sort(
    (a, b) => (categoryOrder[a.category] || 4) - (categoryOrder[b.category] || 4)
  );
}

/**
 * Get all cards that have transfer partners
 * @returns Array of card identifiers with transfer capabilities
 */
export function getTransferableCards(): string[] {
  return Object.entries(data.cardRewardTypes)
    .filter(([, type]) => type === 'rewards')
    .map(([cardId]) => cardId);
}

/**
 * Check if a specific card can transfer to a specific partner
 * @param cardName - The credit card name
 * @param partnerId - The partner program ID
 * @returns boolean indicating if transfer is possible
 */
export function canTransferTo(cardName: string, partnerId: string): boolean {
  const ratio = getConversionRatio(cardName, partnerId);
  return ratio !== null;
}

/**
 * Get all partner programs available in the system
 * @returns Array of all partner programs
 */
export function getAllPartners(): Array<{
  partnerId: string;
  partnerName: string;
  category: PartnerCategory;
  subCategory: PartnerSubCategory;
}> {
  return (data.partners as PartnerJson[]).map((p) => ({
    partnerId: p.partnerId,
    partnerName: p.partnerName,
    category: p.category as PartnerCategory,
    subCategory: p.subCategory as PartnerSubCategory,
  }));
}

/**
 * Get partner points type display name
 * @param partnerId - Partner program ID
 * @returns Display name for partner points
 */
export function getPartnerPointsType(partnerId: string): string {
  const partner = data.partners.find((p: PartnerJson) => p.partnerId === partnerId);
  if (!partner) return 'Points';

  // Generate points type from partner name
  const name = partner.partnerName;
  if (name.includes('Avios')) return 'Avios';
  if (name.includes('KrisFlyer')) return 'KrisFlyer Miles';
  if (name.includes('Skywards')) return 'Skywards Miles';
  if (name.includes('Flying Returns')) return 'Flying Returns Miles';
  if (name.includes('Vistara')) return 'Club Vistara Points';
  if (name.includes('InterMiles')) return 'InterMiles';
  if (name.includes('Hilton')) return 'Hilton Honors Points';
  if (name.includes('Marriott')) return 'Bonvoy Points';
  if (partner.category === 'voucher') return 'Voucher Value (INR)';

  return `${name} Points`;
}
