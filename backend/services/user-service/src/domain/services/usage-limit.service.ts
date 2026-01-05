import {
  UsageLimit,
  isLimitReached,
  needsReset,
  RESOURCE_TYPES,
} from '../entities/UsageLimit.entity';
import { UsageLimitRepository } from '../repositories/usage-limit.repository';

export class UsageLimitService {
  private usageLimitRepository: UsageLimitRepository;

  constructor(usageLimitRepository?: UsageLimitRepository) {
    this.usageLimitRepository = usageLimitRepository || new UsageLimitRepository();
  }

  /**
   * Check if user can perform an action (has not reached limit)
   */
  async canPerformAction(
    userId: string,
    resourceType: UsageLimit['resourceType']
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date | null }> {
    const limit = await this.usageLimitRepository.findByUserIdAndResource(userId, resourceType);

    if (!limit) {
      // No limit set means unlimited (premium users)
      return { allowed: true, remaining: -1, resetAt: null };
    }

    // Check if limit needs reset
    if (needsReset(limit)) {
      await this.usageLimitRepository.resetUsage(limit.id);
      const updated = await this.usageLimitRepository.findById(limit.id);
      if (updated) {
        return {
          allowed: true,
          remaining: updated.dailyLimit - updated.currentUsage,
          resetAt: updated.resetAt,
        };
      }
    }

    const reached = isLimitReached(limit);
    const remaining = Math.max(0, limit.dailyLimit - limit.currentUsage);

    return {
      allowed: !reached,
      remaining,
      resetAt: limit.resetAt,
    };
  }

  /**
   * Increment usage for a specific resource type
   */
  async incrementUsage(
    userId: string,
    resourceType: UsageLimit['resourceType'],
    amount: number = 1
  ): Promise<UsageLimit> {
    const limit = await this.usageLimitRepository.findByUserIdAndResource(userId, resourceType);

    if (!limit) {
      throw new Error(`No usage limit found for user and resource type: ${resourceType}`);
    }

    // Check if limit needs reset before incrementing
    if (needsReset(limit)) {
      await this.usageLimitRepository.resetUsage(limit.id);
    }

    return await this.usageLimitRepository.incrementUsage(limit.id, amount);
  }

  /**
   * Get all usage limits for a user
   */
  async getUserLimits(userId: string): Promise<{
    [key: string]: {
      current: number;
      limit: number;
      remaining: number;
      resetAt: Date;
      isReached: boolean;
    };
  }> {
    const limits = await this.usageLimitRepository.findByUserId(userId);
    const result: any = {};

    for (const limit of limits) {
      // Check if needs reset
      if (needsReset(limit)) {
        await this.usageLimitRepository.resetUsage(limit.id);
        const updated = await this.usageLimitRepository.findById(limit.id);
        if (updated) {
          result[limit.resourceType] = {
            current: updated.currentUsage,
            limit: updated.dailyLimit,
            remaining: Math.max(0, updated.dailyLimit - updated.currentUsage),
            resetAt: updated.resetAt,
            isReached: isLimitReached(updated),
          };
        }
      } else {
        result[limit.resourceType] = {
          current: limit.currentUsage,
          limit: limit.dailyLimit,
          remaining: Math.max(0, limit.dailyLimit - limit.currentUsage),
          resetAt: limit.resetAt,
          isReached: isLimitReached(limit),
        };
      }
    }

    return result;
  }

  /**
   * Get usage status for a specific resource
   */
  async getResourceUsage(
    userId: string,
    resourceType: UsageLimit['resourceType']
  ): Promise<{
    current: number;
    limit: number;
    remaining: number;
    resetAt: Date;
    isReached: boolean;
  } | null> {
    const limit = await this.usageLimitRepository.findByUserIdAndResource(userId, resourceType);

    if (!limit) {
      return null;
    }

    // Check if needs reset
    if (needsReset(limit)) {
      await this.usageLimitRepository.resetUsage(limit.id);
      const updated = await this.usageLimitRepository.findById(limit.id);
      if (!updated) return null;

      return {
        current: updated.currentUsage,
        limit: updated.dailyLimit,
        remaining: Math.max(0, updated.dailyLimit - updated.currentUsage),
        resetAt: updated.resetAt,
        isReached: isLimitReached(updated),
      };
    }

    return {
      current: limit.currentUsage,
      limit: limit.dailyLimit,
      remaining: Math.max(0, limit.dailyLimit - limit.currentUsage),
      resetAt: limit.resetAt,
      isReached: isLimitReached(limit),
    };
  }

  /**
   * Reset all limits for a user (admin function)
   */
  async resetUserLimits(userId: string): Promise<number> {
    const limits = await this.usageLimitRepository.resetAllUserLimits(userId);
    return limits.length;
  }

  /**
   * Process all limits that need reset (cron job)
   */
  async processLimitResets(): Promise<number> {
    const limitsToReset = await this.usageLimitRepository.findLimitsNeedingReset();
    let processed = 0;

    for (const limit of limitsToReset) {
      await this.usageLimitRepository.resetUsage(limit.id);
      processed++;
    }

    return processed;
  }

  /**
   * Update limit for a specific resource (when subscription changes)
   */
  async updateResourceLimit(
    userId: string,
    resourceType: UsageLimit['resourceType'],
    newLimit: number
  ): Promise<UsageLimit> {
    const limit = await this.usageLimitRepository.findByUserIdAndResource(userId, resourceType);

    if (!limit) {
      // Create new limit if doesn't exist
      return await this.usageLimitRepository.create({
        userId,
        resourceType,
        dailyLimit: newLimit,
      });
    }

    return await this.usageLimitRepository.update(limit.id, {
      dailyLimit: newLimit,
    });
  }

  /**
   * Check if action would exceed limit (without incrementing)
   */
  async wouldExceedLimit(
    userId: string,
    resourceType: UsageLimit['resourceType'],
    amount: number = 1
  ): Promise<boolean> {
    const limit = await this.usageLimitRepository.findByUserIdAndResource(userId, resourceType);

    if (!limit) {
      return false; // No limit means unlimited
    }

    // Check if needs reset
    if (needsReset(limit)) {
      return false; // After reset, won't exceed
    }

    return limit.currentUsage + amount > limit.dailyLimit;
  }

  /**
   * Get time until next reset for a resource
   */
  async getTimeUntilReset(
    userId: string,
    resourceType: UsageLimit['resourceType']
  ): Promise<number | null> {
    const limit = await this.usageLimitRepository.findByUserIdAndResource(userId, resourceType);

    if (!limit) {
      return null;
    }

    const now = new Date().getTime();
    const resetTime = new Date(limit.resetAt).getTime();
    const millisecondsUntilReset = resetTime - now;

    return Math.max(0, millisecondsUntilReset);
  }
}

export default new UsageLimitService();
