/**
 * Daily Limits Service
 * Redis-based usage tracking and limit enforcement for freemium features
 */

import { logger } from '../../utils/logger';

// Redis client interface (can use ioredis or node-redis)
interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, duration?: number): Promise<string>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
  del(key: string): Promise<number>;
  hgetall(key: string): Promise<Record<string, string>>;
  hmset(key: string, ...args: string[]): Promise<string>;
  hincrby(key: string, field: string, increment: number): Promise<number>;
  hget(key: string, field: string): Promise<string | null>;
}

// Subscription tier limits
export const TIER_LIMITS = {
  FREE: {
    swipes: 50,
    likes: 50,
    superLikes: 1,
    rewinds: 1,
    boosts: 0,
    messages: 50,
    profileViews: 100,
    advancedFilters: false,
    seeWhoLikedYou: false,
    readReceipts: false,
    incognitoMode: false,
    priorityLikes: false,
    unlimitedRewinds: false,
  },
  GOLD: {
    swipes: 200,
    likes: 200,
    superLikes: 5,
    rewinds: 5,
    boosts: 1,
    messages: 500,
    profileViews: -1, // unlimited
    advancedFilters: true,
    seeWhoLikedYou: true,
    readReceipts: false,
    incognitoMode: false,
    priorityLikes: false,
    unlimitedRewinds: false,
  },
  PLATINUM: {
    swipes: 500,
    likes: 500,
    superLikes: 10,
    rewinds: 10,
    boosts: 3,
    messages: -1,
    profileViews: -1,
    advancedFilters: true,
    seeWhoLikedYou: true,
    readReceipts: true,
    incognitoMode: true,
    priorityLikes: true,
    unlimitedRewinds: false,
  },
  DIAMOND: {
    swipes: -1, // unlimited
    likes: -1,
    superLikes: 15,
    rewinds: -1,
    boosts: 5,
    messages: -1,
    profileViews: -1,
    advancedFilters: true,
    seeWhoLikedYou: true,
    readReceipts: true,
    incognitoMode: true,
    priorityLikes: true,
    unlimitedRewinds: true,
  },
};

export type SubscriptionTier = keyof typeof TIER_LIMITS;
export type ResourceType = 'swipes' | 'likes' | 'superLikes' | 'rewinds' | 'boosts' | 'messages' | 'profileViews';

export interface UsageStatus {
  resourceType: ResourceType;
  used: number;
  limit: number;
  remaining: number;
  isUnlimited: boolean;
  resetsAt: Date;
  percentUsed: number;
}

export interface DailyUsage {
  swipes: UsageStatus;
  likes: UsageStatus;
  superLikes: UsageStatus;
  rewinds: UsageStatus;
  boosts: UsageStatus;
  messages: UsageStatus;
  profileViews: UsageStatus;
}

export interface LimitCheckResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetsAt: Date;
  upgradeRequired: boolean;
  suggestedTier?: SubscriptionTier;
}

class DailyLimitsService {
  private redis: RedisClient | null = null;
  private readonly KEY_PREFIX = 'daily_limits';
  private readonly SECONDS_IN_DAY = 86400;

  /**
   * Initialize with Redis client
   */
  initialize(redisClient: RedisClient): void {
    this.redis = redisClient;
    logger.info('DailyLimitsService initialized with Redis');
  }

  /**
   * Get Redis key for user's daily usage
   */
  private getKey(userId: string, resourceType: ResourceType, date?: string): string {
    const dateKey = date || this.getTodayKey();
    return `${this.KEY_PREFIX}:${userId}:${resourceType}:${dateKey}`;
  }

  /**
   * Get today's date key (YYYY-MM-DD)
   */
  private getTodayKey(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Get seconds until midnight (reset time)
   */
  private getSecondsUntilMidnight(): number {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return Math.floor((midnight.getTime() - now.getTime()) / 1000);
  }

  /**
   * Get reset time (next midnight)
   */
  private getResetTime(): Date {
    const tomorrow = new Date();
    tomorrow.setHours(24, 0, 0, 0);
    return tomorrow;
  }

  /**
   * Check if user can perform action and get remaining count
   */
  async checkLimit(
    userId: string,
    resourceType: ResourceType,
    tier: SubscriptionTier = 'FREE'
  ): Promise<LimitCheckResult> {
    const limit = TIER_LIMITS[tier][resourceType];
    const isUnlimited = limit === -1;

    if (isUnlimited) {
      return {
        allowed: true,
        remaining: -1,
        limit: -1,
        resetsAt: this.getResetTime(),
        upgradeRequired: false,
      };
    }

    const used = await this.getUsage(userId, resourceType);
    const remaining = Math.max(0, limit - used);

    const result: LimitCheckResult = {
      allowed: remaining > 0,
      remaining,
      limit,
      resetsAt: this.getResetTime(),
      upgradeRequired: remaining === 0,
    };

    // Suggest upgrade tier if limit reached
    if (result.upgradeRequired) {
      result.suggestedTier = this.getSuggestedUpgradeTier(tier, resourceType);
    }

    return result;
  }

  /**
   * Increment usage for a resource
   */
  async incrementUsage(
    userId: string,
    resourceType: ResourceType,
    tier: SubscriptionTier = 'FREE',
    amount: number = 1
  ): Promise<{ success: boolean; newCount: number; remaining: number }> {
    const limit = TIER_LIMITS[tier][resourceType];
    const isUnlimited = limit === -1;

    if (!this.redis) {
      // Fallback to in-memory tracking (not recommended for production)
      logger.warn('Redis not available, using fallback tracking');
      return { success: true, newCount: amount, remaining: isUnlimited ? -1 : limit - amount };
    }

    const key = this.getKey(userId, resourceType);

    // Check current usage
    const currentUsage = await this.getUsage(userId, resourceType);

    if (!isUnlimited && currentUsage >= limit) {
      return {
        success: false,
        newCount: currentUsage,
        remaining: 0,
      };
    }

    // Increment usage
    const newCount = await this.redis.incr(key);

    // Set expiration if this is the first usage of the day
    if (newCount === 1) {
      await this.redis.expire(key, this.getSecondsUntilMidnight());
    }

    const remaining = isUnlimited ? -1 : Math.max(0, limit - newCount);

    logger.debug(`User ${userId} ${resourceType} usage: ${newCount}/${limit === -1 ? '∞' : limit}`);

    return {
      success: true,
      newCount,
      remaining,
    };
  }

  /**
   * Get current usage for a resource
   */
  async getUsage(userId: string, resourceType: ResourceType): Promise<number> {
    if (!this.redis) {
      return 0;
    }

    const key = this.getKey(userId, resourceType);
    const value = await this.redis.get(key);
    return value ? parseInt(value, 10) : 0;
  }

  /**
   * Get full daily usage status for a user
   */
  async getDailyUsage(userId: string, tier: SubscriptionTier = 'FREE'): Promise<DailyUsage> {
    const resourceTypes: ResourceType[] = [
      'swipes', 'likes', 'superLikes', 'rewinds', 'boosts', 'messages', 'profileViews'
    ];

    const usagePromises = resourceTypes.map(async (resourceType) => {
      const used = await this.getUsage(userId, resourceType);
      const limit = TIER_LIMITS[tier][resourceType];
      const isUnlimited = limit === -1;
      const remaining = isUnlimited ? -1 : Math.max(0, limit - used);
      const percentUsed = isUnlimited ? 0 : Math.min(100, (used / limit) * 100);

      return {
        resourceType,
        status: {
          resourceType,
          used,
          limit,
          remaining,
          isUnlimited,
          resetsAt: this.getResetTime(),
          percentUsed,
        } as UsageStatus,
      };
    });

    const results = await Promise.all(usagePromises);

    const usage: Record<string, UsageStatus> = {};
    for (const result of results) {
      usage[result.resourceType] = result.status;
    }

    return usage as DailyUsage;
  }

  /**
   * Reset usage for a specific resource (admin function or for testing)
   */
  async resetUsage(userId: string, resourceType: ResourceType): Promise<void> {
    if (!this.redis) return;

    const key = this.getKey(userId, resourceType);
    await this.redis.del(key);
    logger.info(`Reset ${resourceType} usage for user ${userId}`);
  }

  /**
   * Reset all usage for a user (admin function or for testing)
   */
  async resetAllUsage(userId: string): Promise<void> {
    const resourceTypes: ResourceType[] = [
      'swipes', 'likes', 'superLikes', 'rewinds', 'boosts', 'messages', 'profileViews'
    ];

    await Promise.all(
      resourceTypes.map(resourceType => this.resetUsage(userId, resourceType))
    );

    logger.info(`Reset all daily usage for user ${userId}`);
  }

  /**
   * Add bonus usage (from rewards, purchases, etc.)
   */
  async addBonusUsage(
    userId: string,
    resourceType: ResourceType,
    amount: number
  ): Promise<void> {
    if (!this.redis) return;

    // Store bonus in a separate key that doesn't expire daily
    const bonusKey = `${this.KEY_PREFIX}:${userId}:${resourceType}:bonus`;
    await this.redis.incr(bonusKey);

    logger.info(`Added ${amount} bonus ${resourceType} for user ${userId}`);
  }

  /**
   * Get time until limits reset
   */
  getTimeUntilReset(): { hours: number; minutes: number; seconds: number } {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);

    const diff = midnight.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { hours, minutes, seconds };
  }

  /**
   * Check if a premium feature is available for a tier
   */
  isPremiumFeatureAvailable(
    tier: SubscriptionTier,
    feature: 'advancedFilters' | 'seeWhoLikedYou' | 'readReceipts' | 'incognitoMode' | 'priorityLikes' | 'unlimitedRewinds'
  ): boolean {
    return TIER_LIMITS[tier][feature] === true;
  }

  /**
   * Get suggested upgrade tier based on current tier and resource type
   */
  private getSuggestedUpgradeTier(
    currentTier: SubscriptionTier,
    resourceType: ResourceType
  ): SubscriptionTier | undefined {
    const tierOrder: SubscriptionTier[] = ['FREE', 'GOLD', 'PLATINUM', 'DIAMOND'];
    const currentIndex = tierOrder.indexOf(currentTier);

    for (let i = currentIndex + 1; i < tierOrder.length; i++) {
      const tier = tierOrder[i];
      const limit = TIER_LIMITS[tier][resourceType];
      const currentLimit = TIER_LIMITS[currentTier][resourceType];

      // Check if this tier offers more
      if (limit === -1 || limit > currentLimit) {
        return tier;
      }
    }

    return undefined;
  }

  /**
   * Get upgrade prompt message
   */
  getUpgradePrompt(
    resourceType: ResourceType,
    suggestedTier: SubscriptionTier
  ): { title: string; message: string; ctaText: string } {
    const messages: Record<ResourceType, { title: string; message: string }> = {
      swipes: {
        title: "You've run out of swipes!",
        message: "Upgrade to continue swiping and find your perfect match.",
      },
      likes: {
        title: "You've reached your daily like limit!",
        message: "Upgrade for more likes and never miss a potential match.",
      },
      superLikes: {
        title: "No more Super Likes today!",
        message: "Get more Super Likes to stand out and get noticed.",
      },
      rewinds: {
        title: "No rewinds remaining!",
        message: "Upgrade to undo accidental swipes and never miss a match.",
      },
      boosts: {
        title: "Boost your profile!",
        message: "Get more boosts to be seen by more people.",
      },
      messages: {
        title: "Message limit reached!",
        message: "Upgrade for unlimited messaging with your matches.",
      },
      profileViews: {
        title: "Profile view limit reached!",
        message: "Upgrade to see unlimited profiles.",
      },
    };

    const tierPricing: Record<SubscriptionTier, string> = {
      FREE: '',
      GOLD: 'Starting at $19.99/month',
      PLATINUM: 'Starting at $29.99/month',
      DIAMOND: 'Starting at $49.99/month',
    };

    return {
      ...messages[resourceType],
      ctaText: `Upgrade to ${suggestedTier} - ${tierPricing[suggestedTier]}`,
    };
  }
}

export const dailyLimitsService = new DailyLimitsService();
