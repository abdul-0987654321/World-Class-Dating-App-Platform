/**
 * Background Check Types
 * Flamoral Dating Platform
 *
 * Type definitions for Elite tier background check integration
 * using Onfido and Jumio providers.
 */

import { VerificationProvider } from './id-verification-provider.types';

// Background check tiers based on Elite subscription levels
export type BackgroundCheckTier = 'basic' | 'standard' | 'comprehensive';

// Background check status
export type BackgroundCheckStatus =
  | 'initiated'
  | 'pending'
  | 'processing'
  | 'clear'
  | 'consider'
  | 'flagged'
  | 'error'
  | 'expired';

// Check types available
export type CheckType =
  | 'identity'
  | 'watchlist'
  | 'criminal'
  | 'ssn_trace'
  | 'sex_offender'
  | 'global_watchlist';

// Watchlist result
export type WatchlistResult =
  | 'clear'
  | 'possible_match'
  | 'confirmed_match'
  | 'not_performed'
  | 'error';

/**
 * Request to initiate background check
 */
export interface InitiateBackgroundCheckRequest {
  user_id: string;
  tier: BackgroundCheckTier;
  country_code?: string;
  consent_given: boolean;
  consent_timestamp: Date;
}

/**
 * Response from initiating background check
 */
export interface InitiateBackgroundCheckResponse {
  success: boolean;
  background_check_id?: string;
  provider?: VerificationProvider;
  status?: BackgroundCheckStatus;
  checks_included?: CheckType[];
  estimated_completion?: Date;
  error?: string;
  error_code?: string;
}

/**
 * Background check result from provider
 */
export interface BackgroundCheckResult {
  background_check_id: string;
  external_id: string;
  provider: VerificationProvider;
  status: BackgroundCheckStatus;
  tier: BackgroundCheckTier;
  checks_performed: CheckType[];
  identity_verified: boolean;
  watchlist_result: WatchlistResult;
  watchlist_details?: WatchlistDetails;
  overall_score?: number;
  flags?: BackgroundFlag[];
  completed_at?: Date;
  expires_at?: Date;
  raw_response?: Record<string, any>;
}

/**
 * Watchlist screening details
 */
export interface WatchlistDetails {
  screened_lists: string[];
  potential_matches: WatchlistMatch[];
  match_count: number;
  high_risk_matches: number;
}

/**
 * Individual watchlist match
 */
export interface WatchlistMatch {
  list_name: string;
  list_type: string; // 'sanction', 'pep', 'adverse_media', 'criminal'
  match_score: number;
  name_matched?: string;
  dob_matched?: boolean;
  country_matched?: boolean;
  details?: string;
}

/**
 * Background check flag/concern
 */
export interface BackgroundFlag {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  source?: string;
  date_detected?: Date;
}

/**
 * Background check status response
 */
export interface BackgroundCheckStatusResponse {
  background_check_id: string;
  user_id: string;
  provider: VerificationProvider;
  status: BackgroundCheckStatus;
  tier: BackgroundCheckTier;
  checks_included: CheckType[];
  initiated_at: Date;
  completed_at?: Date;
  expires_at?: Date;
  result?: BackgroundCheckResult;
  badge_awarded?: boolean;
}

/**
 * Database record for background checks
 */
export interface BackgroundCheckRecord {
  id: string;
  user_id: string;
  provider: VerificationProvider;
  external_id: string;
  tier: BackgroundCheckTier;
  status: BackgroundCheckStatus;
  checks_performed: CheckType[];
  identity_verified: boolean;
  watchlist_result: WatchlistResult;
  watchlist_details?: WatchlistDetails;
  overall_score?: number;
  flags?: BackgroundFlag[];
  consent_given: boolean;
  consent_timestamp: Date;
  initiated_at: Date;
  completed_at?: Date;
  expires_at?: Date;
  webhook_received_at?: Date;
  raw_response?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

/**
 * Onfido-specific check types
 */
export interface OnfidoBackgroundCheckRequest {
  applicant_id: string;
  report_names: string[];
}

/**
 * Jumio-specific workflow for background checks
 */
export interface JumioBackgroundCheckWorkflow {
  workflow_key: string;
  capabilities: string[];
}

/**
 * Tier configuration - what checks are included in each tier
 */
export const BACKGROUND_CHECK_TIER_CONFIG: Record<BackgroundCheckTier, {
  checks: CheckType[];
  validity_days: number;
  price_coins: number;
  description: string;
}> = {
  basic: {
    checks: ['identity', 'watchlist'],
    validity_days: 180,
    price_coins: 0, // Included with Elite
    description: 'Identity verification and global watchlist screening',
  },
  standard: {
    checks: ['identity', 'watchlist', 'criminal', 'sex_offender'],
    validity_days: 365,
    price_coins: 50,
    description: 'Enhanced screening including criminal and sex offender databases',
  },
  comprehensive: {
    checks: ['identity', 'watchlist', 'criminal', 'ssn_trace', 'sex_offender', 'global_watchlist'],
    validity_days: 365,
    price_coins: 100,
    description: 'Full background check with SSN trace and comprehensive screening',
  },
};

/**
 * Provider interface for background checks
 */
export interface IBackgroundCheckProvider {
  readonly name: VerificationProvider;

  /**
   * Create a background check for a user
   */
  createBackgroundCheck(
    userId: string,
    applicantId: string,
    tier: BackgroundCheckTier
  ): Promise<{
    success: boolean;
    check_id?: string;
    error?: string;
  }>;

  /**
   * Get the status/result of a background check
   */
  getCheckStatus(checkId: string): Promise<BackgroundCheckResult>;

  /**
   * Process background check webhook from provider
   * Note: This is separate from ID verification webhooks
   */
  processBackgroundCheckWebhook(
    payload: Record<string, any>,
    headers: Record<string, string>
  ): Promise<BackgroundCheckResult>;

  /**
   * Map tier to provider-specific report/check types
   */
  mapTierToReports(tier: BackgroundCheckTier): string[];
}
