/**
 * Missing Data Handler - Track and report missing conversion ratios
 *
 * This service:
 * 1. Tracks which card-partner combinations have missing ratios
 * 2. Generates reports for admins to prioritize data additions
 * 3. Provides user-friendly messages when conversions are unavailable
 * 4. Logs missing conversions for product team analysis
 */

import type { MissingDataReason, MissingConversionRatio, MissingDataReport } from './types';

// In-memory storage for missing conversion tracking
// In production, this would be persisted to a database
const missingConversions: Map<string, MissingConversionRatio> = new Map();

// Generate a unique key for card-partner combination
function getKey(card: string, partner: string): string {
  return `${card.toLowerCase()}::${partner.toLowerCase()}`;
}

/**
 * Track a missing conversion ratio attempt
 * @param sourceCard - The card that attempted the conversion
 * @param partnerProgram - The partner program that was requested
 * @param reason - Why the conversion is unavailable
 */
export function trackMissingConversion(
  sourceCard: string,
  partnerProgram: string,
  reason: MissingDataReason
): void {
  const key = getKey(sourceCard, partnerProgram);
  const existing = missingConversions.get(key);

  if (existing) {
    // Update existing entry
    existing.attemptCount++;
    existing.timestamp = new Date();
  } else {
    // Create new entry
    missingConversions.set(key, {
      sourceCard,
      partnerProgram,
      reason,
      timestamp: new Date(),
      attemptCount: 1,
    });
  }

  // Log for analytics (in production, send to analytics service)
  if (process.env.NODE_ENV === 'development') {
    console.debug(`[RewardsEngine] Missing conversion: ${sourceCard} -> ${partnerProgram} (${reason})`);
  }
}

/**
 * Get all tracked missing conversion ratios
 * @returns Array of missing conversion entries
 */
export function getMissingConversionRatios(): MissingConversionRatio[] {
  return Array.from(missingConversions.values());
}

/**
 * Get missing conversions filtered by reason
 * @param reason - Filter by specific reason
 * @returns Filtered array of missing conversions
 */
export function getMissingByReason(reason: MissingDataReason): MissingConversionRatio[] {
  return Array.from(missingConversions.values()).filter((m) => m.reason === reason);
}

/**
 * Generate a comprehensive report of missing data
 * @returns MissingDataReport with aggregated statistics
 */
export function generateMissingDataReport(): MissingDataReport {
  const entries = Array.from(missingConversions.values());

  // Count by card
  const byCard = new Map<string, number>();
  for (const entry of entries) {
    const current = byCard.get(entry.sourceCard) || 0;
    byCard.set(entry.sourceCard, current + entry.attemptCount);
  }

  // Count by partner
  const byPartner = new Map<string, number>();
  for (const entry of entries) {
    const current = byPartner.get(entry.partnerProgram) || 0;
    byPartner.set(entry.partnerProgram, current + entry.attemptCount);
  }

  // Get top missing combinations (sorted by attempt count)
  const topMissing = entries
    .filter((e) => e.reason === 'no_ratio_in_database')
    .sort((a, b) => b.attemptCount - a.attemptCount)
    .slice(0, 10)
    .map((e) => ({
      card: e.sourceCard,
      partner: e.partnerProgram,
      attempts: e.attemptCount,
    }));

  // Generate suggestions based on most requested
  const suggestions: string[] = [];

  // Suggest adding ratios for frequently requested combinations
  if (topMissing.length > 0) {
    suggestions.push(
      `Priority: Add conversion ratios for ${topMissing[0].card} -> ${topMissing[0].partner} (${topMissing[0].attempts} requests)`
    );
  }

  // Suggest expanding card support
  const unsupportedCards = entries.filter((e) => e.reason === 'card_not_supported');
  if (unsupportedCards.length > 0) {
    const cardCounts = new Map<string, number>();
    for (const entry of unsupportedCards) {
      const current = cardCounts.get(entry.sourceCard) || 0;
      cardCounts.set(entry.sourceCard, current + entry.attemptCount);
    }
    const topCard = Array.from(cardCounts.entries()).sort((a, b) => b[1] - a[1])[0];
    if (topCard) {
      suggestions.push(`Consider adding card support for: ${topCard[0]} (${topCard[1]} requests)`);
    }
  }

  // Suggest noting cashback cards
  const cashbackAttempts = entries.filter((e) => e.reason === 'cashback_card');
  if (cashbackAttempts.length > 5) {
    suggestions.push(
      'Users frequently attempt transfers on cashback cards. Consider adding educational UI about card types.'
    );
  }

  return {
    totalMissing: entries.length,
    byCard,
    byPartner,
    suggestions,
    topMissing,
  };
}

/**
 * Get a user-friendly message for why a conversion is unavailable
 * @param sourceCard - The card name
 * @param partnerProgram - The partner program name
 * @param reason - The reason for unavailability
 * @returns User-friendly message string
 */
export function getMissingConversionMessage(
  sourceCard: string,
  partnerProgram: string,
  reason: MissingDataReason
): string {
  switch (reason) {
    case 'cashback_card':
      return `${sourceCard} is a cashback card and does not support point transfers to loyalty programs. Points are redeemed as statement credit or vouchers.`;

    case 'card_not_supported':
      return `Transfer ratio for ${sourceCard} is not yet available in our database. Check your card's reward catalog or contact us to add this data.`;

    case 'partner_not_supported':
      return `${partnerProgram} is not currently in our partner database. We're continuously adding new partners.`;

    case 'no_ratio_in_database':
      return `Transfer ratio for ${sourceCard} → ${partnerProgram} is not yet available. Check your card's reward catalog for the latest transfer options.`;

    default:
      return `Transfer from ${sourceCard} to ${partnerProgram} is not available at this time.`;
  }
}

/**
 * Check if a specific combination has been attempted before
 * @param sourceCard - The card name
 * @param partnerProgram - The partner program
 * @returns The missing entry if exists, null otherwise
 */
export function getMissingEntry(
  sourceCard: string,
  partnerProgram: string
): MissingConversionRatio | null {
  const key = getKey(sourceCard, partnerProgram);
  return missingConversions.get(key) || null;
}

/**
 * Clear all tracked missing conversions (useful for testing)
 */
export function clearMissingConversions(): void {
  missingConversions.clear();
}

/**
 * Get statistics summary for dashboard display
 */
export function getMissingStats(): {
  total: number;
  byReason: Record<MissingDataReason, number>;
  mostRequested: { card: string; partner: string; count: number } | null;
} {
  const entries = Array.from(missingConversions.values());

  const byReason: Record<MissingDataReason, number> = {
    no_ratio_in_database: 0,
    card_not_supported: 0,
    cashback_card: 0,
    partner_not_supported: 0,
  };

  for (const entry of entries) {
    byReason[entry.reason] += entry.attemptCount;
  }

  // Find most requested missing combination
  let mostRequested: { card: string; partner: string; count: number } | null = null;
  let maxCount = 0;

  for (const entry of entries) {
    if (entry.attemptCount > maxCount && entry.reason === 'no_ratio_in_database') {
      maxCount = entry.attemptCount;
      mostRequested = {
        card: entry.sourceCard,
        partner: entry.partnerProgram,
        count: entry.attemptCount,
      };
    }
  }

  return {
    total: entries.reduce((sum, e) => sum + e.attemptCount, 0),
    byReason,
    mostRequested,
  };
}
