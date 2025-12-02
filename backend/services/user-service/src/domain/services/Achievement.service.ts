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
      const orderA = a.showcaseOrder ?? 999;
      const orderB = b.showcaseOrder ?? 999;
      return orderA - orderB;
    });

    const stats = await this.getUserStats(userId);

    return {
      userId,
      achievements,
      stats,
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
    const definition = await repository.findDefinitionByKey(update.achievementKey);
    if (!definition || !definition.isActive) {
      return null;
    }

    // Get or create user achievement
    const userAchievement = await repository.findOrCreateUserAchievement(
      userId,
      definition.id,
      definition.targetValue || undefined
    );

    // Skip if already unlocked and not repeatable
    if (userAchievement.isUnlocked && !definition.isRepeatable) {
      return null;
    }

    // Calculate new progress
    const previousProgress = userAchievement.progress;
    const incrementBy = update.incrementBy !== undefined ? update.incrementBy : 1;
    const newProgress = previousProgress + incrementBy;

    const target = definition.targetValue || 1;
    const progressPercentage = calculateProgressPercentage(newProgress, target);

    // Update progress
    await repository.updateUserAchievement(userId, definition.id, {
      progress: newProgress,
      progressPercentage,
    });

    // Log progress
    await repository.createProgressLog({
      userId,
      achievementId: definition.id,
      actionType: update.actionType,
      progressIncrement: incrementBy,
      progressAfter: newProgress,
      metadata: update.metadata || null,
    });

    // Check if achievement is now complete
    const wasComplete = isAchievementComplete(previousProgress, target);
    const isNowComplete = isAchievementComplete(newProgress, target);
    const unlocked = !wasComplete && isNowComplete;

    if (unlocked) {
      // Unlock achievement
      await repository.updateUserAchievement(userId, definition.id, {
        isUnlocked: true,
        unlockedAt: new Date(),
        timesCompleted: userAchievement.timesCompleted + 1,
      });

      // Award coins if specified
      if (definition.coinReward > 0) {
        await this.awardCoins(this.db, userId, definition.coinReward, definition.name);
      }

      // For repeatable achievements, reset progress
      if (definition.isRepeatable) {
        await repository.updateUserAchievement(userId, definition.id, {
          progress: 0,
          progressPercentage: 0,
          isUnlocked: false,
        });
      }
    }

    return {
      unlocked,
      achievement: definition,
      previousProgress,
      newProgress,
      pointsEarned: unlocked ? definition.points : 0,
      coinsEarned: unlocked ? definition.coinReward : 0,
      isFirstTime: userAchievement.timesCompleted === 0,
    };
  }

  async trackProfileCompletion(userId: string, completionPercentage: number): Promise<void> {
    const updates: AchievementProgressUpdate[] = [];

    if (completionPercentage >= 100) {
      updates.push({
        achievementKey: 'PROFILE_COMPLETE',
        actionType: 'profile_completed',
        incrementBy: 100,
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
        achievementKey: 'PHOTOS_UPLOADED_3',
        actionType: 'photo_uploaded',
        incrementBy: totalPhotos,
      });
    }

    if (totalPhotos >= 6) {
      updates.push({
        achievementKey: 'PHOTOS_UPLOADED_6',
        actionType: 'photo_uploaded',
        incrementBy: totalPhotos,
      });
    }

    if (updates.length > 0) {
      await this.updateProgress(userId, updates);
    }
  }

  async trackPhoneVerification(userId: string): Promise<void> {
    await this.updateProgress(userId, [
      {
        achievementKey: 'PHONE_VERIFIED',
        actionType: 'phone_verified',
        incrementBy: 1,
      },
    ]);
  }

  async trackPhotoVerification(userId: string): Promise<void> {
    await this.updateProgress(userId, [
      {
        achievementKey: 'PHOTO_VERIFIED',
        actionType: 'photo_verified',
        incrementBy: 1,
      },
    ]);
  }

  async trackMatch(userId: string, totalMatches: number, isSuperLike: boolean = false): Promise<void> {
    const updates: AchievementProgressUpdate[] = [
      {
        achievementKey: 'FIRST_MATCH',
        actionType: 'match_created',
        incrementBy: 1,
      },
    ];

    if (totalMatches >= 10) {
      updates.push({
        achievementKey: 'MATCHES_10',
        actionType: 'match_created',
        incrementBy: totalMatches,
      });
    }

    if (totalMatches >= 50) {
      updates.push({
        achievementKey: 'MATCHES_50',
        actionType: 'match_created',
        incrementBy: totalMatches,
      });
    }

    if (totalMatches >= 100) {
      updates.push({
        achievementKey: 'MATCHES_100',
        actionType: 'match_created',
        incrementBy: totalMatches,
      });
    }

    if (isSuperLike) {
      updates.push({
        achievementKey: 'SUPER_LIKE_MATCH',
        actionType: 'super_like_match',
        incrementBy: 1,
      });
    }

    await this.updateProgress(userId, updates);
  }

  async trackMessage(userId: string, totalMessages: number, responseTime?: number): Promise<void> {
    const updates: AchievementProgressUpdate[] = [
      {
        achievementKey: 'FIRST_MESSAGE',
        actionType: 'message_sent',
        incrementBy: 1,
      },
    ];

    if (totalMessages >= 100) {
      updates.push({
        achievementKey: 'MESSAGES_100',
        actionType: 'message_sent',
        incrementBy: totalMessages,
      });
    }

    if (totalMessages >= 500) {
      updates.push({
        achievementKey: 'MESSAGES_500',
        actionType: 'message_sent',
        incrementBy: totalMessages,
      });
    }

    // Check for quick responder (within 60 seconds)
    if (responseTime && responseTime <= 60) {
      updates.push({
        achievementKey: 'QUICK_RESPONDER',
        actionType: 'quick_response',
        incrementBy: 1,
        metadata: { responseTime },
      });
    }

    await this.updateProgress(userId, updates);
  }

  async trackSwipe(userId: string, totalSwipes: number): Promise<void> {
    const updates: AchievementProgressUpdate[] = [];

    if (totalSwipes >= 100) {
      updates.push({
        achievementKey: 'SWIPES_100',
        actionType: 'swipe',
        incrementBy: totalSwipes,
      });
    }

    if (totalSwipes >= 500) {
      updates.push({
        achievementKey: 'SWIPES_500',
        actionType: 'swipe',
        incrementBy: totalSwipes,
      });
    }

    if (totalSwipes >= 1000) {
      updates.push({
        achievementKey: 'SWIPES_1000',
        actionType: 'swipe',
        incrementBy: totalSwipes,
      });
    }

    // Check for midnight swiper (00:00 - 05:00)
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 5) {
      updates.push({
        achievementKey: 'MIDNIGHT_SWIPER',
        actionType: 'midnight_swipe',
        incrementBy: 1,
        metadata: { hour },
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
        achievementKey: 'LOGIN_STREAK_7',
        actionType: 'login_streak',
        incrementBy: streakDays,
      });
    }

    if (streakDays >= 30) {
      updates.push({
        achievementKey: 'LOGIN_STREAK_30',
        actionType: 'login_streak',
        incrementBy: streakDays,
      });
    }

    if (streakDays >= 100) {
      updates.push({
        achievementKey: 'LOGIN_STREAK_100',
        actionType: 'login_streak',
        incrementBy: streakDays,
      });
    }

    if (updates.length > 0) {
      await this.updateProgress(userId, updates);
    }
  }

  async trackSubscription(userId: string): Promise<void> {
    await this.updateProgress(userId, [
      {
        achievementKey: 'FIRST_SUBSCRIPTION',
        actionType: 'subscription_created',
        incrementBy: 1,
      },
    ]);
  }

  async trackReferral(userId: string, totalReferrals: number): Promise<void> {
    const updates: AchievementProgressUpdate[] = [
      {
        achievementKey: 'REFER_FRIEND',
        actionType: 'referral',
        incrementBy: 1,
      },
    ];

    if (totalReferrals >= 5) {
      updates.push({
        achievementKey: 'REFER_FRIENDS_5',
        actionType: 'referral',
        incrementBy: totalReferrals,
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

    if (!userAchievement || !userAchievement.isUnlocked) {
      throw new Error('Achievement not unlocked');
    }

    // Limit to max 3 showcased achievements
    if (showcase) {
      const showcased = await this.repository.findUserAchievementsWithDefinitions(userId, {
        isShowcased: true,
      });

      if (showcased.length >= 3 && !userAchievement.isShowcased) {
        throw new Error('Maximum 3 achievements can be showcased');
      }
    }

    return this.repository.updateUserAchievement(userId, achievementId, {
      isShowcased: showcase,
      showcaseOrder: order,
    });
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
