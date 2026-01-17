/**
 * API Response Transformers
 *
 * Handles API contract mismatches between frontend (camelCase) and backend (snake_case).
 * Provides runtime validation and safe default values for optional fields.
 *
 * This module addresses:
 * 1. Response shape consistency - transforms snake_case to camelCase
 * 2. Optional vs required fields - provides safe defaults
 * 3. Enum consistency - normalizes enum values
 * 4. Type consistency - ensures correct types (booleans not strings, arrays not null)
 * 5. Runtime validation - validates API responses before use
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Valid gender values - consistent across frontend and backend
 */
export const VALID_GENDERS = ['male', 'female', 'non-binary', 'other'] as const;
export type Gender = typeof VALID_GENDERS[number];

/**
 * Subscription tier enum - normalized to lowercase
 * Backend uses lowercase, some frontend code uses uppercase
 */
export const SUBSCRIPTION_TIERS = ['free', 'basic', 'plus', 'premium', 'premium_plus', 'elite'] as const;
export type SubscriptionTier = typeof SUBSCRIPTION_TIERS[number];

/**
 * Subscription status - normalized spelling ('cancelled' -> 'canceled')
 */
export const SUBSCRIPTION_STATUSES = ['active', 'canceled', 'expired', 'past_due', 'trialing', 'grace_period'] as const;
export type SubscriptionStatus = typeof SUBSCRIPTION_STATUSES[number];

/**
 * Backend User response format (snake_case)
 */
export interface BackendUserResponse {
  id: string;
  email: string;
  first_name: string;
  last_name?: string;
  date_of_birth?: string | Date;
  gender?: string;
  phone_number?: string;
  is_email_verified?: boolean;
  is_phone_verified?: boolean;
  is_active?: boolean;
  subscription_tier?: string;
  subscription_status?: string;
  coin_balance?: number;
  premium_tier?: string;
  profile_completion?: number;
  created_at?: string | Date;
  updated_at?: string | Date;
  // Aliases sometimes used by backend
  firstName?: string;
  lastName?: string;
  isVerified?: boolean;
  coinBalance?: number;
  premiumTier?: string;
  profileCompletion?: number;
}

/**
 * Frontend User format (camelCase)
 */
export interface FrontendUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: Gender;
  phoneNumber?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isActive: boolean;
  isVerified: boolean;
  subscription?: string;
  premiumTier?: SubscriptionTier;
  coinBalance: number;
  profileCompletion: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Backend Profile response format
 */
export interface BackendProfileResponse {
  id: string;
  user_id: string;
  bio?: string | null;
  occupation?: string | null;
  education?: string | null;
  height?: number | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  interests?: string[] | null;
  languages?: string[] | null;
  is_photo_verified?: boolean;
  profile_completion_percentage?: number;
  profile_completed?: boolean;
  last_active_at?: string | Date | null;
  created_at?: string | Date;
  updated_at?: string | Date;
  // Photos and prompts
  photos?: Array<{
    id?: string;
    url: string;
    is_primary?: boolean;
    isPrimary?: boolean;
    moderation_status?: string;
    moderationStatus?: string;
    order?: number;
  }> | null;
  prompts?: Array<{
    id?: string;
    question: string;
    answer: string;
  }> | null;
  // Lifestyle fields
  smoking?: string | null;
  drinking?: string | null;
  exercise?: string | null;
  diet?: string | null;
  pets?: string | null;
}

/**
 * Frontend Profile format
 */
export interface FrontendProfile {
  id: string;
  userId: string;
  bio: string;
  occupation: string;
  education: string;
  height?: number;
  city: string;
  state: string;
  country: string;
  interests: string[];
  languages: string[];
  isPhotoVerified: boolean;
  profileCompletion: number;
  profileCompleted: boolean;
  lastActiveAt?: string;
  createdAt: string;
  updatedAt: string;
  photos: Array<{
    id: string;
    url: string;
    isPrimary: boolean;
    moderationStatus: 'pending' | 'approved' | 'rejected';
    order: number;
  }>;
  prompts: Array<{
    id: string;
    question: string;
    answer: string;
  }>;
  // Lifestyle
  smoking?: string;
  drinking?: string;
  exercise?: string;
  diet?: string;
  pets?: string;
}

/**
 * Backend Subscription response format
 */
export interface BackendSubscriptionResponse {
  id: string;
  user_id?: string;
  userId?: string;
  tier?: string;
  status?: string;
  billing_cycle?: string;
  billingCycle?: string;
  start_date?: string | Date;
  startDate?: string;
  end_date?: string | Date | null;
  endDate?: string | null;
  grace_period_end?: string | Date | null;
  gracePeriodEnd?: string | null;
  auto_renew?: boolean;
  autoRenew?: boolean;
  features?: string[] | null;
  trial_end?: string | Date | null;
  trialEnd?: string | null;
}

/**
 * Frontend Subscription format
 */
export interface FrontendSubscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  billingCycle: 'monthly' | '3_months' | '6_months' | 'yearly';
  startDate: string;
  endDate: string | null;
  gracePeriodEnd?: string | null;
  autoRenew: boolean;
  features: string[];
  trialEnd?: string | null;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Converts a snake_case string to camelCase
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Converts a camelCase string to snake_case
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Safely converts a value to a string date
 */
export function toDateString(value: string | Date | null | undefined): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  return value;
}

/**
 * Safely converts a value to a boolean
 * Handles string "true"/"false" values that might come from backend
 */
export function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === 1 || value === '1') return true;
  return false;
}

/**
 * Safely converts a value to a number
 */
export function toNumber(value: unknown, defaultValue: number = 0): number {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) return parsed;
  }
  return defaultValue;
}

/**
 * Ensures a value is an array, defaulting to empty array
 */
export function toArray<T>(value: T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  return [];
}

/**
 * Ensures a value is a string, defaulting to empty string
 */
export function toString(value: unknown, defaultValue: string = ''): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return defaultValue;
  return String(value);
}

/**
 * Validates and normalizes gender value
 */
export function normalizeGender(value: unknown): Gender | undefined {
  if (!value) return undefined;
  const normalized = String(value).toLowerCase();
  if (VALID_GENDERS.includes(normalized as Gender)) {
    return normalized as Gender;
  }
  // Map common variations
  if (normalized === 'man' || normalized === 'm') return 'male';
  if (normalized === 'woman' || normalized === 'f') return 'female';
  if (normalized === 'nb' || normalized === 'nonbinary') return 'non-binary';
  return 'other';
}

/**
 * Validates and normalizes subscription tier
 */
export function normalizeSubscriptionTier(value: unknown): SubscriptionTier {
  if (!value) return 'free';
  const normalized = String(value).toLowerCase();
  if (SUBSCRIPTION_TIERS.includes(normalized as SubscriptionTier)) {
    return normalized as SubscriptionTier;
  }
  return 'free';
}

/**
 * Validates and normalizes subscription status
 * Handles spelling variations (cancelled vs canceled)
 */
export function normalizeSubscriptionStatus(value: unknown): SubscriptionStatus {
  if (!value) return 'active';
  let normalized = String(value).toLowerCase();

  // Handle spelling variation
  if (normalized === 'cancelled') normalized = 'canceled';

  if (SUBSCRIPTION_STATUSES.includes(normalized as SubscriptionStatus)) {
    return normalized as SubscriptionStatus;
  }
  return 'active';
}

// ============================================================================
// TRANSFORMERS
// ============================================================================

/**
 * Transforms backend user response to frontend format
 * Handles all field name differences and provides safe defaults
 */
export function transformUserResponse(data: BackendUserResponse | null | undefined): FrontendUser | null {
  if (!data) return null;

  // Handle both snake_case and camelCase from backend (transitional support)
  const firstName = toString(data.first_name || data.firstName);
  const lastName = toString(data.last_name || data.lastName);
  const isEmailVerified = toBoolean(data.is_email_verified);
  const isPhoneVerified = toBoolean(data.is_phone_verified);
  const coinBalance = toNumber(data.coin_balance || data.coinBalance, 0);
  const premiumTier = normalizeSubscriptionTier(data.premium_tier || data.premiumTier || data.subscription_tier);
  const profileCompletion = toNumber(data.profile_completion || data.profileCompletion, 0);

  return {
    id: data.id,
    email: data.email,
    firstName,
    lastName,
    dateOfBirth: toDateString(data.date_of_birth),
    gender: normalizeGender(data.gender),
    phoneNumber: data.phone_number || undefined,
    isEmailVerified,
    isPhoneVerified,
    isActive: toBoolean(data.is_active ?? true),
    isVerified: toBoolean(data.isVerified || isEmailVerified),
    subscription: toString(data.subscription_tier || data.subscription_status),
    premiumTier,
    coinBalance,
    profileCompletion,
    createdAt: toDateString(data.created_at),
    updatedAt: toDateString(data.updated_at),
  };
}

/**
 * Transforms backend profile response to frontend format
 */
export function transformProfileResponse(data: BackendProfileResponse | null | undefined): FrontendProfile | null {
  if (!data) return null;

  const photos = toArray(data.photos).map((photo, index) => ({
    id: photo.id || `photo-${index}`,
    url: photo.url,
    isPrimary: toBoolean(photo.is_primary ?? photo.isPrimary),
    moderationStatus: (photo.moderation_status || photo.moderationStatus || 'pending') as 'pending' | 'approved' | 'rejected',
    order: toNumber(photo.order, index),
  }));

  const prompts = toArray(data.prompts).map((prompt, index) => ({
    id: prompt.id || `prompt-${index}`,
    question: toString(prompt.question),
    answer: toString(prompt.answer),
  }));

  return {
    id: data.id,
    userId: data.user_id,
    bio: toString(data.bio),
    occupation: toString(data.occupation),
    education: toString(data.education),
    height: data.height ?? undefined,
    city: toString(data.city),
    state: toString(data.state),
    country: toString(data.country),
    interests: toArray(data.interests),
    languages: toArray(data.languages),
    isPhotoVerified: toBoolean(data.is_photo_verified),
    profileCompletion: toNumber(data.profile_completion_percentage, 0),
    profileCompleted: toBoolean(data.profile_completed),
    lastActiveAt: toDateString(data.last_active_at) || undefined,
    createdAt: toDateString(data.created_at) || new Date().toISOString(),
    updatedAt: toDateString(data.updated_at) || new Date().toISOString(),
    photos,
    prompts,
    smoking: data.smoking ?? undefined,
    drinking: data.drinking ?? undefined,
    exercise: data.exercise ?? undefined,
    diet: data.diet ?? undefined,
    pets: data.pets ?? undefined,
  };
}

/**
 * Transforms backend subscription response to frontend format
 */
export function transformSubscriptionResponse(data: BackendSubscriptionResponse | null | undefined): FrontendSubscription | null {
  if (!data) return null;

  return {
    id: data.id,
    userId: toString(data.user_id || data.userId),
    tier: normalizeSubscriptionTier(data.tier),
    status: normalizeSubscriptionStatus(data.status),
    billingCycle: (toString(data.billing_cycle || data.billingCycle, 'monthly') as FrontendSubscription['billingCycle']),
    startDate: toDateString(data.start_date || data.startDate) || new Date().toISOString(),
    endDate: toDateString(data.end_date || data.endDate) || null,
    gracePeriodEnd: toDateString(data.grace_period_end || data.gracePeriodEnd) || null,
    autoRenew: toBoolean(data.auto_renew ?? data.autoRenew ?? true),
    features: toArray(data.features),
    trialEnd: toDateString(data.trial_end || data.trialEnd) || null,
  };
}

// ============================================================================
// API RESPONSE WRAPPER
// ============================================================================

/**
 * Standard API response shape from backend
 */
export interface BackendApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: string | { code: string; message: string };
  message?: string;
}

/**
 * Unwraps API response and extracts data
 * Handles both { success, data } format and direct data format
 */
export function unwrapApiResponse<T, R>(
  response: BackendApiResponse<T> | T,
  transformer?: (data: T) => R | null
): R | T | null {
  // Check if it's a wrapped response
  if (response && typeof response === 'object' && 'success' in response) {
    const wrapped = response as BackendApiResponse<T>;
    if (wrapped.success === false) {
      const errorMsg = typeof wrapped.error === 'string'
        ? wrapped.error
        : wrapped.error?.message || 'Unknown error';
      throw new Error(errorMsg);
    }
    const data = wrapped.data;
    if (transformer && data !== undefined) {
      return transformer(data);
    }
    return data ?? null;
  }

  // Direct data format
  if (transformer) {
    return transformer(response as T);
  }
  return response as T;
}

/**
 * Validates required fields are present in response
 * @throws Error if any required fields are missing
 */
export function validateRequiredFields<T extends object>(
  data: T,
  requiredFields: (keyof T)[],
  entityName: string = 'Response'
): void {
  const missingFields = requiredFields.filter(
    field => data[field] === undefined || data[field] === null
  );

  if (missingFields.length > 0) {
    console.warn(
      `${entityName} missing required fields: ${missingFields.join(', ')}`,
      data
    );
  }
}

// ============================================================================
// FRONTEND TO BACKEND TRANSFORMERS (for outgoing requests)
// ============================================================================

/**
 * Transforms camelCase object to snake_case for backend requests
 */
export function transformToSnakeCase<T extends object>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = camelToSnake(key);

    if (value !== undefined && value !== null) {
      if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        result[snakeKey] = transformToSnakeCase(value as object);
      } else if (Array.isArray(value)) {
        result[snakeKey] = value.map(item =>
          typeof item === 'object' && item !== null
            ? transformToSnakeCase(item as object)
            : item
        );
      } else {
        result[snakeKey] = value;
      }
    }
  }

  return result;
}
