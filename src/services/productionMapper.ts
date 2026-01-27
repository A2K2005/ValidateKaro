import { ValidationOutput } from '../types';

export interface SpendingCategoryDefinition {
  category_name: string;
  display_name: string;
  description: string;
  type: number;
  status: number;
  base_reward_value: {
    rewards: {
      tiers: Record<string, string>;
      cash_conversion: number;
      spend_conversion: number;
      category_max_points: string | number;
    };
  } | null;
  base_cashback_value: {
    cb: {
      cb_percentage: number;
      category_max_cap: string | number;
    };
  } | null;
  additional_benefits: Record<string, any> | null;
}

export interface CardSpendingCategory {
  card_id: number;
  spending_category_id: number;
  spend_categories_json: {
    rewards?: {
      tiers: Record<string, string>;
      cash_conversion: number;
      spend_conversion: number;
      category_max_points: string | number;
    };
    cb?: {
      cb_percentage: number;
      category_max_cap: string | number;
    };
  };
  notes: string | null;
  is_grouped: boolean;
  group_id: number | null;
}

export interface CompleteProductionMapping {
  spending_categories: SpendingCategoryDefinition[];
  card_spending_categories: CardSpendingCategory[];
}

interface ParsedRate {
  earn_points: number;
  spend_conversion: number;
  percentage: number;
}

interface CategoryData {
  reward_type: string;
  reward_rate: string;
  caps_limits: string;
  exclusions_conditions: string;
}

// Category ID mapping - Synced with Production DB
const CATEGORY_ID_MAP: Record<string, number> = {
  "flipkart_spends": 1,
  "amazon_spends": 2,
  "grocery_spends_online": 3,
  "online_food_ordering": 4,
  "other_online_spends": 5,
  "other_offline_spends": 6,
  "dining_or_going_out": 7,
  "fuel": 8,
  "school_fees": 9,
  "rent": 10,
  "mobile_phone_bills": 11,
  "electricity_bills": 12,
  "water_bills": 13,
  "ott_channels": 14,
  "hotels_annual": 18,
  "flights_annual": 19,
  "insurance_health_annual": 20,
  "insurance_car_or_bike_annual": 21,
  "large_electronics_purchase_like_mobile_tv_etc": 22,
  "all_pharmacy": 23,
  "domestic_lounge_usage_quarterly": 27,
  "international_lounge_usage_quarterly": 28,
  "offline_grocery": 29,
  "life_insurance": 30,
};

// Display name mapping - Synced with Production DB
const SPEND_KEY_LABELS: Record<string, string> = {
  "flipkart_spends": "Flipkart Spends",
  "amazon_spends": "Amazon Spends",
  "grocery_spends_online": "Online Grocery",
  "online_food_ordering": "Food Delivery Apps",
  "other_online_spends": "Other Online Shopping",
  "other_offline_spends": "Offline Spends",
  "dining_or_going_out": "Dining or Going Out",
  "fuel": "Fuel",
  "school_fees": "School Fees",
  "rent": "Rent",
  "mobile_phone_bills": "Mobile/Internet Bills",
  "electricity_bills": "Electricity Bills",
  "water_bills": "Water Bills",
  "ott_channels": "OTT Channels",
  "hotels_annual": "Annual Hotel Stays",
  "flights_annual": "Annual Flight Spends",
  "insurance_health_annual": "Annual Health Insurance",
  "insurance_car_or_bike_annual": "Annual Vehicle Insurance",
  "large_electronics_purchase_like_mobile_tv_etc": "Electronics Purchase",
  "all_pharmacy": "Pharmacy Spends",
  "domestic_lounge_usage_quarterly": "Domestic Airport Lounges",
  "international_lounge_usage_quarterly": "International Airport Lounges",
  "offline_grocery": "Offline Grocery",
  "life_insurance": "Life Insurance",
};

export function mapToCompleteProductionFormat(
  extractedData: ValidationOutput,
  cardId: number
): CompleteProductionMapping {
  const spendingCategories: SpendingCategoryDefinition[] = [];
  const cardSpendingCategories: CardSpendingCategory[] = [];
  
  Object.entries(extractedData.categories).forEach(([categoryKey, data]) => {
    // Cast to CategoryData to satisfy strict typing
    const categoryData = data as unknown as CategoryData;
    
    if (categoryData.reward_type === 'N/A') return;
    
    // 1. Create spending_category definition
    spendingCategories.push(
      createSpendingCategoryDefinition(categoryKey, categoryData)
    );
    
    // 2. Create card_spending_category (card-specific values)
    cardSpendingCategories.push(
      createCardSpendingCategory(categoryKey, categoryData, cardId)
    );
  });
  
  return {
    spending_categories: spendingCategories,
    card_spending_categories: cardSpendingCategories
  };
}

function createSpendingCategoryDefinition(
  categoryKey: string,
  data: CategoryData
): SpendingCategoryDefinition {
  const parsed = parseRewardRate(data.reward_rate);
  const isCashback = data.reward_type === 'Cashback';
  
  return {
    category_name: categoryKey,
    display_name: SPEND_KEY_LABELS[categoryKey] || formatDisplayName(categoryKey),
    description: data.exclusions_conditions || "",
    type: 1, // Regular spending category
    status: 1, // Active
    
    // Base reward value (generic/default for this category)
    base_reward_value: isCashback ? null : {
      rewards: {
        tiers: { "1": "0-Unlimited" },
        cash_conversion: 0.1, // Generic default
        spend_conversion: 200, // Generic default
        category_max_points: "Unlimited"
      }
    },
    
    // Base cashback value (if cashback category)
    base_cashback_value: isCashback ? {
      cb: {
        cb_percentage: parsed.percentage || 1,
        category_max_cap: "Unlimited"
      }
    } : null,
    
    // Additional benefits (lounge, waivers, etc.)
    additional_benefits: extractAdditionalBenefits(data)
  };
}

function createCardSpendingCategory(
  categoryKey: string,
  data: CategoryData,
  cardId: number
): CardSpendingCategory {
  const parsed = parseRewardRate(data.reward_rate);
  const tiers = buildTiers(data.caps_limits, data.reward_rate);
  const isCashback = data.reward_type === 'Cashback';
  
  return {
    card_id: cardId,
    spending_category_id: getCategoryId(categoryKey),
    
    // Card-specific rewards/cashback
    spend_categories_json: isCashback ? {
      cb: {
        cb_percentage: parsed.percentage || 0,
        category_max_cap: getMaxPoints(data.caps_limits, parsed)
      }
    } : {
      rewards: {
        tiers: tiers,
        cash_conversion: getCashConversion(data.reward_type, parsed),
        spend_conversion: parsed.spend_conversion,
        category_max_points: getMaxPoints(data.caps_limits, parsed)
      }
    },
    
    notes: buildNotes(data),
    is_grouped: false,
    group_id: null
  };
}

// Build tiers - handles both single and multi-tier
function buildTiers(
  capsLimits: string,
  rewardRate: string
): Record<string, string> {
  const text = (rewardRate + ' ' + capsLimits).toLowerCase();
  const tiers: Record<string, string> = {};
  
  // Pattern 1: Multi-tier (e.g., "12 points up to 150000, then 35 points")
  const multiTierMatch = text.match(/(\d+)\s*(?:edge\s+)?points?[^,]*?(?:up\s+to|upto)[^\d]*(\d+)[^\d]*(?:then|thereafter|above)[^\d]*(\d+)\s*(?:edge\s+)?points?/i);
  
  if (multiTierMatch) {
    const [_, tier1Points, tier1Limit, tier2Points] = multiTierMatch;
    tiers[tier1Points] = `0-${tier1Limit}`;
    tiers[tier2Points] = `${tier1Limit}-Unlimited`;
    return tiers;
  }
  
  // Pattern 2: Single tier with limit
  const pointsMatch = rewardRate.match(/(\d+(?:\.\d+)?)\s*(?:edge\s+)?points?/i);
  const limitMatch = capsLimits.match(/(?:up\s+to|limit|cap)[^\d]*(?:₹|Rs\.?|INR)?\s*(\d+)/i);
  
  if (pointsMatch) {
    const earnPoints = pointsMatch[1];
    if (limitMatch) {
      tiers[earnPoints] = `0-${limitMatch[1]}`;
    } else if (/unlimited/i.test(capsLimits)) {
      tiers[earnPoints] = "0-Unlimited";
    } else {
      tiers[earnPoints] = "0-Unlimited";
    }
  }
  
  return Object.keys(tiers).length > 0 ? tiers : { "1": "0-Unlimited" };
}

function parseRewardRate(rewardRate: string): ParsedRate {
  const pointsMatch = rewardRate.match(/(\d+(?:\.\d+)?)\s*(?:edge\s+)?(?:reward\s+)?points?/i);
  const spendMatch = rewardRate.match(/(?:per|\/)\s*(?:₹|Rs\.?|INR)?\s*([0-9,]+(?:\.\d+)?)/i);
  const percentMatch = rewardRate.match(/(\d+(?:\.\d+)?)\s*%/);
  
  return {
    earn_points: pointsMatch ? parseFloat(pointsMatch[1]) : 0,
    spend_conversion: spendMatch ? parseFloat(spendMatch[1].replace(/,/g, '')) : 200, // Default spend basis to 200 if missing, safer than 0
    percentage: percentMatch ? parseFloat(percentMatch[1]) : 0
  };
}

function getCashConversion(rewardType: string, parsed: ParsedRate): number {
  if (rewardType === 'Cashback') return 1.0;
  if (rewardType === 'Reward Points') return 0.2; // Default conservative
  if (rewardType === 'Miles') return 0.4;
  if (rewardType === 'Complimentary') return 0.0;
  return 0.2;
}

function getMaxPoints(
  capsLimits: string,
  parsed: ParsedRate
): string | number {
  if (!capsLimits || /unlimited|no\s*cap/i.test(capsLimits)) return "Unlimited";
  
  // Monthly/annual cap in currency
  const capMatch = capsLimits.match(/(?:monthly|annual|per\s+month)\s+cap[^\d]*(?:₹|Rs\.?|INR)?\s*([0-9,]+)/i);
  if (capMatch) {
    const capAmount = parseFloat(capMatch[1].replace(/,/g, ''));
    
    // If it's percentage based cashback, the cap usually refers to the MAX CASHBACK amount directly
    if (parsed.percentage > 0) {
      return capAmount; 
    }

    // If points based, calculate total points
    if (parsed.earn_points && parsed.spend_conversion) {
      return Math.floor((capAmount / parsed.spend_conversion) * parsed.earn_points);
    }
  }
  
  // Direct points cap
  const pointsCapMatch = capsLimits.match(/(?:max|maximum|cap)[^\d]*(\d+)\s*points?/i);
  if (pointsCapMatch) {
    return parseInt(pointsCapMatch[1]);
  }
  
  // Fallback: If we found a number but couldn't parse it as points or calculated limit
  // return the number itself if it looks like a limit
  if (capMatch) {
      return parseFloat(capMatch[1].replace(/,/g, ''));
  }

  return "Unlimited";
}

function buildNotes(data: CategoryData): string | null {
  const parts: string[] = [];
  
  if (data.caps_limits && !/unlimited|none|n\/a/i.test(data.caps_limits)) {
    parts.push(`Cap: ${data.caps_limits}`);
  }
  
  if (data.exclusions_conditions && !/none|n\/a/i.test(data.exclusions_conditions)) {
    parts.push(`Exclusions: ${data.exclusions_conditions}`);
  }
  
  return parts.length > 0 ? parts.join('. ') : null;
}

function extractAdditionalBenefits(data: CategoryData): Record<string, any> | null {
  const benefits: Record<string, any> = {};
  const text = (data.reward_rate + ' ' + data.caps_limits + ' ' + data.exclusions_conditions).toLowerCase();
  
  // Lounge access - Check text OR if the category implies lounge
  // We don't have category key here easily unless we pass it, but we can look for "visits"
  if (/lounge/i.test(text) || /visits?/i.test(text)) {
    const countMatch = text.match(/(\d+)\s*(?:complimentary|free)?\s*(?:lounge\s+)?(?:visits?|access)/i);
    const unlimitedMatch = /unlimited\s*(?:visits?|access|lounge)/i.test(text);
    
    if (unlimitedMatch) {
      benefits.lounge_access = "Unlimited";
    } else if (countMatch) {
      benefits.lounge_access = countMatch[1];
    } else if (/unlimited/i.test(text)) {
       // If "Unlimited" appears but we didn't find specific "Unlimited visits", 
       // but we ALSO didn't find a specific count, we assume Unlimited.
       // However, if we found a count (like "4 visits"), we shouldn't let a generic "Unlimited" (e.g. in exclusions) override it.
       // The previous logic failed because "Unlimited" in caps_limits overrode the "4" in reward_rate.
       benefits.lounge_access = "Unlimited";
    } else {
       benefits.lounge_access = "Available";
    }
  }
  
  // Surcharge waiver
  if (/surcharge.*waiver/i.test(text)) {
    const waiverMatch = text.match(/(\d+%?)[^\n.]*waiver/i);
    benefits.surcharge_waiver = waiverMatch ? waiverMatch[1] : "Available";
  }
  
  // Fuel surcharge waiver
  if (/fuel.*surcharge/i.test(text)) {
    benefits.fuel_surcharge_waiver = "Available";
  }
  
  return Object.keys(benefits).length > 0 ? benefits : null;
}

function formatDisplayName(categoryKey: string): string {
  return categoryKey
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getCategoryId(categoryKey: string): number {
  return CATEGORY_ID_MAP[categoryKey] || 0; // 0 indicates missing mapping
}
