import { Knex } from 'knex';
import { StreakRepository } from '../repositories/Streak.repository';
import {
  UserStreak,
  StreakType,
  StreakMilestone,
  UserStreakMilestone,
  StreakUpdateResult,
} from '../entities/Streak.entity';

export class StreakService {
  private repository: StreakRepository;

  constructor(private db: Knex) {
    this.repository = new StreakRepository(db);
  }

  async getUserStreaks(userId: string): Promise<UserStreak[]> {
    return this.repository.findUserStreaks(userId);
  }

  async getUserStreakByType(userId: string, streakType: StreakType): Promise<UserStreak | null> {
    return this.repository.findUserStreakByType(userId, streakType);
  }

  async updateLoginStreak(userId: string): Promise<StreakUpdateResult> {
    return this.updateStreak(userId, 'login');
  }

  async updateConversationStreak(userId: string): Promise<StreakUpdateResult> {
    return this.updateStreak(userId, 'conversation');
  }

  async updateMatchStreak(userId: string): Promise<StreakUpdateResult> {
    return this.updateStreak(userId, 'match');
  }

  async updateActivityStreak(userId: string): Promise<StreakUpdateResult> {
    return this.updateStreak(userId, 'activity');
  }

  private async updateStreak(userId: string, streakType: StreakType): Promise<StreakUpdateResult> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return this.db.transaction(async (trx) => {
      const repository = new StreakRepository(trx);

      // Get or create streak
      let streak = await repository.findUserStreakByType(userId, streakType);

      if (!streak) {
        // Create new streak
        streak = await repository.createUserStreak({
          userId,
          streakType,
          currentStreak: 1,
          longestStreak: 1,
          streakStartDate: today,
          lastActivityDate: today,
          isProtected: false,
          protectionCount: 0,
          streakHistory: [],
        });

        const milestonesReached = await this.checkAndAwardMilestones(
          repository,
          userId,
          streak.id,
          1,
          streakType
        );

        return {
          streak,
          increased: true,
          broken: false,
          protected: false,
          milestonesReached,
        };
      }

      const lastActivity = new Date(streak.lastActivityDate);
      const lastActivityDay = new Date(lastActivity.getFullYear(), lastActivity.getMonth(), lastActivity.getDate());
      const daysDifference = Math.floor((today.getTime() - lastActivityDay.getTime()) / (1000 * 60 * 60 * 24));

      let increased = false;
      let broken = false;
      let wasProtected = false;
      let newStreakCount = streak.currentStreak;

      if (daysDifference === 0) {
        // Already recorded activity today
        return {
          streak,
          increased: false,
          broken: false,
          protected: false,
          milestonesReached: [],
        };
      } else if (daysDifference === 1) {
        // Consecutive day - increase streak
        newStreakCount = streak.currentStreak + 1;
        increased = true;

        const updatedStreak = await repository.updateUserStreak(streak.id, {
          currentStreak: newStreakCount,
          longestStreak: Math.max(newStreakCount, streak.longestStreak),
          lastActivityDate: today,
        });

        streak = updatedStreak;
      } else {
        // Streak broken
        if (streak.isProtected && streak.protectionExpiresAt && new Date(streak.protectionExpiresAt) > now) {
          // Streak is protected - maintain it
          wasProtected = true;

          const updatedStreak = await repository.updateUserStreak(streak.id, {
            lastActivityDate: today,
            isProtected: false,
            protectionExpiresAt: null,
          });

          streak = updatedStreak;
        } else {
          // Reset streak
          broken = true;
          newStreakCount = 1;

          // Save to history
          const history = Array.isArray(streak.streakHistory) ? streak.streakHistory : [];
          history.push({
            streak: streak.currentStreak,
            startDate: streak.streakStartDate,
            endDate: lastActivity,
            brokenAt: now,
          });

          const updatedStreak = await repository.updateUserStreak(streak.id, {
            currentStreak: 1,
            streakStartDate: today,
            lastActivityDate: today,
            streakHistory: history,
          });

          streak = updatedStreak;
        }
      }

      // Check for milestone achievements
      const milestonesReached = increased
        ? await this.checkAndAwardMilestones(repository, userId, streak.id, newStreakCount, streakType)
        : [];

      return {
        streak,
        increased,
        broken,
        protected: wasProtected,
        milestonesReached,
      };
    });
  }

  private async checkAndAwardMilestones(
    repository: StreakRepository,
    userId: string,
    streakId: string,
    currentStreak: number,
    streakType: StreakType
  ): Promise<StreakMilestone[]> {
    const milestones = await repository.findMilestonesByType(streakType);
    const userMilestones = await repository.findUserMilestones(userId);
    const achievedMilestoneIds = new Set(userMilestones.map(um => um.milestoneId));

    const newMilestonesReached: StreakMilestone[] = [];

    for (const milestone of milestones) {
      if (currentStreak >= milestone.daysRequired && !achievedMilestoneIds.has(milestone.id)) {
        // Award milestone
        await repository.createUserMilestone({
          userId,
          milestoneId: milestone.id,
          streakId,
          streakAtAchievement: currentStreak,
          rewardClaimed: false,
        });

        newMilestonesReached.push(milestone);

        // Award rewards automatically
        await this.awardMilestoneRewards(this.db, userId, milestone);
      }
    }

    return newMilestonesReached;
  }

  private async awardMilestoneRewards(db: Knex, userId: string, milestone: StreakMilestone): Promise<void> {
    // Award coins
    if (milestone.coinReward > 0) {
      await this.awardCoins(db, userId, milestone.coinReward, `Streak Milestone: ${milestone.title}`);
    }

    // Award boosts
    if (milestone.boostReward > 0) {
      await this.awardBoosts(db, userId, milestone.boostReward);
    }

    // Award super likes
    if (milestone.superLikeReward > 0) {
      await this.awardSuperLikes(db, userId, milestone.superLikeReward);
    }
  }

  async protectStreak(userId: string, streakType: StreakType, durationHours: number = 24): Promise<UserStreak> {
    const streak = await this.repository.findUserStreakByType(userId, streakType);

    if (!streak) {
      throw new Error('Streak not found');
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + durationHours);

    return this.repository.updateUserStreak(streak.id, {
      isProtected: true,
      protectionCount: streak.protectionCount + 1,
      protectionExpiresAt: expiresAt,
    });
  }

  async getStreakLeaderboard(streakType: StreakType, limit: number = 10): Promise<any[]> {
    return this.repository.getTopStreaksByType(streakType, limit);
  }

  async getMilestonesByType(streakType: StreakType): Promise<StreakMilestone[]> {
    return this.repository.findMilestonesByType(streakType);
  }

  async getUserMilestones(userId: string): Promise<UserStreakMilestone[]> {
    return this.repository.findUserMilestonesWithDetails(userId);
  }

  private async awardCoins(db: Knex, userId: string, amount: number, reason: string): Promise<void> {
    const existingCoins = await db('coins').where({ user_id: userId }).first();

    if (existingCoins) {
      await db('coins')
        .where({ user_id: userId })
        .increment('balance', amount)
        .increment('total_earned', amount)
        .update({ updated_at: db.fn.now() });
    } else {
      await db('coins').insert({
        user_id: userId,
        balance: amount,
        total_earned: amount,
        total_spent: 0,
        total_purchased: 0,
      });
    }

    await db('coin_transactions').insert({
      user_id: userId,
      amount,
      type: 'earned',
      source: 'streak_milestone',
      description: reason,
      balance_after: existingCoins ? existingCoins.balance + amount : amount,
    });
  }

  private async awardBoosts(db: Knex, userId: string, count: number): Promise<void> {
    const existingBoosts = await db('boosts').where({ user_id: userId }).first();

    if (existingBoosts) {
      await db('boosts')
        .where({ user_id: userId })
        .increment('available_count', count)
        .update({ updated_at: db.fn.now() });
    } else {
      await db('boosts').insert({
        user_id: userId,
        available_count: count,
        total_purchased: 0,
        total_used: 0,
      });
    }
  }

  private async awardSuperLikes(db: Knex, userId: string, count: number): Promise<void> {
    const usageLimit = await db('usage_limits').where({ user_id: userId }).first();

    if (usageLimit) {
      await db('usage_limits')
        .where({ user_id: userId })
        .increment('super_likes_remaining', count)
        .update({ updated_at: db.fn.now() });
    }
  }
}
