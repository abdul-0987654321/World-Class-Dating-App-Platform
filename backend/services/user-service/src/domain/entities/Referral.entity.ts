/**
 * Referral Entity
 * Represents a referral relationship between two users
 */

export interface Referral {
  id: string;
  referrerId: string; // User who shared the referral code
  referredId: string; // New user who used the code
  referralCodeId: string; // Reference to the code used
  code: string; // The actual code string used (for easy lookup)
  status: ReferralStatus;
  referrerRewardedAt?: Date; // When referrer received their reward
  referredRewardedAt?: Date; // When referred user received their reward
  createdAt: Date;
  completedAt?: Date; // When the referral was marked as complete
  updatedAt: Date;
}

export type ReferralStatus = 'pending' | 'completed' | 'rewarded' | 'expired' | 'cancelled';

export interface ReferralCreateInput {
  referrerId: string;
  referredId: string;
  referralCodeId: string;
  code: string;
}

export interface ReferralUpdateInput {
  status?: ReferralStatus;
  referrerRewardedAt?: Date;
  referredRewardedAt?: Date;
  completedAt?: Date;
}

export const REFERRAL_STATUS = {
  PENDING: 'pending' as ReferralStatus,
  COMPLETED: 'completed' as ReferralStatus,
  REWARDED: 'rewarded' as ReferralStatus,
  EXPIRED: 'expired' as ReferralStatus,
  CANCELLED: 'cancelled' as ReferralStatus,
} as const;

// Conditions for referral completion
export const REFERRAL_COMPLETION_CONDITIONS = {
  // Minimum number of days the referred user must be active
  MIN_ACTIVE_DAYS: 3,
  // Referred user must verify their email
  REQUIRE_EMAIL_VERIFICATION: true,
  // Referred user must complete their profile (minimum 50%)
  REQUIRE_PROFILE_COMPLETION: true,
  MIN_PROFILE_COMPLETION_PERCENT: 50,
} as const;

/**
 * Check if a referral can be rewarded
 */
export function canRewardReferral(referral: Referral): boolean {
  return referral.status === REFERRAL_STATUS.COMPLETED;
}

/**
 * Check if referral is still pending
 */
export function isPendingReferral(referral: Referral): boolean {
  return referral.status === REFERRAL_STATUS.PENDING;
}

/**
 * Check if referral has been fully rewarded
 */
export function isFullyRewarded(referral: Referral): boolean {
  return (
    referral.status === REFERRAL_STATUS.REWARDED &&
    referral.referrerRewardedAt !== undefined &&
    referral.referredRewardedAt !== undefined
  );
}
