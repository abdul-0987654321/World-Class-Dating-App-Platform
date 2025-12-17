import { Knex } from 'knex';
import { DailyRewardRepository } from '../repositories/DailyReward.repository';
import {
  DailyReward,
  DailyRewardStatus,
  ClaimRewardResult,
  RewardCalendarConfig,
  calculateStreakStatus,
  calculateNextDayInCycle,
  calculateHoursUntilNextClaim,
  calculateRewardAmount,
  RewardType,
} from '../entities/DailyReward.entity';

export class DailyRewardService {
  private repository: DailyRewardRepository;

  constructor(private db: Knex) {
    this.repository = new DailyRewardRepository(db);
  }

  async getDailyRewardStatus(userId: string): Promise<DailyRewardStatus> {
    const reward = await this.repository.findOrCreate(userId);
    const calendar = await this.repository.getRewardCalendar();

    const streakStatus = calculateStreakStatus(reward.lastClaimDate);

    let currentStreak = reward.streakCount;
    let dayInCycle = reward.dayInCycle;

    // If streak is broken, reset
    if (streakStatus.isMissedDay) {
      currentStreak = 0;
      dayInCycle = 1;
    }

    const todayReward = calendar.find(c => c.dayNumber === dayInCycle) || null;
    const nextRewards = calendar.filter(c => c.dayNumber > dayInCycle);

    return {
      canClaim: streakStatus.canClaimToday,
      currentStreak,
      longestStreak: reward.longestStreak,
      dayInCycle,
      todayReward,
      nextRewards,
      hoursUntilNextClaim: calculateHoursUntilNextClaim(reward.lastClaimDate),
      totalLoginDays: reward.totalLogins,
    };
  }

  async claimDailyReward(userId: string): Promise<ClaimRewardResult> {
    return this.db.transaction(async (trx) => {
      const repository = new DailyRewardRepository(trx);
      const reward = await repository.findOrCreate(userId);

      // Check if user can claim
      const streakStatus = calculateStreakStatus(reward.lastClaimDate);

      if (!streakStatus.canClaimToday) {
        return {
          success: false,
          reward: {
            type: 'coins' as RewardType,
            amount: 0,
            dayNumber: reward.dayInCycle,
            streakBonus: 0,
          },
          newStreak: reward.streakCount,
          nextReward: null,
          message: 'You have already claimed your reward today. Come back tomorrow!',
        };
      }

      // Calculate new streak
      let newStreakCount = reward.streakCount;
      let currentStreakStart = reward.currentStreakStart;

      if (streakStatus.isMissedDay) {
        // Streak broken, reset
        newStreakCount = 1;
        currentStreakStart = new Date();
      } else if (streakStatus.isStreakActive) {
        // Continue streak
        newStreakCount = reward.streakCount + 1;
      } else {
        // First login
        newStreakCount = 1;
        currentStreakStart = new Date();
      }

      // Determine day in cycle
      const dayInCycle = streakStatus.isMissedDay
        ? 1
        : reward.dayInCycle;

      // Get reward configuration for today
      const rewardConfig = await repository.getRewardForDay(dayInCycle);

      if (!rewardConfig) {
        throw new Error(`Reward configuration not found for day ${dayInCycle}`);
      }

      // Calculate reward amount with bonuses
      const rewardAmount = calculateRewardAmount(
        rewardConfig.baseAmount,
        newStreakCount,
        rewardConfig.streakMultiplier,
        rewardConfig.isSpecialDay
      );

      // Create claim record
      await repository.createClaim({
        userId,
        dayNumber: dayInCycle,
        streakAtClaim: newStreakCount,
        rewardType: rewardConfig.rewardType,
        rewardAmount,
        rewardDetails: {
          baseAmount: rewardConfig.baseAmount,
          streakBonus: rewardAmount - rewardConfig.baseAmount,
          isSpecialDay: rewardConfig.isSpecialDay,
        },
      });

      // Update rewards history
      const historyEntry = {
        date: new Date().toISOString().split('T')[0],
        dayNumber: dayInCycle,
        rewardType: rewardConfig.rewardType,
        amount: rewardAmount,
        streakCount: newStreakCount,
      };

      const updatedHistory = [...reward.rewardsHistory, historyEntry].slice(-30); // Keep last 30

      // Update daily reward record
      const nextDayInCycle = calculateNextDayInCycle(dayInCycle, false);
      const longestStreak = Math.max(reward.longestStreak, newStreakCount);

      await repository.update(userId, {
        streakCount: newStreakCount,
        totalLogins: reward.totalLogins + 1,
        longestStreak,
        lastClaimDate: new Date(),
        currentStreakStart,
        dayInCycle: nextDayInCycle,
        canClaimToday: false,
        rewardsHistory: updatedHistory,
      });

      // Apply reward to user account
      await this.applyReward(trx, userId, rewardConfig.rewardType, rewardAmount);

      // Get next reward
      const nextReward = await repository.getRewardForDay(nextDayInCycle);

      return {
        success: true,
        reward: {
          type: rewardConfig.rewardType,
          amount: rewardAmount,
          dayNumber: dayInCycle,
          streakBonus: rewardAmount - rewardConfig.baseAmount,
        },
        newStreak: newStreakCount,
        nextReward,
        message: `Claimed ${rewardAmount} ${rewardConfig.rewardType}! ${newStreakCount} day streak!`,
      };
    });
  }

  private async applyReward(
    trx: Knex.Transaction,
    userId: string,
    rewardType: RewardType,
    amount: number
  ): Promise<void> {
    switch (rewardType) {
      case 'coins':
        await this.addCoins(trx, userId, amount);
        break;
      case 'super_likes':
        await this.addSuperLikes(trx, userId, amount);
        break;
      case 'boosts':
        await this.addBoosts(trx, userId, amount);
        break;
      case 'premium_trial':
        await this.addPremiumTrial(trx, userId, amount);
        break;
    }
  }

  private async addCoins(trx: Knex.Transaction, userId: string, amount: number): Promise<void> {
    // Update coins table
    const existingCoins = await trx('coins').where({ user_id: userId }).first();

    if (existingCoins) {
      await trx('coins')
        .where({ user_id: userId })
        .increment('balance', amount)
        .increment('total_earned', amount)
        .update({ updated_at: trx.fn.now() });
    } else {
      await trx('coins').insert({
        user_id: userId,
        balance: amount,
        total_earned: amount,
        total_spent: 0,
        total_purchased: 0,
      });
    }

    // Create transaction record
    await trx('coin_transactions').insert({
      user_id: userId,
      amount,
      type: 'earned',
      source: 'daily_reward',
      description: 'Daily login reward',
      balance_after: existingCoins ? existingCoins.balance + amount : amount,
    });
  }

  private async addSuperLikes(trx: Knex.Transaction, userId: string, amount: number): Promise<void> {
    // Update usage limits to add super likes
    const existingLimits = await trx('usage_limits').where({ user_id: userId }).first();

    if (existingLimits) {
      const currentSuperLikes = existingLimits.super_likes_remaining || 0;
      await trx('usage_limits')
        .where({ user_id: userId })
        .update({
          super_likes_remaining: currentSuperLikes + amount,
          updated_at: trx.fn.now(),
        });
    } else {
      await trx('usage_limits').insert({
        user_id: userId,
        super_likes_remaining: amount,
      });
    }
  }

  private async addBoosts(trx: Knex.Transaction, userId: string, amount: number): Promise<void> {
    // Update boosts table
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year

    for (let i = 0; i < amount; i++) {
      await trx('boosts').insert({
        user_id: userId,
        type: 'standard',
        duration_minutes: 30,
        expires_at: expiresAt,
        is_used: false,
        source: 'daily_reward',
      });
    }
  }

  private async addPremiumTrial(trx: Knex.Transaction, userId: string, days: number): Promise<void> {
    // Check if user already has premium
    const existingSub = await trx('subscriptions')
      .where({ user_id: userId })
      .where('ends_at', '>', trx.fn.now())
      .first();

    if (existingSub) {
      // Extend existing subscription
      const currentEnd = new Date(existingSub.ends_at);
      const newEnd = new Date(currentEnd.getTime() + days * 24 * 60 * 60 * 1000);

      await trx('subscriptions')
        .where({ id: existingSub.id })
        .update({
          ends_at: newEnd,
          updated_at: trx.fn.now(),
        });
    } else {
      // Create new trial subscription
      const now = new Date();
      const endsAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      await trx('subscriptions').insert({
        user_id: userId,
        tier: 'premium',
        status: 'active',
        starts_at: now,
        ends_at: endsAt,
        is_trial: true,
        payment_method: 'reward',
      });
    }
  }

  async getRewardCalendar(): Promise<RewardCalendarConfig[]> {
    return this.repository.getRewardCalendar();
  }

  async getUserRewardStats(userId: string): Promise<any> {
    return this.repository.getUserRewardStats(userId);
  }

  async getRewardHistory(userId: string, limit: number = 30): Promise<any> {
    return this.repository.findClaimsByUserId(userId, limit);
  }

  async getTopStreakUsers(limit: number = 10): Promise<any> {
    return this.repository.getTopStreakUsers(limit);
  }

  async updateRewardCalendar(
    dayNumber: number,
    update: Partial<RewardCalendarConfig>
  ): Promise<RewardCalendarConfig> {
    return this.repository.updateRewardConfig(dayNumber, update);
  }
}
