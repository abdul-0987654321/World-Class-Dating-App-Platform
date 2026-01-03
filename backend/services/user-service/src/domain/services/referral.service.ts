import { ReferralCodeRepository } from '../repositories/referral-code.repository';
import { ReferralRepository, ReferralStats } from '../repositories/referral.repository';
import { CoinRepository } from '../repositories/coin.repository';
import { CoinTransactionRepository } from '../repositories/coin-transaction.repository';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { UserRepository } from '../repositories/user.repository';
import { ProfileRepository } from '../repositories/profile.repository';
import {
  ReferralCode,
  generateReferralCode,
  isReferralCodeValid,
  REFERRAL_REWARDS,
  DEFAULT_MAX_USES,
  DEFAULT_EXPIRY_DAYS,
} from '../entities/ReferralCode.entity';
import {
  Referral,
  REFERRAL_STATUS,
  REFERRAL_COMPLETION_CONDITIONS,
} from '../entities/Referral.entity';
import { TRANSACTION_TYPES, REFERENCE_TYPES } from '../entities/CoinTransaction.entity';
import logger from '../../utils/logger';

export interface GenerateCodeResult {
  code: ReferralCode;
  shareUrl: string;
}

export interface ApplyCodeResult {
  referral: Referral;
  referredReward: {
    coins: number;
    premiumDays: number;
  };
}

export interface ProcessRewardResult {
  referral: Referral;
  referrerReward: {
    coins: number;
    premiumDays: number;
  };
}

export class ReferralService {
  private referralCodeRepository: ReferralCodeRepository;
  private referralRepository: ReferralRepository;
  private coinRepository: CoinRepository;
  private coinTransactionRepository: CoinTransactionRepository;
  private subscriptionRepository: SubscriptionRepository;
  private userRepository: UserRepository;
  private profileRepository: ProfileRepository;

  constructor(
    referralCodeRepository?: ReferralCodeRepository,
    referralRepository?: ReferralRepository,
    coinRepository?: CoinRepository,
    coinTransactionRepository?: CoinTransactionRepository,
    subscriptionRepository?: SubscriptionRepository,
    userRepository?: UserRepository,
    profileRepository?: ProfileRepository
  ) {
    this.referralCodeRepository = referralCodeRepository || new ReferralCodeRepository();
    this.referralRepository = referralRepository || new ReferralRepository();
    this.coinRepository = coinRepository || new CoinRepository();
    this.coinTransactionRepository = coinTransactionRepository || new CoinTransactionRepository();
    this.subscriptionRepository = subscriptionRepository || new SubscriptionRepository();
    this.userRepository = userRepository || new UserRepository();
    this.profileRepository = profileRepository || new ProfileRepository();
  }

  /**
   * Generate a unique referral code for a user
   */
  async generateCode(userId: string): Promise<GenerateCodeResult> {
    // Check if user already has an active referral code
    const existingCode = await this.referralCodeRepository.findActiveByUserId(userId);
    if (existingCode) {
      return {
        code: existingCode,
        shareUrl: this.buildShareUrl(existingCode.code),
      };
    }

    // Generate a unique code
    let code: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      code = generateReferralCode();
      const exists = await this.referralCodeRepository.codeExists(code);
      if (!exists) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new Error('Unable to generate unique referral code. Please try again.');
    }

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + DEFAULT_EXPIRY_DAYS);

    // Create the referral code
    const referralCode = await this.referralCodeRepository.create({
      userId,
      code,
      maxUses: DEFAULT_MAX_USES,
      expiresAt,
    });

    logger.info(`Generated referral code ${code} for user ${userId}`);

    return {
      code: referralCode,
      shareUrl: this.buildShareUrl(referralCode.code),
    };
  }

  /**
   * Apply a referral code for a new user during signup
   */
  async applyCode(code: string, newUserId: string): Promise<ApplyCodeResult> {
    // Validate the referral code
    const referralCode = await this.referralCodeRepository.findByCode(code.toUpperCase());
    if (!referralCode) {
      throw new Error('Invalid referral code');
    }

    if (!isReferralCodeValid(referralCode)) {
      throw new Error('This referral code is no longer valid');
    }

    // Check if user has already been referred
    const existingReferral = await this.referralRepository.findByReferredId(newUserId);
    if (existingReferral) {
      throw new Error('You have already been referred');
    }

    // Prevent self-referral
    if (referralCode.userId === newUserId) {
      throw new Error('You cannot use your own referral code');
    }

    // Create the referral record
    const referral = await this.referralRepository.create({
      referrerId: referralCode.userId,
      referredId: newUserId,
      referralCodeId: referralCode.id,
      code: referralCode.code,
    });

    // Increment usage count
    await this.referralCodeRepository.incrementUses(referralCode.id);

    // Award immediate rewards to the referred user
    await this.awardReferredUserRewards(newUserId, referral.id);

    logger.info(`User ${newUserId} applied referral code ${code} from user ${referralCode.userId}`);

    return {
      referral,
      referredReward: {
        coins: REFERRAL_REWARDS.REFERRED.COINS,
        premiumDays: REFERRAL_REWARDS.REFERRED.PREMIUM_DAYS,
      },
    };
  }

  /**
   * Complete a referral when the referred user meets all conditions
   */
  async completeReferral(referralId: string): Promise<Referral> {
    const referral = await this.referralRepository.findById(referralId);
    if (!referral) {
      throw new Error('Referral not found');
    }

    if (referral.status !== REFERRAL_STATUS.PENDING) {
      throw new Error('Referral is not in pending status');
    }

    // Verify completion conditions
    const conditionsMet = await this.checkCompletionConditions(referral.referredId);
    if (!conditionsMet) {
      throw new Error('Referral completion conditions not met');
    }

    // Mark referral as completed
    const completedReferral = await this.referralRepository.markAsCompleted(referralId);

    logger.info(`Referral ${referralId} marked as completed`);

    return completedReferral;
  }

  /**
   * Process rewards for a completed referral
   */
  async processReward(referralId: string): Promise<ProcessRewardResult> {
    const referral = await this.referralRepository.findById(referralId);
    if (!referral) {
      throw new Error('Referral not found');
    }

    if (referral.status !== REFERRAL_STATUS.COMPLETED) {
      throw new Error('Referral must be completed before processing rewards');
    }

    // Award referrer rewards
    await this.awardReferrerRewards(referral.referrerId, referralId);

    // Mark referral as fully rewarded
    const rewardedReferral = await this.referralRepository.markAsRewarded(referralId);

    logger.info(`Processed rewards for referral ${referralId}`);

    return {
      referral: rewardedReferral,
      referrerReward: {
        coins: REFERRAL_REWARDS.REFERRER.COINS,
        premiumDays: REFERRAL_REWARDS.REFERRER.PREMIUM_DAYS,
      },
    };
  }

  /**
   * Get referral statistics for a user
   */
  async getStats(userId: string): Promise<ReferralStats & { activeCode?: ReferralCode; shareUrl?: string }> {
    const stats = await this.referralRepository.getReferralStats(userId);
    const activeCode = await this.referralCodeRepository.findActiveByUserId(userId);

    return {
      ...stats,
      activeCode: activeCode || undefined,
      shareUrl: activeCode ? this.buildShareUrl(activeCode.code) : undefined,
    };
  }

  /**
   * Get all referrals made by a user
   */
  async getReferralsByUser(userId: string): Promise<Referral[]> {
    return this.referralRepository.findByReferrerId(userId);
  }

  /**
   * Get the referral record for a referred user
   */
  async getReferralForUser(userId: string): Promise<Referral | null> {
    return this.referralRepository.findByReferredId(userId);
  }

  /**
   * Check if a user has been referred
   */
  async hasBeenReferred(userId: string): Promise<boolean> {
    return this.referralRepository.hasBeenReferred(userId);
  }

  /**
   * Validate a referral code without applying it
   */
  async validateCode(code: string): Promise<{ valid: boolean; message?: string }> {
    const referralCode = await this.referralCodeRepository.findByCode(code.toUpperCase());

    if (!referralCode) {
      return { valid: false, message: 'Invalid referral code' };
    }

    if (!referralCode.isActive) {
      return { valid: false, message: 'This referral code is no longer active' };
    }

    if (referralCode.currentUses >= referralCode.maxUses) {
      return { valid: false, message: 'This referral code has reached its maximum uses' };
    }

    if (referralCode.expiresAt && new Date() > referralCode.expiresAt) {
      return { valid: false, message: 'This referral code has expired' };
    }

    return { valid: true };
  }

  /**
   * Process pending referrals to check if they can be completed
   * This should be called periodically by a cron job
   */
  async processPendingReferrals(): Promise<number> {
    const pendingReferrals = await this.referralRepository.findPendingReferrals();
    let processed = 0;

    for (const referral of pendingReferrals) {
      try {
        const conditionsMet = await this.checkCompletionConditions(referral.referredId);
        if (conditionsMet) {
          await this.completeReferral(referral.id);
          await this.processReward(referral.id);
          processed++;
        }
      } catch (error) {
        logger.error(`Error processing referral ${referral.id}:`, error);
      }
    }

    logger.info(`Processed ${processed} pending referrals`);
    return processed;
  }

  /**
   * Expire old pending referrals
   * This should be called periodically by a cron job
   */
  async expireOldReferrals(daysOld: number = 30): Promise<number> {
    const count = await this.referralRepository.expireOldPendingReferrals(daysOld);

    if (count > 0) {
      logger.info(`Expired ${count} old pending referrals`);
    }

    return count;
  }

  /**
   * Deactivate expired referral codes
   * This should be called periodically by a cron job
   */
  async deactivateExpiredCodes(): Promise<number> {
    const count = await this.referralCodeRepository.deactivateExpiredCodes();

    if (count > 0) {
      logger.info(`Deactivated ${count} expired referral codes`);
    }

    return count;
  }

  // Private helper methods

  private async checkCompletionConditions(referredUserId: string): Promise<boolean> {
    try {
      // Check if user exists
      const user = await this.userRepository.findById(referredUserId);
      if (!user) return false;

      // Check email verification
      if (REFERRAL_COMPLETION_CONDITIONS.REQUIRE_EMAIL_VERIFICATION) {
        if (!user.is_email_verified) return false;
      }

      // Check account age (minimum active days)
      const accountAge = Math.floor(
        (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (accountAge < REFERRAL_COMPLETION_CONDITIONS.MIN_ACTIVE_DAYS) {
        return false;
      }

      // Check profile completion
      if (REFERRAL_COMPLETION_CONDITIONS.REQUIRE_PROFILE_COMPLETION) {
        const profile = await this.profileRepository.findByUserId(referredUserId);
        if (!profile) return false;

        const completionPercent = this.calculateProfileCompletion(profile);
        if (completionPercent < REFERRAL_COMPLETION_CONDITIONS.MIN_PROFILE_COMPLETION_PERCENT) {
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error(`Error checking completion conditions for user ${referredUserId}:`, error);
      return false;
    }
  }

  private calculateProfileCompletion(profile: any): number {
    const fields = [
      'bio',
      'location',
      'occupation',
      'education',
      'height',
      'drinking',
      'smoking',
      'exercise',
      'looking_for',
    ];

    const completedFields = fields.filter((field) => {
      const value = profile[field];
      return value !== null && value !== undefined && value !== '';
    });

    return Math.round((completedFields.length / fields.length) * 100);
  }

  private async awardReferredUserRewards(userId: string, referralId: string): Promise<void> {
    // Award coins
    const coins = REFERRAL_REWARDS.REFERRED.COINS;
    await this.awardCoins(userId, coins, 'Welcome bonus for using referral code', referralId);

    // Award premium days
    const premiumDays = REFERRAL_REWARDS.REFERRED.PREMIUM_DAYS;
    await this.awardPremiumDays(userId, premiumDays);

    // Mark referred user as rewarded
    await this.referralRepository.markReferredRewarded(referralId);
  }

  private async awardReferrerRewards(userId: string, referralId: string): Promise<void> {
    // Award coins
    const coins = REFERRAL_REWARDS.REFERRER.COINS;
    await this.awardCoins(userId, coins, 'Referral reward - friend completed signup', referralId);

    // Award premium days
    const premiumDays = REFERRAL_REWARDS.REFERRER.PREMIUM_DAYS;
    await this.awardPremiumDays(userId, premiumDays);

    // Mark referrer as rewarded
    await this.referralRepository.markReferrerRewarded(referralId);
  }

  private async awardCoins(
    userId: string,
    amount: number,
    reason: string,
    referralId: string
  ): Promise<void> {
    try {
      // Get or create coin account
      let coinAccount = await this.coinRepository.findByUserId(userId);
      if (!coinAccount) {
        coinAccount = await this.coinRepository.create({ userId, initialBalance: 0 });
      }

      // Add coins
      const updatedCoin = await this.coinRepository.addCoins(userId, amount, false);

      // Create transaction record
      await this.coinTransactionRepository.create({
        userId,
        type: TRANSACTION_TYPES.REWARD,
        amount,
        balanceAfter: updatedCoin.balance,
        reason,
        referenceId: referralId,
        referenceType: REFERENCE_TYPES.REFERRAL,
      });

      logger.info(`Awarded ${amount} coins to user ${userId} for referral ${referralId}`);
    } catch (error) {
      logger.error(`Error awarding coins to user ${userId}:`, error);
      throw error;
    }
  }

  private async awardPremiumDays(userId: string, days: number): Promise<void> {
    try {
      const subscription = await this.subscriptionRepository.findByUserId(userId);

      if (subscription) {
        // Extend existing subscription
        const currentEnd = subscription.currentPeriodEnd
          ? new Date(subscription.currentPeriodEnd)
          : new Date();

        const newEnd = new Date(currentEnd);
        newEnd.setDate(newEnd.getDate() + days);

        await this.subscriptionRepository.update(subscription.id, {
          currentPeriodEnd: newEnd,
        });

        logger.info(`Extended subscription for user ${userId} by ${days} days`);
      } else {
        // Create trial subscription
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + days);

        await this.subscriptionRepository.create({
          userId,
          tier: 'basic',
          billingCycle: 'monthly',
          trialDays: days,
        });

        logger.info(`Created trial subscription for user ${userId} with ${days} days`);
      }
    } catch (error) {
      logger.error(`Error awarding premium days to user ${userId}:`, error);
      // Don't throw - premium days are a bonus, coins are the main reward
    }
  }

  private buildShareUrl(code: string): string {
    const baseUrl = process.env.APP_URL || 'https://flamoral.com';
    return `${baseUrl}/signup?ref=${code}`;
  }
}

export default new ReferralService();
