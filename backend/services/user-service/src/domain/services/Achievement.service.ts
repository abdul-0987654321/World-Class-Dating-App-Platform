import { Knex } from 'knex';
import { AchievementRepository } from '../repositories/Achievement.repository';
import {
  AchievementDefinition,
  UserAchievement,
  UserAchievementWithDefinition,
  UserAchievementStats,
  AchievementProgressUpdate,
  AchievementUnlockResult,
  AchievementShowcase,
  calculateProgressPercentage,
  isAchievementComplete,
} from '../entities/Achievement.entity';

export class AchievementService {
  private repository: AchievementRepository;

  constructor(private db: Knex) {
    this.repository = new AchievementRepository(db);
  }

  async getUserAchievements(userId: string): Promise<UserAchievementWithDefinition[]> {
    return this.repository.findUserAchievementsWithDefinitions(userId);
  }

  async getUserAchievementsByCategory(
    userId: string,
    category: string
  ): Promise<UserAchievementWithDefinition[]> {
    return this.repository.findUserAchievementsWithDefinitions(userId, {
      category: category as any,
    });
  }

  async getUnlockedAchievements(userId: string): Promise<UserAchievementWithDefinition[]> {
    return this.repository.findUserAchievementsWithDefinitions(userId, {
      isUnlocked: true,
    });
  }

  async getShowcasedAchievements(userId: string): Promise<AchievementShowcase> {
    const achievements = await this.repository.findUserAchievementsWithDefinitions(userId, {
      isShowcased: true,
    });

    achievements.sort((a, b) => {
      const orderA = (a as any).showcase_order ?? 999;
      const orderB = (b as any).showcase_order ?? 999;
      return orderA - orderB;
    });

    const stats = await this.getUserStats(userId);

    return {
      user_id: userId,
      achievement_ids: achievements.map(a => a.achievement_id),
    };
  }

  async getUserStats(userId: string): Promise<UserAchievementStats> {
    return this.repository.findOrCreateUserStats(userId);
  }

  async updateProgress(
    userId: string,
    updates: AchievementProgressUpdate[]
  ): Promise<AchievementUnlockResult[]> {
    const results: AchievementUnlockResult[] = [];

    await this.db.transaction(async (trx) => {
      const repository = new AchievementRepository(trx);

      for (const update of updates) {
        const result = await this.processProgressUpdate(repository, userId, update);
        if (result) {
          results.push(result);
        }
      }

      // Recalculate stats if any achievements were unlocked
      if (results.some(r => r.unlocked)) {
        await repository.recalculateUserStats(userId);
      }
    });

    return results;
  }

  private async processProgressUpdate(
    repository: AchievementRepository,
    userId: string,
    update: AchievementProgressUpdate
  ): Promise<AchievementUnlockResult | null> {
    // Get achievement definition
    const definition = await repository.findDefinitionByKey(update.achievement_slug);
    if (!definition || !definition.is_active) {
      return null;
    }

    // Get or create user achievement
    const userAchievement = await repository.findOrCreateUserAchievement(
      userId,
      definition.id,
      definition.target_value || undefined
    );

    // Skip if already unlocked and not repeatable
    if (userAchievement.is_completed && !(definition as any).is_repeatable) {
      return null;
    }

    // Calculate new progress
    const previousProgress = userAchievement.current_progress;
    const incrementBy = update.progress_increment !== undefined ? update.progress_increment : 1;
    const newProgress = previousProgress + incrementBy;

    const target = definition.target_value || 1;
    const progressPercentage = calculateProgressPercentage(newProgress, target);

    // Update progress
    await repository.updateUserAchievement(userId, definition.id, {
      current_progress: newProgress,
    });

    // Log progress
    await repository.createProgressLog({
      user_id: userId,
      achievement_id: definition.id,
      progress_change: incrementBy,
      old_progress: previousProgress,
      new_progress: newProgress,
      event_type: 'progress_update',
    });

    // Check if achievement is now complete
    const wasComplete = isAchievementComplete(previousProgress, target);
    const isNowComplete = isAchievementComplete(newProgress, target);
    const unlocked = !wasComplete && isNowComplete;

    if (unlocked) {
      // Unlock achievement
      await repository.updateUserAchievement(userId, definition.id, {
        is_completed: true,
        completed_at: new Date(),
        times_completed: userAchievement.times_completed + 1,
      });

      // Award coins if specified
      if (definition.coin_reward > 0) {
        await this.awardCoins(this.db, userId, definition.coin_reward, definition.name);
      }

      // For repeatable achievements, reset progress
      if ((definition as any).is_repeatable) {
        await repository.updateUserAchievement(userId, definition.id, {
          current_progress: 0,
          is_completed: false,
        });
      }
    }

    return {
      unlocked,
      achievement: definition,
      rewards: unlocked ? {
        xp_granted: definition.xp_reward,
        coins_granted: definition.coin_reward,
      } : undefined,
    };
  }

  async trackProfileCompletion(userId: string, completionPercentage: number): Promise<void> {
    const updates: AchievementProgressUpdate[] = [];

    if (completionPercentage >= 100) {
      updates.push({
        user_id: userId,
        achievement_slug: 'PROFILE_COMPLETE',
        progress_increment: 100,
      });
    }

    if (updates.length > 0) {
      await this.updateProgress(userId, updates);
    }
  }

  async trackPhotoUpload(userId: string, totalPhotos: number): Promise<void> {
    const updates: AchievementProgressUpdate[] = [];

    if (totalPhotos >= 3) {
      updates.push({
        user_id: userId,
        achievement_slug: 'PHOTOS_UPLOADED_3',
        progress_increment: totalPhotos,
      });
    }

    if (totalPhotos >= 6) {
      updates.push({
        user_id: userId,
        achievement_slug: 'PHOTOS_UPLOADED_6',
        progress_increment: totalPhotos,
      });
    }

    if (updates.length > 0) {
      await this.updateProgress(userId, updates);
    }
  }

  async trackPhoneVerification(userId: string): Promise<void> {
    await this.updateProgress(userId, [
      {
        user_id: userId,
        achievement_slug: 'PHONE_VERIFIED',
        progress_increment: 1,
      },
    ]);
  }

  async trackPhotoVerification(userId: string): Promise<void> {
    await this.updateProgress(userId, [
      {
        user_id: userId,
        achievement_slug: 'PHOTO_VERIFIED',
        progress_increment: 1,
      },
    ]);
  }

  async trackMatch(userId: string, totalMatches: number, isSuperLike: boolean = false): Promise<void> {
    const updates: AchievementProgressUpdate[] = [
      {
        user_id: userId,
        achievement_slug: 'FIRST_MATCH',
        progress_increment: 1,
      },
    ];

    if (totalMatches >= 10) {
      updates.push({
        user_id: userId,
        achievement_slug: 'MATCHES_10',
        progress_increment: totalMatches,
      });
    }

    if (totalMatches >= 50) {
      updates.push({
        user_id: userId,
        achievement_slug: 'MATCHES_50',
        progress_increment: totalMatches,
      });
    }

    if (totalMatches >= 100) {
      updates.push({
        user_id: userId,
        achievement_slug: 'MATCHES_100',
        progress_increment: totalMatches,
      });
    }

    if (isSuperLike) {
      updates.push({
        user_id: userId,
        achievement_slug: 'SUPER_LIKE_MATCH',
        progress_increment: 1,
      });
    }

    await this.updateProgress(userId, updates);
  }

  async trackMessage(userId: string, totalMessages: number, responseTime?: number): Promise<void> {
    const updates: AchievementProgressUpdate[] = [
      {
        user_id: userId,
        achievement_slug: 'FIRST_MESSAGE',
        progress_increment: 1,
      },
    ];

    if (totalMessages >= 100) {
      updates.push({
        user_id: userId,
        achievement_slug: 'MESSAGES_100',
        progress_increment: totalMessages,
      });
    }

    if (totalMessages >= 500) {
      updates.push({
        user_id: userId,
        achievement_slug: 'MESSAGES_500',
        progress_increment: totalMessages,
      });
    }

    // Check for quick responder (within 60 seconds)
    if (responseTime && responseTime <= 60) {
      updates.push({
        user_id: userId,
        achievement_slug: 'QUICK_RESPONDER',
        progress_increment: 1,
      });
    }

    await this.updateProgress(userId, updates);
  }

  async trackSwipe(userId: string, totalSwipes: number): Promise<void> {
    const updates: AchievementProgressUpdate[] = [];

    if (totalSwipes >= 100) {
      updates.push({
        user_id: userId,
        achievement_slug: 'SWIPES_100',
        progress_increment: totalSwipes,
      });
    }

    if (totalSwipes >= 500) {
      updates.push({
        user_id: userId,
        achievement_slug: 'SWIPES_500',
        progress_increment: totalSwipes,
      });
    }

    if (totalSwipes >= 1000) {
      updates.push({
        user_id: userId,
        achievement_slug: 'SWIPES_1000',
        progress_increment: totalSwipes,
      });
    }

    // Check for midnight swiper (00:00 - 05:00)
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 5) {
      updates.push({
        user_id: userId,
        achievement_slug: 'MIDNIGHT_SWIPER',
        progress_increment: 1,
      });
    }

    if (updates.length > 0) {
      await this.updateProgress(userId, updates);
    }
  }

  async trackLoginStreak(userId: string, streakDays: number): Promise<void> {
    const updates: AchievementProgressUpdate[] = [];

    if (streakDays >= 7) {
      updates.push({
        user_id: userId,
        achievement_slug: 'LOGIN_STREAK_7',
        progress_increment: streakDays,
      });
    }

    if (streakDays >= 30) {
      updates.push({
        user_id: userId,
        achievement_slug: 'LOGIN_STREAK_30',
        progress_increment: streakDays,
      });
    }

    if (streakDays >= 100) {
      updates.push({
        user_id: userId,
        achievement_slug: 'LOGIN_STREAK_100',
        progress_increment: streakDays,
      });
    }

    if (updates.length > 0) {
      await this.updateProgress(userId, updates);
    }
  }

  async trackSubscription(userId: string): Promise<void> {
    await this.updateProgress(userId, [
      {
        user_id: userId,
        achievement_slug: 'FIRST_SUBSCRIPTION',
        progress_increment: 1,
      },
    ]);
  }

  async trackReferral(userId: string, totalReferrals: number): Promise<void> {
    const updates: AchievementProgressUpdate[] = [
      {
        user_id: userId,
        achievement_slug: 'REFER_FRIEND',
        progress_increment: 1,
      },
    ];

    if (totalReferrals >= 5) {
      updates.push({
        user_id: userId,
        achievement_slug: 'REFER_FRIENDS_5',
        progress_increment: totalReferrals,
      });
    }

    await this.updateProgress(userId, updates);
  }

  async toggleShowcase(
    userId: string,
    achievementId: string,
    showcase: boolean,
    order?: number
  ): Promise<UserAchievement> {
    // Verify achievement is unlocked
    const userAchievement = await this.repository.findUserAchievementWithDefinition(
      userId,
      achievementId
    );

    if (!userAchievement || !(userAchievement as any).is_unlocked) {
      throw new Error('Achievement not unlocked');
    }

    // Limit to max 3 showcased achievements
    if (showcase) {
      const showcased = await this.repository.findUserAchievementsWithDefinitions(userId, {
        isShowcased: true,
      });

      if (showcased.length >= 3 && !(userAchievement as any).is_showcased) {
        throw new Error('Maximum 3 achievements can be showcased');
      }
    }

    // Note: is_showcased and showcase_order are not in UpdateUserAchievementInput type
    // but the database supports them, so we use 'as any' to bypass type checking
    const updateData: any = {};

    if (showcase !== undefined) {
      updateData.is_showcased = showcase;
    }

    if (order !== undefined) {
      updateData.showcase_order = order;
    }

    return this.repository.updateUserAchievement(userId, achievementId, updateData);
  }

  async getAllAchievements(): Promise<AchievementDefinition[]> {
    return this.repository.findAllDefinitions();
  }

  async getAchievementLeaderboard(limit: number = 10): Promise<any> {
    return this.repository.getTopUsersByPoints(limit);
  }

  private async awardCoins(
    db: Knex,
    userId: string,
    amount: number,
    reason: string
  ): Promise<void> {
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

    // Create transaction record
    await db('coin_transactions').insert({
      user_id: userId,
      amount,
      type: 'earned',
      source: 'achievement',
      description: `Achievement unlocked: ${reason}`,
      balance_after: existingCoins ? existingCoins.balance + amount : amount,
    });
  }
}
