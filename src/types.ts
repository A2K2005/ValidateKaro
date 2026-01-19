
export type RewardType = 'Cashback' | 'Reward Points' | 'Miles' | 'N/A';

export interface CategoryFields {
  reward_type: RewardType;
  reward_rate: string;
  caps_limits: string;
  exclusions_conditions: string;
  source_in_mitc: string;
  document_reference: string;
  verification_date: string;
  confidence: number;
}

export interface ValidationIssue {
  key: string;
  label: string;
  confidence: number;
  description: string;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ValidationOutput {
  categories: Record<string, CategoryFields>;
  token_usage?: TokenUsage;
}

export type ProcessStatus = 'processing' | 'approved' | 'review_required' | 'rejected' | 'failed';

export interface AuditLog {
  timestamp: string;
  action: string;
  details: string;
  status: 'success' | 'error' | 'info';
}

export interface ValidationProcess {
  process_id: string;
  card_id: string;
  card_name: string;
  bank_name: string;
  status: ProcessStatus;
  storage_path: string;
  confidence_score: number;
  approval_gate: 'Production Ready' | 'Blocked' | 'Must Re-run';
  data?: ValidationOutput;
  issues: ValidationIssue[];
  logs: AuditLog[];
  timestamp: string;
}

export interface ActiveJob {
  id: string;
  cardName: string;
  bankName: string;
  progress: number;
  status: 'uploading' | 'extracting' | 'validating';
}

export enum SpendKey {
  AMAZON_SPENDS = 'amazon_spends',
  FLIPKART_SPENDS = 'flipkart_spends',
  OTHER_ONLINE_SPENDS = 'other_online_spends',
  GROCERY_SPENDS_ONLINE = 'grocery_spends_online',
  ONLINE_FOOD_ORDERING = 'online_food_ordering',
  MOBILE_PHONE_BILLS = 'mobile_phone_bills',
  ELECTRICITY_BILLS = 'electricity_bills',
  WATER_BILLS = 'water_bills',
  FUEL = 'fuel',
  DINING_OR_GOING_OUT = 'dining_or_going_out',
  FLIGHTS_ANNUAL = 'flights_annual',
  HOTELS_ANNUAL = 'hotels_annual',
  DOMESTIC_LOUNGE_USAGE_QUARTERLY = 'domestic_lounge_usage_quarterly',
  INTERNATIONAL_LOUNGE_USAGE_QUARTERLY = 'international_lounge_usage_quarterly',
  INSURANCE_HEALTH_ANNUAL = 'insurance_health_annual',
  INSURANCE_CAR_OR_BIKE_ANNUAL = 'insurance_car_or_bike_annual',
  RENT = 'rent',
  SCHOOL_FEES = 'school_fees',
  OTHER_OFFLINE_SPENDS = 'other_offline_spends',
}
