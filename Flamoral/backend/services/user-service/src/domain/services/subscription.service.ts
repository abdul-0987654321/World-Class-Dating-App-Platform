import { SubscriptionRepository } from '../repositories/subscription.repository';
import { SubscriptionFeatureRepository } from '../repositories/subscription-feature.repository';
import { UsageLimitRepository } from '../repositories/usage-limit.repository';
import {
  Subscription,
  SubscriptionCreateInput,
  SUBSCRIPTION_TIERS,
  SUBSCRIPTION_STATUS,
  TIER_HIERARCHY,
  GRACE_PERIOD_DAYS,
  TRIAL_DAYS_BY_TIER,
  BILLING_CYCLES
} from '../entities/Subscription.entity';
import { FeatureAccess, hasFeatureAccess } from '../entities/SubscriptionFeature.entity';
import { FREE_TIER_LIMITS, RESOURCE_TYPES } from '../entities/UsageLimit.entity';

export class SubscriptionService {
  private subscriptionRepository: SubscriptionRepository;
  private subscriptionFeatureRepository: SubscriptionFeatureRepository;
  private usageLimitRepository: UsageLimitRepository;

  constructor(
    subscriptionRepository?: SubscriptionRepository,
    subscriptionFeatureRepository?: SubscriptionFeatureRepository,
    usageLimitRepository?: UsageLimitRepository
  ) {
    this.subscriptionRepository = subscriptionRepository || new SubscriptionRepository();
    this.subscriptionFeatureRepository = subscriptionFeatureRepository || new SubscriptionFeatureRepository();
    this.usageLimitRepository = usageLimitRepository || new UsageLimitRepository();
  }

  /**
   * Create a new subscription for a user
   */
  async createSubscription(input: SubscriptionCreateInput): Promise<Subscription> {
    // Check if user already has a subscription
    const existing = await this.subscriptionRepository.findByUserId(input.userId);
    if (existing) {
      throw new Error('User already has a subscription');
    }

    // Create subscription
    const subscription = await this.subscriptionRepository.create(input);

    // Initialize usage limits based on tier
    await this.initializeUsageLimits(input.userId, input.tier);

    return subscription;
  }

  /**
   * Get user's current subscription
   */
  async getUserSubscription(userId: string): Promise<Subscription | null> {
    return await this.subscriptionRepository.findByUserId(userId);
  }

  /**
   * Update subscription tier
   */
  async updateSubscriptionTier(
    userId: string,
    newTier: Subscription['tier']
  ): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findByUserId(userId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Validate tier change
    const currentTier = subscription.tier;
    if (currentTier === newTier) {
      throw new Error('New tier is the same as current tier');
    }

    // Check if subscription is in a valid state for tier changes
    if (subscription.status === SUBSCRIPTION_STATUS.CANCELED) {
      throw new Error('Cannot change tier of a canceled subscription');
    }

    if (subscription.status === SUBSCRIPTION_STATUS.EXPIRED) {
      throw new Error('Cannot change tier of an expired subscription');
    }

    // Update subscription tier
    const updated = await this.subscriptionRepository.update(subscription.id, { tier: newTier });

    // Update usage limits based on new tier
    await this.updateUsageLimitsForTier(userId, newTier);

    return updated;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    userId: string,
    immediately: boolean = false
  ): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findByUserId(userId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const canceled = await this.subscriptionRepository.cancelSubscription(
      subscription.id,
      immediately
    );

    // If canceling immediately, downgrade to free tier
    if (immediately) {
      await this.updateUsageLimitsForTier(userId, SUBSCRIPTION_TIERS.FREE);
    }

    return canceled;
  }

  /**
   * Reactivate a canceled subscription
   */
  async reactivateSubscription(userId: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findByUserId(userId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (subscription.status !== SUBSCRIPTION_STATUS.CANCELED) {
      throw new Error('Subscription is not canceled');
    }

    return await this.subscriptionRepository.update(subscription.id, {
      status: SUBSCRIPTION_STATUS.ACTIVE,
      cancelAtPeriodEnd: false,
    });
  }

  /**
   * Check if user has access to a specific feature
   */
  async checkFeatureAccess(userId: string, featureKey: string): Promise<FeatureAccess> {
    const subscription = await this.subscriptionRepository.findByUserId(userId);
    if (!subscription) {
      // No subscription means free tier
      const freeFeatures = await this.subscriptionFeatureRepository.findByTier(SUBSCRIPTION_TIERS.FREE);
      return hasFeatureAccess(freeFeatures, featureKey);
    }

    const features = await this.subscriptionFeatureRepository.findByTier(subscription.tier);
    return hasFeatureAccess(features, featureKey);
  }

  /**
   * Get all features for user's subscription tier
   */
  async getUserFeatures(userId: string) {
    const subscription = await this.subscriptionRepository.findByUserId(userId);
    const tier = subscription?.tier || SUBSCRIPTION_TIERS.FREE;
    return await this.subscriptionFeatureRepository.findByTier(tier);
  }

  /**
   * Handle Stripe webhook for subscription updates
   */
  async handleStripeSubscriptionUpdate(
    stripeSubscriptionId: string,
    status: Subscription['status'],
    currentPeriodEnd: Date
  ): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findByStripeSubscriptionId(stripeSubscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found for Stripe subscription ID');
    }

    // Update subscription status
    const updated = await this.subscriptionRepository.update(subscription.id, {
      status,
      currentPeriodEnd,
    });

    // If subscription is canceled or expired, downgrade to free tier
    if (status === SUBSCRIPTION_STATUS.CANCELED || status === SUBSCRIPTION_STATUS.EXPIRED) {
      await this.updateUsageLimitsForTier(subscription.userId, SUBSCRIPTION_TIERS.FREE);
    }

    return updated;
  }

  /**
   * Get subscription status details with human-readable information
   */
  async getSubscriptionStatusDetails(userId: string): Promise<{
    hasActiveSubscription: boolean;
    tier: Subscription['tier'];
    status: Subscription['status'];
    isInTrial: boolean;
    isInGracePeriod: boolean;
    willCancelAtPeriodEnd: boolean;
    currentPeriodEnd: Date | null;
    gracePeriodEnd: Date | null;
    trialEnd: Date | null;
  }> {
    const subscription = await this.subscriptionRepository.findByUserId(userId);

    if (!subscription) {
      return {
        hasActiveSubscription: false,
        tier: SUBSCRIPTION_TIERS.FREE,
        status: SUBSCRIPTION_STATUS.ACTIVE,
        isInTrial: false,
        isInGracePeriod: false,
        willCancelAtPeriodEnd: false,
        currentPeriodEnd: null,
        gracePeriodEnd: null,
        trialEnd: null,
      };
    }

    const now = new Date();
    const isInTrial = subscription.status === SUBSCRIPTION_STATUS.TRIALING &&
                      subscription.trialEnd ? subscription.trialEnd > now : false;
    const isInGracePeriod = subscription.status === SUBSCRIPTION_STATUS.GRACE_PERIOD &&
                            subscription.gracePeriodEnd ? subscription.gracePeriodEnd > now : false;

    const hasActiveSubscription =
      subscription.status === SUBSCRIPTION_STATUS.ACTIVE ||
      subscription.status === SUBSCRIPTION_STATUS.TRIALING ||
      subscription.status === SUBSCRIPTION_STATUS.GRACE_PERIOD;

    return {
      hasActiveSubscription,
      tier: subscription.tier,
      status: subscription.status,
      isInTrial,
      isInGracePeriod,
      willCancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      currentPeriodEnd: subscription.currentPeriodEnd || null,
      gracePeriodEnd: subscription.gracePeriodEnd || null,
      trialEnd: subscription.trialEnd || null,
    };
  }

  /**
   * Process expired subscriptions (to be called by cron job)
   */
  async processExpiredSubscriptions(): Promise<number> {
    const expired = await this.subscriptionRepository.findExpiredSubscriptions();
    let processed = 0;

    for (const subscription of expired) {
      await this.subscriptionRepository.update(subscription.id, {
        status: SUBSCRIPTION_STATUS.EXPIRED,
      });

      // Downgrade to free tier
      await this.updateUsageLimitsForTier(subscription.userId, SUBSCRIPTION_TIERS.FREE);
      processed++;
    }

    return processed;
  }

  /**
   * Process expired trial subscriptions (to be called by cron job)
   */
  async processExpiredTrials(): Promise<number> {
    const expiredTrials = await this.subscriptionRepository.findExpiredTrials();
    let processed = 0;

    for (const subscription of expiredTrials) {
      // Check if they have a payment method and stripe subscription - if yes, activate, if no, expire
      if (subscription.stripeCustomerId && subscription.stripeSubscriptionId) {
        // Trial ended with payment method attached - convert to active paid subscription
        const now = new Date();
        const nextPeriodEnd = new Date(now);
        nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);

        await this.subscriptionRepository.update(subscription.id, {
          status: SUBSCRIPTION_STATUS.ACTIVE,
          currentPeriodStart: now,
          currentPeriodEnd: nextPeriodEnd,
        });
      } else {
        // Trial ended without payment method - expire and downgrade to free
        await this.subscriptionRepository.update(subscription.id, {
          status: SUBSCRIPTION_STATUS.EXPIRED,
        });
        await this.updateUsageLimitsForTier(subscription.userId, SUBSCRIPTION_TIERS.FREE);
      }
      processed++;
    }

    return processed;
  }

  /**
   * Initialize usage limits for a user based on their tier
   */
  private async initializeUsageLimits(userId: string, tier: Subscription['tier']): Promise<void> {
    const features = await this.subscriptionFeatureRepository.findByTier(tier);

    // Get limits from subscription features
    const swipesFeature = hasFeatureAccess(features, 'daily_swipes_limit');
    const likesFeature = hasFeatureAccess(features, 'daily_likes_limit');
    const superLikesFeature = hasFeatureAccess(features, 'daily_super_likes_limit');

    const limits = [
      { resourceType: RESOURCE_TYPES.SWIPES, dailyLimit: swipesFeature.limit || FREE_TIER_LIMITS.swipes },
      { resourceType: RESOURCE_TYPES.LIKES, dailyLimit: likesFeature.limit || FREE_TIER_LIMITS.likes },
      { resourceType: RESOURCE_TYPES.SUPER_LIKES, dailyLimit: superLikesFeature.limit || FREE_TIER_LIMITS.super_likes },
      { resourceType: RESOURCE_TYPES.REWINDS, dailyLimit: FREE_TIER_LIMITS.rewinds },
      { resourceType: RESOURCE_TYPES.BOOSTS, dailyLimit: FREE_TIER_LIMITS.boosts },
    ];

    for (const limit of limits) {
      await this.usageLimitRepository.create({
        userId,
        resourceType: limit.resourceType,
        dailyLimit: limit.dailyLimit,
      });
    }
  }

  /**
   * Update usage limits when tier changes
   */
  private async updateUsageLimitsForTier(userId: string, tier: Subscription['tier']): Promise<void> {
    const features = await this.subscriptionFeatureRepository.findByTier(tier);

    const swipesFeature = hasFeatureAccess(features, 'daily_swipes_limit');
    const likesFeature = hasFeatureAccess(features, 'daily_likes_limit');
    const superLikesFeature = hasFeatureAccess(features, 'daily_super_likes_limit');

    const limits = [
      { resourceType: RESOURCE_TYPES.SWIPES, dailyLimit: swipesFeature.limit || FREE_TIER_LIMITS.swipes },
      { resourceType: RESOURCE_TYPES.LIKES, dailyLimit: likesFeature.limit || FREE_TIER_LIMITS.likes },
      { resourceType: RESOURCE_TYPES.SUPER_LIKES, dailyLimit: superLikesFeature.limit || FREE_TIER_LIMITS.super_likes },
    ];

    for (const limit of limits) {
      const existing = await this.usageLimitRepository.findByUserIdAndResource(userId, limit.resourceType);
      if (existing) {
        await this.usageLimitRepository.update(existing.id, {
          dailyLimit: limit.dailyLimit,
        });
      }
    }
  }

  /**
   * Get subscription statistics for admin dashboard
   */
  async getSubscriptionStats() {
    // This would aggregate subscription data
    // Implementation depends on specific requirements
    return {
      totalSubscriptions: 0,
      activeSubscriptions: 0,
      byTier: {
        free: 0,
        basic: 0,
        plus: 0,
        premium: 0,
        premium_plus: 0,
        elite: 0,
      },
      revenue: {
        monthly: 0,
        quarterly: 0,
        semiannual: 0,
        annual: 0,
      },
    };
  }

  /**
   * Check if a tier upgrade is valid (can only upgrade to higher tiers)
   */
  isValidUpgrade(currentTier: Subscription['tier'], newTier: Subscription['tier']): boolean {
    return TIER_HIERARCHY[newTier] > TIER_HIERARCHY[currentTier];
  }

  /**
   * Check if a tier downgrade is valid (can only downgrade to lower tiers)
   */
  isValidDowngrade(currentTier: Subscription['tier'], newTier: Subscription['tier']): boolean {
    return TIER_HIERARCHY[newTier] < TIER_HIERARCHY[currentTier];
  }

  /**
   * Get the trial days for a specific tier
   */
  getTrialDays(tier: Subscription['tier']): number {
    return TRIAL_DAYS_BY_TIER[tier] || 0;
  }

  /**
   * Check if trial is active
   */
  async isTrialActive(userId: string): Promise<boolean> {
    const subscription = await this.subscriptionRepository.findByUserId(userId);
    if (!subscription) {
      return false;
    }

    if (subscription.status !== SUBSCRIPTION_STATUS.TRIALING) {
      return false;
    }

    if (!subscription.trialEnd) {
      return false;
    }

    const now = new Date();
    return subscription.trialEnd > now;
  }

  /**
   * Get trial end date for a user
   */
  async getTrialEndDate(userId: string): Promise<Date | null> {
    const subscription = await this.subscriptionRepository.findByUserId(userId);
    if (!subscription || !subscription.trialEnd) {
      return null;
    }

    return subscription.trialEnd;
  }

  /**
   * Convert trial to paid subscription
   */
  async convertTrialToPaid(userId: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findByUserId(userId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (subscription.status !== SUBSCRIPTION_STATUS.TRIALING) {
      throw new Error('Subscription is not in trial status');
    }

    const now = new Date();
    const nextPeriodEnd = new Date(now);
    nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);

    return await this.subscriptionRepository.update(subscription.id, {
      status: SUBSCRIPTION_STATUS.ACTIVE,
      currentPeriodStart: now,
      currentPeriodEnd: nextPeriodEnd,
    });
  }

  /**
   * Check if subscription is in grace period
   */
  async checkGracePeriod(userId: string): Promise<{ inGracePeriod: boolean; daysRemaining: number }> {
    const subscription = await this.subscriptionRepository.findByUserId(userId);
    if (!subscription || subscription.status !== SUBSCRIPTION_STATUS.GRACE_PERIOD) {
      return { inGracePeriod: false, daysRemaining: 0 };
    }

    if (!subscription.gracePeriodEnd) {
      return { inGracePeriod: false, daysRemaining: 0 };
    }

    const now = new Date();
    const gracePeriodEnd = new Date(subscription.gracePeriodEnd);
    const daysRemaining = Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      inGracePeriod: daysRemaining > 0,
      daysRemaining: Math.max(0, daysRemaining),
    };
  }

  /**
   * Enter grace period for failed payment
   */
  async enterGracePeriod(userId: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findByUserId(userId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const gracePeriodEnd = new Date();
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);

    return await this.subscriptionRepository.update(subscription.id, {
      status: SUBSCRIPTION_STATUS.GRACE_PERIOD,
      gracePeriodEnd,
    });
  }

  /**
   * Process subscriptions that have exceeded grace period (to be called by cron job)
   */
  async processExpiredGracePeriods(): Promise<number> {
    const expiredGracePeriods = await this.subscriptionRepository.findExpiredGracePeriods();
    let processed = 0;

    for (const subscription of expiredGracePeriods) {
      await this.subscriptionRepository.update(subscription.id, {
        status: SUBSCRIPTION_STATUS.CANCELED,
      });

      // Downgrade to free tier
      await this.updateUsageLimitsForTier(subscription.userId, SUBSCRIPTION_TIERS.FREE);
      processed++;
    }

    return processed;
  }
}

export default new SubscriptionService();
