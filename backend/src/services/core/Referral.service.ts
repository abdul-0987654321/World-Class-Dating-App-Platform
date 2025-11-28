/**
 * Referral Service
 * Handles user referrals, reward distribution, and tracking
 */

import { logger } from '../../utils/logger';
import { notificationService } from './Notification.service';
import { gamificationService } from './Gamification.service';

// Types
export interface ReferralCode {
  code: string;
  userId: string;
  isCustom: boolean;
  createdAt: Date;
  isActive: boolean;
  usageCount: number;
}

export interface Referral {
  id: string;
  referrerId: string;
  referredUserId: string;
  referralCode: string;
  status: ReferralStatus;
  createdAt: Date;
  validatedAt?: Date;
  rewardedAt?: Date;
  referrerReward?: ReferralReward;
  referredReward?: ReferralReward;
}

export interface ReferralReward {
  coins: number;
  gems?: number;
  superLikes?: number;
  boostMinutes?: number;
  subscriptionDays?: number;
  subscriptionTier?: string;
}

export interface ReferralStats {
  userId: string;
  totalReferrals: number;
  successfulReferrals: number;
  pendingReferrals: number;
  totalCoinsEarned: number;
  totalGemsEarned: number;
  currentTier: ReferralTier;
  nextTierProgress: number;
}

export interface ReferralTier {
  name: string;
  minReferrals: number;
  coinBonus: number;
  gemBonus?: number;
  subscriptionReward?: { days: number; tier: string };
  badge: string;
}

export type ReferralStatus =
  | 'pending'      // User signed up but not validated
  | 'validated'    // User met validation criteria
  | 'rewarded'     // Rewards distributed
  | 'expired'      // Validation period expired
  | 'invalid';     // Detected as fraudulent

// Referral rewards configuration
const REFERRER_REWARDS: ReferralReward = {
  coins: 200,
  gems: 5,
};

const REFERRED_REWARDS: ReferralReward = {
  coins: 100,
  superLikes: 3,
  boostMinutes: 30,
};

// Referral tiers with cumulative rewards
const REFERRAL_TIERS: ReferralTier[] = [
  {
    name: 'Starter',
    minReferrals: 0,
    coinBonus: 0,
    badge: 'referral_starter',
  },
  {
    name: 'Matchmaker',
    minReferrals: 1,
    coinBonus: 0,
    badge: 'matchmaker',
  },
  {
    name: 'Networker',
    minReferrals: 5,
    coinBonus: 500,
    gemBonus: 10,
    badge: 'influencer',
  },
  {
    name: 'Ambassador',
    minReferrals: 10,
    coinBonus: 1000,
    gemBonus: 25,
    subscriptionReward: { days: 30, tier: 'PLATINUM' },
    badge: 'ambassador',
  },
  {
    name: 'Legend',
    minReferrals: 25,
    coinBonus: 2500,
    gemBonus: 75,
    subscriptionReward: { days: 90, tier: 'PLATINUM' },
    badge: 'referral_legend',
  },
  {
    name: 'Elite',
    minReferrals: 50,
    coinBonus: 5000,
    gemBonus: 150,
    subscriptionReward: { days: 365, tier: 'DIAMOND' },
    badge: 'referral_elite',
  },
  {
    name: 'Immortal',
    minReferrals: 100,
    coinBonus: 15000,
    gemBonus: 500,
    subscriptionReward: { days: -1, tier: 'DIAMOND' }, // -1 = lifetime
    badge: 'referral_immortal',
  },
];

// Validation criteria for referral to be considered successful
const VALIDATION_CRITERIA = {
  minPhotos: 3,
  hasCompletedBio: true,
  minActiveDays: 3,
  hasVerifiedPhone: true,
  validationPeriodDays: 14,
};

class ReferralService {
  private referralCodes: Map<string, ReferralCode> = new Map();
  private userCodes: Map<string, string> = new Map(); // userId -> code
  private referrals: Map<string, Referral> = new Map();
  private userStats: Map<string, ReferralStats> = new Map();

  /**
   * Generate or get referral code for a user
   */
  async getReferralCode(userId: string): Promise<ReferralCode> {
    // Check if user already has a code
    const existingCode = this.userCodes.get(userId);
    if (existingCode) {
      return this.referralCodes.get(existingCode)!;
    }

    // Generate new code
    const code = this.generateCode(userId);
    const referralCode: ReferralCode = {
      code,
      userId,
      isCustom: false,
      createdAt: new Date(),
      isActive: true,
      usageCount: 0,
    };

    this.referralCodes.set(code, referralCode);
    this.userCodes.set(userId, code);

    logger.info(`Generated referral code ${code} for user ${userId}`);

    return referralCode;
  }

  /**
   * Set custom referral code (premium feature)
   */
  async setCustomCode(userId: string, customCode: string): Promise<{
    success: boolean;
    code?: ReferralCode;
    error?: string;
  }> {
    // Validate custom code
    const sanitizedCode = customCode.toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (sanitizedCode.length < 4 || sanitizedCode.length > 12) {
      return { success: false, error: 'Code must be 4-12 alphanumeric characters' };
    }

    // Check if code is already taken
    if (this.referralCodes.has(sanitizedCode)) {
      return { success: false, error: 'This code is already taken' };
    }

    // Check for inappropriate content (basic filter)
    const inappropriateWords = ['ADMIN', 'SYSTEM', 'OFFICIAL', 'DATING'];
    if (inappropriateWords.some(word => sanitizedCode.includes(word))) {
      return { success: false, error: 'This code is not allowed' };
    }

    // Deactivate old code if exists
    const oldCode = this.userCodes.get(userId);
    if (oldCode) {
      const oldReferralCode = this.referralCodes.get(oldCode);
      if (oldReferralCode) {
        oldReferralCode.isActive = false;
      }
    }

    // Create new custom code
    const referralCode: ReferralCode = {
      code: sanitizedCode,
      userId,
      isCustom: true,
      createdAt: new Date(),
      isActive: true,
      usageCount: 0,
    };

    this.referralCodes.set(sanitizedCode, referralCode);
    this.userCodes.set(userId, sanitizedCode);

    logger.info(`User ${userId} set custom referral code: ${sanitizedCode}`);

    return { success: true, code: referralCode };
  }

  /**
   * Apply referral code during signup
   */
  async applyReferralCode(
    newUserId: string,
    code: string
  ): Promise<{
    success: boolean;
    referral?: Referral;
    error?: string;
  }> {
    const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const referralCode = this.referralCodes.get(normalizedCode);

    if (!referralCode) {
      return { success: false, error: 'Invalid referral code' };
    }

    if (!referralCode.isActive) {
      return { success: false, error: 'This referral code is no longer active' };
    }

    // Prevent self-referral
    if (referralCode.userId === newUserId) {
      return { success: false, error: 'Cannot use your own referral code' };
    }

    // Check if user already used a referral code
    const existingReferral = Array.from(this.referrals.values())
      .find(r => r.referredUserId === newUserId);
    if (existingReferral) {
      return { success: false, error: 'You have already used a referral code' };
    }

    // Create referral record
    const referral: Referral = {
      id: `ref_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      referrerId: referralCode.userId,
      referredUserId: newUserId,
      referralCode: normalizedCode,
      status: 'pending',
      createdAt: new Date(),
    };

    this.referrals.set(referral.id, referral);
    referralCode.usageCount++;

    logger.info(`Referral code ${normalizedCode} applied by user ${newUserId}`);

    // Give immediate rewards to referred user
    await this.distributeReferredReward(referral);

    return { success: true, referral };
  }

  /**
   * Validate referral when criteria are met
   */
  async validateReferral(referralId: string): Promise<{
    success: boolean;
    referral?: Referral;
  }> {
    const referral = this.referrals.get(referralId);
    if (!referral || referral.status !== 'pending') {
      return { success: false };
    }

    // Check validation period
    const daysSinceSignup = Math.floor(
      (Date.now() - referral.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceSignup > VALIDATION_CRITERIA.validationPeriodDays) {
      referral.status = 'expired';
      this.referrals.set(referralId, referral);
      return { success: false };
    }

    // Mark as validated (in production, would check actual user data)
    referral.status = 'validated';
    referral.validatedAt = new Date();
    this.referrals.set(referralId, referral);

    // Distribute referrer reward
    await this.distributeReferrerReward(referral);

    // Update stats and check for tier upgrades
    await this.updateReferrerStats(referral.referrerId);

    logger.info(`Referral ${referralId} validated successfully`);

    return { success: true, referral };
  }

  /**
   * Check and validate referral based on user activity
   */
  async checkReferralValidation(userId: string, userStats: {
    photoCount: number;
    hasBio: boolean;
    activeDays: number;
    phoneVerified: boolean;
  }): Promise<void> {
    // Find pending referral for this user
    const referral = Array.from(this.referrals.values())
      .find(r => r.referredUserId === userId && r.status === 'pending');

    if (!referral) return;

    // Check validation criteria
    const meetsPhotoCriteria = userStats.photoCount >= VALIDATION_CRITERIA.minPhotos;
    const meetsBioCriteria = !VALIDATION_CRITERIA.hasCompletedBio || userStats.hasBio;
    const meetsActivityCriteria = userStats.activeDays >= VALIDATION_CRITERIA.minActiveDays;
    const meetsPhoneCriteria = !VALIDATION_CRITERIA.hasVerifiedPhone || userStats.phoneVerified;

    if (meetsPhotoCriteria && meetsBioCriteria && meetsActivityCriteria && meetsPhoneCriteria) {
      await this.validateReferral(referral.id);
    }
  }

  /**
   * Get referral stats for a user
   */
  async getReferralStats(userId: string): Promise<ReferralStats> {
    let stats = this.userStats.get(userId);

    if (!stats) {
      stats = {
        userId,
        totalReferrals: 0,
        successfulReferrals: 0,
        pendingReferrals: 0,
        totalCoinsEarned: 0,
        totalGemsEarned: 0,
        currentTier: REFERRAL_TIERS[0],
        nextTierProgress: 0,
      };
      this.userStats.set(userId, stats);
    }

    return stats;
  }

  /**
   * Get user's referral history
   */
  async getReferralHistory(userId: string): Promise<Referral[]> {
    return Array.from(this.referrals.values())
      .filter(r => r.referrerId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get shareable referral link
   */
  async getReferralLink(userId: string): Promise<string> {
    const code = await this.getReferralCode(userId);
    // In production, this would be your actual app URL
    return `https://app.flamoral.com/r/${code.code}`;
  }

  /**
   * Get referral leaderboard
   */
  async getLeaderboard(limit: number = 10): Promise<Array<{
    rank: number;
    userId: string;
    referralCount: number;
    tier: ReferralTier;
  }>> {
    const allStats = Array.from(this.userStats.values())
      .filter(s => s.successfulReferrals > 0)
      .sort((a, b) => b.successfulReferrals - a.successfulReferrals)
      .slice(0, limit);

    return allStats.map((stats, index) => ({
      rank: index + 1,
      userId: stats.userId,
      referralCount: stats.successfulReferrals,
      tier: stats.currentTier,
    }));
  }

  // Private helper methods

  private generateCode(userId: string): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private async distributeReferredReward(referral: Referral): Promise<void> {
    const reward = REFERRED_REWARDS;

    await gamificationService.addCoins(referral.referredUserId, reward.coins);

    referral.referredReward = reward;
    this.referrals.set(referral.id, referral);

    logger.info(`Distributed referred user reward: ${reward.coins} coins to user ${referral.referredUserId}`);
  }

  private async distributeReferrerReward(referral: Referral): Promise<void> {
    const reward = REFERRER_REWARDS;

    await gamificationService.addCoins(referral.referrerId, reward.coins);
    if (reward.gems) {
      await gamificationService.addGems(referral.referrerId, reward.gems);
    }

    referral.referrerReward = reward;
    referral.status = 'rewarded';
    referral.rewardedAt = new Date();
    this.referrals.set(referral.id, referral);

    // Notify referrer
    await notificationService.sendReferralSignupNotification(
      referral.referrerId,
      'Your friend', // In production, would get actual name
      reward.coins
    );

    // Track achievement progress
    await gamificationService.trackAchievementProgress(referral.referrerId, 'matchmaker', 1);

    logger.info(`Distributed referrer reward: ${reward.coins} coins to user ${referral.referrerId}`);
  }

  private async updateReferrerStats(userId: string): Promise<void> {
    const referrals = Array.from(this.referrals.values())
      .filter(r => r.referrerId === userId);

    const successful = referrals.filter(r => r.status === 'rewarded').length;
    const pending = referrals.filter(r => r.status === 'pending').length;

    // Calculate total rewards earned
    let totalCoins = 0;
    let totalGems = 0;
    for (const referral of referrals) {
      if (referral.referrerReward) {
        totalCoins += referral.referrerReward.coins;
        totalGems += referral.referrerReward.gems || 0;
      }
    }

    // Determine current tier
    let currentTier = REFERRAL_TIERS[0];
    let nextTier = REFERRAL_TIERS[1];
    for (let i = REFERRAL_TIERS.length - 1; i >= 0; i--) {
      if (successful >= REFERRAL_TIERS[i].minReferrals) {
        currentTier = REFERRAL_TIERS[i];
        nextTier = REFERRAL_TIERS[i + 1] || REFERRAL_TIERS[i];
        break;
      }
    }

    // Check for tier upgrade and distribute tier bonus
    const existingStats = this.userStats.get(userId);
    if (existingStats && currentTier.minReferrals > existingStats.currentTier.minReferrals) {
      // Tier upgrade! Award tier bonus
      if (currentTier.coinBonus > 0) {
        await gamificationService.addCoins(userId, currentTier.coinBonus);
        totalCoins += currentTier.coinBonus;
      }
      if (currentTier.gemBonus) {
        await gamificationService.addGems(userId, currentTier.gemBonus);
        totalGems += currentTier.gemBonus;
      }

      logger.info(`User ${userId} upgraded to referral tier: ${currentTier.name}`);
    }

    // Calculate progress to next tier
    const nextTierProgress = nextTier === currentTier
      ? 100
      : Math.floor(((successful - currentTier.minReferrals) / (nextTier.minReferrals - currentTier.minReferrals)) * 100);

    const stats: ReferralStats = {
      userId,
      totalReferrals: referrals.length,
      successfulReferrals: successful,
      pendingReferrals: pending,
      totalCoinsEarned: totalCoins,
      totalGemsEarned: totalGems,
      currentTier,
      nextTierProgress,
    };

    this.userStats.set(userId, stats);
  }
}

export const referralService = new ReferralService();
