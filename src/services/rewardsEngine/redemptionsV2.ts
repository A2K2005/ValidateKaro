/**
 * Redemptions Service V2 - Bank-Centric Smart Lookup
 * 
 * Implements the 3-Layer Fallback Strategy:
 * 1. Exact Card Match (e.g. "axis_magnus_burgundy")
 * 2. Fuzzy Keyword Match (e.g. "magnus" -> "AXIS_MAGNUS")
 * 3. Bank-Level Default (e.g. "Axis Bank" -> "AXIS_MAGNUS" list)
 */

import partnerDataV2 from '../../../card_partners_v2.json';
import {
    PartnerConversionOption,
    PartnerPointsResult
} from './types';

// Types for V2 JSON Structure
type PartnerRatio = {
    ratio: string;
    min?: number;
    note?: string;
    group?: string; // For capped partners like Axis Atlas
};

type CardConfig = {
    card_name: string;
    card_type: string;
    currency: string;
    default_ratio: string;
    note: string;
    partners: {
        airlines_domestic: Record<string, PartnerRatio>;
        airlines_international: Record<string, PartnerRatio>;
        hotels: Record<string, PartnerRatio>;
        vouchers?: Record<string, PartnerRatio>;
    };
};

type BankConfig = {
    bank_name: string;
    program_name: string;
    cards: Record<string, CardConfig>;
};

type PartnerValuation = {
    name: string;
    value_inr: number;
    value_usd?: number;
};

type ValuationsConfig = {
    airlines: Record<string, PartnerValuation>;
    hotels: Record<string, PartnerValuation>;
};

// Type assertion
const v2Data = partnerDataV2 as any;
const BANKS = v2Data.banks as Record<string, BankConfig>;
const VALUATIONS = v2Data.partner_valuations as ValuationsConfig;

/**
 * Normalize input string to snake_case key
 */
function normalizeKey(input: string): string {
    return input
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
}

/**
 * Smart Lookup: Determines which JSON Card Key to use
 */
function resolveCardKey(cardName: string): { bankKey: string; cardKey: string } | null {
    const norm = normalizeKey(cardName);

    // --- Layer 1: Bank Identification ---
    let bankKey = '';
    if (norm.includes('axis')) bankKey = 'AXIS_BANK';
    else if (norm.includes('hdfc')) bankKey = 'HDFC_BANK';
    else if (norm.includes('amex') || norm.includes('american_express')) bankKey = 'AMERICAN_EXPRESS';
    else if (norm.includes('sbi')) bankKey = 'SBI_CARD';
    else if (norm.includes('au_') || norm.includes('au_small')) bankKey = 'AU_BANK';
    else if (norm.includes('yes_')) bankKey = 'YES_BANK';
    else if (norm.includes('indusind')) bankKey = 'INDUSIND_BANK';
    else if (norm.includes('icici')) bankKey = 'ICICI_BANK';

    if (!bankKey || !BANKS[bankKey]) return null;

    const bankData = BANKS[bankKey];
    const cards = bankData.cards;

    // --- Layer 2: Exact/Fuzzy Card Match ---
    // Iterate through all defined cards for this bank to find a match
    for (const [key, config] of Object.entries(cards)) {
        // 1. Exact key match (e.g. axis_magnus_burgundy)
        if (key.toLowerCase() === norm) return { bankKey, cardKey: key };

        // 2. Name containment (e.g. "Magnus Burgundy" inside "Axis Magnus Burgundy")
        const cleanConfigName = normalizeKey(config.card_name);
        // Remove bank name from config name to avoid false positives (e.g. "axis")
        const specificKeyword = cleanConfigName.replace('axis', '').replace('hdfc', '').replace('bank', '').trim();

        if (specificKeyword && norm.includes(specificKeyword)) {
            return { bankKey, cardKey: key };
        }
    }

    // --- Layer 3: Bank Default (Fallback) ---
    // If we know the bank but can't find the card, pick the "Flagship" or most representative card
    // This ensures we show SOME partners instead of empty state.
    const defaults: Record<string, string> = {
        'AXIS_BANK': 'AXIS_MAGNUS', // Most common transfer partners
        'HDFC_BANK': 'HDFC_REGALIA_GOLD', // Standard 2:1 mapping
        'AMERICAN_EXPRESS': 'AMEX_MRCC', // Standard MR mapping
        'SBI_CARD': 'SBI_MILES_PRIME',
        'AU_BANK': 'AU_ZENITH',
        'INDUSIND_BANK': 'INDUSIND_LEGEND'
    };

    if (defaults[bankKey] && cards[defaults[bankKey]]) {
        console.warn(`[SmartLookup] distinct card not found for "${cardName}". Falling back to ${defaults[bankKey]}`);
        return { bankKey, cardKey: defaults[bankKey] };
    }

    return null;
}

/**
 * Get all partner conversion options for a card
 */
export function getPartnerConversionsV2(
    earnedPoints: number,
    cardName: string
): PartnerConversionOption[] {
    const resolved = resolveCardKey(cardName);
    if (!resolved) return [];

    const { bankKey, cardKey } = resolved;
    const bankData = BANKS[bankKey];
    const cards = bankData.cards;
    const cardData = cards[cardKey];

    if (!cardData || !cardData.partners) return [];

    const options: PartnerConversionOption[] = [];

    // Helper to process a partner category
    const processCategory = (
        categoryName: string,
        partnersArgs: Record<string, PartnerRatio>,
        subCategory?: string
    ) => {
        Object.entries(partnersArgs).forEach(([partnerId, ratioData]) => {
            // Parse Ratio "5:4" -> bank=5, partner=4
            const [bankReq, partnerGet] = ratioData.ratio.split(':').map(Number);

            if (!bankReq || !partnerGet) return;

            // Calculate outcome
            // Formula: (Points / BankReq) * PartnerGet
            const transferAmount = Math.floor(earnedPoints * (partnerGet / bankReq));

            // Get Valuation Data
            let valuation = null;
            let displayRef = null;

            // Try finding in airlines or hotels
            if (VALUATIONS.airlines[partnerId]) valuation = VALUATIONS.airlines[partnerId];
            else if (VALUATIONS.hotels[partnerId]) valuation = VALUATIONS.hotels[partnerId];

            if (valuation) {
                const estValueINR = transferAmount * (valuation.value_inr || 0);
                displayRef = {
                    estimatedValueINR: estValueINR,
                    estimatedValueUSD: null,
                    notes: `~ ₹${valuation.value_inr}/pt`,
                    warning: ''
                };
            }

            options.push({
                partnerId,
                partnerName: valuation?.name || partnerId.replace(/_/g, ' ').toUpperCase(),
                category: categoryName as any,
                subCategory: subCategory as any,
                conversionRatio: ratioData.ratio,
                bankPointsRequired: earnedPoints,
                partnerPointsEarned: transferAmount,
                minimumPointsRequired: ratioData.min || 0,
                canConvert: earnedPoints >= (ratioData.min || 0),
                insufficientPoints: earnedPoints < (ratioData.min || 0),
                partnerPointsType: 'Points', // Simplified for V2
                displayReference: displayRef
            });
        });
    };

    // Process all categories
    if (cardData.partners.airlines_domestic)
        processCategory('airline', cardData.partners.airlines_domestic, 'Domestic');

    if (cardData.partners.airlines_international)
        processCategory('airline', cardData.partners.airlines_international, 'International');

    if (cardData.partners.hotels)
        processCategory('hotel', cardData.partners.hotels);

    if (cardData.partners.vouchers)
        processCategory('voucher', cardData.partners.vouchers);

    // CRITICAL: If card matched but has no partners, check if it's cashback or rewards
    if (options.length === 0) {
        // If it's a cashback card, return empty - cashback cards don't have loyalty programs
        if (cardData.card_type === 'cashback') {
            console.warn(`[SmartLookup] Card "${cardName}" is a cashback card - no partner transfers available`);
            return [];
        }
        
        // For rewards cards with no partners, fallback to bank default
        const defaults: Record<string, string> = {
            'AXIS_BANK': 'AXIS_MAGNUS',
            'HDFC_BANK': 'HDFC_REGALIA_GOLD',
            'AMERICAN_EXPRESS': 'AMEX_MRCC',
            'SBI_CARD': 'SBI_MILES_PRIME',
            'AU_BANK': 'AU_ZENITH',
            'INDUSIND_BANK': 'INDUSIND_LEGEND'
        };
        
        const defaultCardKey = defaults[bankKey];
        // Only fallback if: (1) default exists, (2) it's different from current card, (3) default card has partners
        if (defaultCardKey && defaultCardKey !== cardKey && cards[defaultCardKey]) {
            const defaultCardData = cards[defaultCardKey];
            // Check if default card has any partners
            const hasPartners = defaultCardData.partners && (
                Object.keys(defaultCardData.partners.airlines_domestic || {}).length > 0 ||
                Object.keys(defaultCardData.partners.airlines_international || {}).length > 0 ||
                Object.keys(defaultCardData.partners.hotels || {}).length > 0 ||
                Object.keys(defaultCardData.partners.vouchers || {}).length > 0
            );
            
            if (hasPartners) {
                console.warn(`[SmartLookup] Card "${cardName}" has no partners. Falling back to ${defaultCardKey}`);
                // Process default card's partners
                if (defaultCardData.partners.airlines_domestic)
                    processCategory('airline', defaultCardData.partners.airlines_domestic, 'Domestic');
                if (defaultCardData.partners.airlines_international)
                    processCategory('airline', defaultCardData.partners.airlines_international, 'International');
                if (defaultCardData.partners.hotels)
                    processCategory('hotel', defaultCardData.partners.hotels);
                if (defaultCardData.partners.vouchers)
                    processCategory('voucher', defaultCardData.partners.vouchers);
            }
        }
    }

    return options;
}

/**
 * Get Total Estimated Value (Best Case)
 */
export function getBestValueV2(points: number, cardName: string) {
    const options = getPartnerConversionsV2(points, cardName);
    if (!options.length) return null;

    return options.reduce((best, current) => {
        const currVal = current.displayReference?.estimatedValueINR || 0;
        const bestVal = best.displayReference?.estimatedValueINR || 0;
        return currVal > bestVal ? current : best;
    }, options[0]);
}

/**
 * UTILITY MIGRATION: Replacement functions for legacy redemptions.ts
 */

/**
 * Get card type (rewards vs cashback)
 */
export function getCardType(cardName: string): 'rewards' | 'cashback' | null {
    const resolved = resolveCardKey(cardName);

    // 1. If found in JSON, trust the defined type
    if (resolved) {
        const { bankKey, cardKey } = resolved;
        const cardConfig = BANKS[bankKey]?.cards[cardKey];
        if (cardConfig?.card_type) {
            return cardConfig.card_type as 'rewards' | 'cashback';
        }
    }

    // 2. Heuristic Fallback: Detect "Cashback" or known cashback keywords in the name
    const lowerName = normalizeKey(cardName);
    if (lowerName.includes('cashback') || lowerName.includes('swiggy') || lowerName.includes('flipkart') || lowerName.includes('amazon')) {
        return 'cashback';
    }

    // Default to rewards if ambiguous (to show partners by default)
    return 'rewards'; // Default to rewards for V2 mapped cards
}

/**
 * Get partner points type display name (e.g., "Club Vistara Points")
 */
export function getPartnerPointsType(partnerId: string): string {
    // Try to find in valuations first
    if (VALUATIONS.airlines[partnerId]) return `${VALUATIONS.airlines[partnerId].name} Points`;
    if (VALUATIONS.hotels[partnerId]) return `${VALUATIONS.hotels[partnerId].name} Points`;

    // Fallback logic
    const cleanId = partnerId.toLowerCase();
    if (cleanId.includes('avios')) return 'Avios';
    if (cleanId.includes('miles')) return 'Miles';
    if (cleanId.includes('bonvoy')) return 'Bonvoy Points';

    return 'Points';
}

/**
 * Get all available partner programs
 */
export function getAllPartners() {
    const partners = [];

    // Airlines
    Object.entries(VALUATIONS.airlines).forEach(([id, val]) => {
        partners.push({
            partnerId: id,
            partnerName: val.name,
            category: 'airline',
            subCategory: null
        });
    });

    // Hotels
    Object.entries(VALUATIONS.hotels).forEach(([id, val]) => {
        partners.push({
            partnerId: id,
            partnerName: val.name,
            category: 'hotel',
            subCategory: null
        });
    });

    return partners;
}

/**
 * Get all transferable cards (keys from V2 JSON)
 */
export function getTransferableCards(): string[] {
    const cards: string[] = [];
    Object.values(BANKS).forEach(bank => {
        Object.keys(bank.cards).forEach(cardKey => {
            cards.push(cardKey);
        });
    });
    return cards;
}

/**
 * Check if a card can transfer to a specific partner
 */
export function canTransferTo(cardName: string, partnerId: string): boolean {
    const options = getPartnerConversionsV2(1000, cardName); // Dummy points to check eligibility
    return options.some(opt => opt.partnerId === partnerId);
}
