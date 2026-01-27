
import { SpendKey } from './types';

export const SPEND_KEY_LABELS: Record<SpendKey, string> = {
  [SpendKey.AMAZON_SPENDS]: 'Amazon Purchases',
  [SpendKey.FLIPKART_SPENDS]: 'Flipkart Purchases',
  [SpendKey.OTHER_ONLINE_SPENDS]: 'Other Online Shopping',
  [SpendKey.GROCERY_SPENDS_ONLINE]: 'Online Grocery Shopping',
  [SpendKey.ONLINE_FOOD_ORDERING]: 'Food Delivery Apps',
  [SpendKey.MOBILE_PHONE_BILLS]: 'Mobile Phone Bills',
  [SpendKey.ELECTRICITY_BILLS]: 'Electricity Bills',
  [SpendKey.WATER_BILLS]: 'Water Bills',
  [SpendKey.FUEL]: 'Fuel',
  [SpendKey.DINING_OR_GOING_OUT]: 'Restaurants and Dining',
  [SpendKey.FLIGHTS_ANNUAL]: 'Flight Bookings (Annual)',
  [SpendKey.HOTELS_ANNUAL]: 'Hotel Bookings (Annual)',
  [SpendKey.DOMESTIC_LOUNGE_USAGE_QUARTERLY]: 'Domestic Lounge Access',
  [SpendKey.INTERNATIONAL_LOUNGE_USAGE_QUARTERLY]: 'International Lounge Access',
  [SpendKey.INSURANCE_HEALTH_ANNUAL]: 'Health Insurance (Annual)',
  [SpendKey.INSURANCE_CAR_OR_BIKE_ANNUAL]: 'Car / Bike Insurance (Annual)',
  [SpendKey.RENT]: 'Rent Payments',
  [SpendKey.SCHOOL_FEES]: 'School Fees',
  [SpendKey.OTHER_OFFLINE_SPENDS]: 'Offline Shopping (Stores/POS)',
  // Additional Production DB Categories
  [SpendKey.OTT_CHANNELS]: 'OTT Subscriptions (Netflix, Prime, etc.)',
  [SpendKey.ELECTRONICS_PURCHASE]: 'Electronics Purchase (Mobile, TV, etc.)',
  [SpendKey.PHARMACY]: 'Pharmacy & Medical',
  [SpendKey.OFFLINE_GROCERY]: 'Offline Grocery Shopping',
  [SpendKey.LIFE_INSURANCE]: 'Life Insurance (Annual)',
};

export const CANONICAL_KEYS = Object.values(SpendKey);

export const CONFIDENCE_FORMULA = {
  MISSING_CATEGORY: -5,
  MISSING_REQUIRED_FIELD: -3,
  AMBIGUOUS_CAP: -2,
  NO_SOURCE: -10,
  GLM_LOW_CONFIDENCE: -5,
};
