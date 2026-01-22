/**
 * Rewards Engine - Credit Card Rewards Calculation and Redemption Service
 *
 * This module provides tools for:
 * - Determining card type (cashback vs rewards)
 * - Looking up conversion ratios for partner programs
 * - Calculating partner points from bank points
 * - Listing available transfer partners
 * - Calculating transaction rewards with partner conversion options
 * - Tracking missing conversion ratios for product improvement
 *
 * Usage:
 * ```typescript
 * import {
 *   getCardType,
 *   getConversionRatio,
 *   calculatePartnerPoints,
 *   getAvailablePartners,
 *   calculateRewardsForTransaction,
 * } from '@/services/rewardsEngine';
 *
 * // Check if card earns rewards or cashback
 * const cardType = getCardType('HDFC Infinia Credit Card');
 * // => 'rewards'
 *
 * // Get available transfer partners
 * const partners = getAvailablePartners('HDFC Infinia Credit Card');
 * // => [{ partnerId: 'marriott_bonvoy', partnerName: 'Marriott Bonvoy', ... }, ...]
 *
 * // Calculate partner points
 * const result = calculatePartnerPoints(10000, 'HDFC Infinia Credit Card', 'marriott_bonvoy');
 * // => { partnerPoints: 10000, conversionRatio: '1:1', canConvert: true, ... }
 *
 * // Calculate transaction rewards with partner conversions
 * const txnResult = calculateRewardsForTransaction(1000, 'HDFC Infinia', 5, 'Online Shopping');
 * // => { earned: 50, partnerConversions: [...], ... }
 * ```
 */

// Redemptions exports
export {
  getCardType,
  getPartnerConversionsV2,
  getTransferableCards,
  canTransferTo,
  getAllPartners,
  getPartnerPointsType,
} from './redemptionsV2';

// Calculator exports
export {
  calculateRewardsForTransaction,
  calculateRewardsMultiCategory,
  getPartnerConversionsForPoints,
  getBestEstimatedValue,
  getBankPointsType,
} from './calculator';

// Missing data handler exports
export {
  trackMissingConversion,
  getMissingConversionRatios,
  getMissingByReason,
  generateMissingDataReport,
  getMissingConversionMessage,
  getMissingEntry,
  getMissingStats,
  clearMissingConversions,
} from './missingDataHandler';

// Type exports
export type {
  // Core types
  CardType,
  PartnerCategory,
  PartnerSubCategory,
  TransferMode,
  CardRewardType,

  // Conversion types
  ConversionRatio,
  PartnerPointsResult,
  AvailablePartner,

  // Calculator types
  PartnerConversionOption,
  TransactionRewardsResult,
  RewardBreakdownItem,
  DisplayReference,

  // Missing data types
  MissingDataReason,
  MissingConversionRatio,
  MissingDataReport,
} from './types';
