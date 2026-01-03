/**
 * ReferralCode Entity
 * Represents a unique referral code that users can share to invite others
 */

export interface ReferralCode {
  id: string;
  code: string; // Unique 8-character alphanumeric code
  userId: string; // Owner of the referral code
  maxUses: number; // Maximum number of times this code can be used
  currentUses: number; // Current usage count
  expiresAt?: Date; // Optional expiration date
  isActive: boolean; // Whether the code is still active
  createdAt: Date;
  updatedAt: Date;
}

export interface ReferralCodeCreateInput {
  userId: string;
  code: string;
  maxUses?: number;
  expiresAt?: Date;
}

export interface ReferralCodeUpdateInput {
  maxUses?: number;
  currentUses?: number;
  expiresAt?: Date;
  isActive?: boolean;
}

// Referral code constants
export const REFERRAL_CODE_LENGTH = 8;
export const DEFAULT_MAX_USES = 10;
export const DEFAULT_EXPIRY_DAYS = 365; // 1 year

// Reward configuration for referrals
export const REFERRAL_REWARDS = {
  // Rewards for the referrer (person who shared the code)
  REFERRER: {
    COINS: 50, // Coins awarded when referral is completed
    PREMIUM_DAYS: 7, // Premium days awarded when referral is completed
  },
  // Rewards for the referred user (new user who used the code)
  REFERRED: {
    COINS: 25, // Welcome coins for using a referral code
    PREMIUM_DAYS: 3, // Trial premium days for using a referral code
  },
} as const;

/**
 * Generate a random alphanumeric referral code
 */
export function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded confusing chars: I, O, 0, 1
  let code = '';
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Check if a referral code is still valid
 */
export function isReferralCodeValid(code: ReferralCode): boolean {
  if (!code.isActive) return false;
  if (code.currentUses >= code.maxUses) return false;
  if (code.expiresAt && new Date() > code.expiresAt) return false;
  return true;
}

/**
 * Check if referral code has capacity for more uses
 */
export function hasCapacity(code: ReferralCode): boolean {
  return code.currentUses < code.maxUses;
}
