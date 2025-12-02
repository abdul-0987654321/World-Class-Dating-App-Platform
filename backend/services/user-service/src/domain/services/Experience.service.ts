import { Knex } from 'knex';
import { ExperienceRepository } from '../repositories/Experience.repository';
import {
  UserExperience,
  XPTransaction,
  LevelDefinition,
  XPSource,
  LevelUpResult,
  XPAwardResult,
} from '../entities/Experience.entity';

export class ExperienceService {
  private repository: ExperienceRepository;

  constructor(private db: Knex) {
    this.repository = new ExperienceRepository(db);
  }

  async getUserExperience(userId: string): Promise<UserExperience> {
    return this.repository.findOrCreateUserExperience(userId);
  }

  async awardXP(
    userId: string,
    actionKey: string,
    multiplier: number = 1.0,
    metadata?: any
  ): Promise<XPAwardResult> {
    return this.db.transaction(async (trx) => {
      const repository = new ExperienceRepository(trx);

      // Get XP source
      const xpSource = await repository.findXPSourceByKey(actionKey);
      if (!xpSource || !xpSource.isActive) {
        throw new Error(`XP source not found or inactive: ${actionKey}`);
      }

      // Check daily limits and cooldowns
      if (xpSource.maxDailyCount) {
        const todayCount = await repository.countTodayTransactionsBySource(userId, actionKey);
        if (todayCount >= xpSource.maxDailyCount) {
          return {
            awarded: false,
            reason: 'daily_limit_reached',
            xpAwarded: 0,
            leveledUp: false,
          };
        }
      }

      if (xpSource.cooldownMinutes) {
        const lastTransaction = await repository.findLastTransactionBySource(userId, actionKey);
        if (lastTransaction) {
          const minutesSince = (Date.now() - new Date(lastTransaction.createdAt).getTime()) / 1000 / 60;
          if (minutesSince < xpSource.cooldownMinutes) {
            return {
              awarded: false,
              reason: 'cooldown_active',
              xpAwarded: 0,
              leveledUp: false,
            };
          }
        }
      }

      // Calculate XP amount
      const xpAmount = Math.floor(xpSource.baseXp * multiplier * xpSource.multiplier);

      // Get current user experience
      const userExp = await repository.findOrCreateUserExperience(userId);
      const currentLevel = userExp.currentLevel;

      // Add XP
      const newTotalXp = userExp.totalXp + xpAmount;
      let newLevel = currentLevel;
      let newCurrentLevelXp = userExp.currentLevelXp + xpAmount;
      let xpToNextLevel = userExp.xpToNextLevel;
      let leveledUp = false;
      const levelsGained: LevelDefinition[] = [];

      // Check for level ups
      while (newCurrentLevelXp >= xpToNextLevel) {
        newCurrentLevelXp -= xpToNextLevel;
        newLevel++;
        leveledUp = true;

        const nextLevelDef = await repository.findLevelByNumber(newLevel);
        if (nextLevelDef) {
          levelsGained.push(nextLevelDef);
          xpToNextLevel = nextLevelDef.xpForThisLevel;

          // Award level rewards
          await this.awardLevelRewards(trx, userId, nextLevelDef);

          // Create level unlock record
          await repository.createLevelUnlock({
            userId,
            levelId: nextLevelDef.id,
            level: newLevel,
            rewardClaimed: true,
          });
        } else {
          // Max level reached
          xpToNextLevel = 0;
          break;
        }
      }

      const levelProgress = xpToNextLevel > 0 ? (newCurrentLevelXp / xpToNextLevel) * 100 : 100;

      // Update user experience
      const history = Array.isArray(userExp.levelHistory) ? userExp.levelHistory : [];
      if (leveledUp) {
        history.push({
          level: newLevel,
          leveledUpAt: new Date(),
          totalXp: newTotalXp,
        });
      }

      await repository.updateUserExperience(userId, {
        totalXp: newTotalXp,
        currentLevel: newLevel,
        currentLevelXp: newCurrentLevelXp,
        xpToNextLevel,
        levelProgressPercentage: levelProgress,
        lastXpEarnedAt: new Date(),
        lastLevelUpAt: leveledUp ? new Date() : userExp.lastLevelUpAt,
        levelHistory: history,
      });

      // Create transaction record
      await repository.createXPTransaction({
        userId,
        amount: xpAmount,
        type: 'earned',
        source: actionKey,
        description: xpSource.actionName,
        metadata,
        levelBefore: currentLevel,
        levelAfter: newLevel,
        totalXpAfter: newTotalXp,
      });

      return {
        awarded: true,
        xpAwarded: xpAmount,
        leveledUp,
        levelsGained,
        newLevel,
        newTotalXp,
      };
    });
  }

  private async awardLevelRewards(db: Knex, userId: string, level: LevelDefinition): Promise<void> {
    // Award coins
    if (level.coinReward > 0) {
      await this.awardCoins(db, userId, level.coinReward, `Level ${level.level} Reward`);
    }

    // Award boosts
    if (level.boostReward > 0) {
      await this.awardBoosts(db, userId, level.boostReward);
    }

    // Award super likes
    if (level.superLikeReward > 0) {
      await this.awardSuperLikes(db, userId, level.superLikeReward);
    }
  }

  async getXPTransactions(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<XPTransaction[]> {
    return this.repository.findUserTransactions(userId, limit, offset);
  }

  async getXPLeaderboard(limit: number = 10): Promise<any[]> {
    return this.repository.getTopUsersByXP(limit);
  }

  async getLevelLeaderboard(limit: number = 10): Promise<any[]> {
    return this.repository.getTopUsersByLevel(limit);
  }

  async getLevelDefinitions(): Promise<LevelDefinition[]> {
    return this.repository.findAllLevels();
  }

  async getLevelDefinition(level: number): Promise<LevelDefinition | null> {
    return this.repository.findLevelByNumber(level);
  }

  async getXPSources(): Promise<XPSource[]> {
    return this.repository.findAllXPSources();
  }

  async getUserLevelUnlocks(userId: string): Promise<any[]> {
    return this.repository.findUserLevelUnlocks(userId);
  }

  // Tracking methods for different actions
  async trackProfileComplete(userId: string): Promise<XPAwardResult> {
    return this.awardXP(userId, 'PROFILE_COMPLETE');
  }

  async trackPhotoUpload(userId: string): Promise<XPAwardResult> {
    return this.awardXP(userId, 'PHOTO_UPLOAD');
  }

  async trackProfileUpdate(userId: string): Promise<XPAwardResult> {
    return this.awardXP(userId, 'PROFILE_UPDATE');
  }

  async trackPhoneVerification(userId: string): Promise<XPAwardResult> {
    return this.awardXP(userId, 'VERIFY_PHONE');
  }

  async trackPhotoVerification(userId: string): Promise<XPAwardResult> {
    return this.awardXP(userId, 'VERIFY_PHOTO');
  }

  async trackMatch(userId: string, isSuperLike: boolean = false, isMutualSuperLike: boolean = false): Promise<XPAwardResult> {
    if (isMutualSuperLike) {
      return this.awardXP(userId, 'MUTUAL_SUPER_LIKE');
    } else if (isSuperLike) {
      return this.awardXP(userId, 'SUPER_LIKE_MATCH');
    } else {
      return this.awardXP(userId, 'MATCH');
    }
  }

  async trackSwipe(userId: string): Promise<XPAwardResult> {
    return this.awardXP(userId, 'SWIPE');
  }

  async trackSuperLike(userId: string): Promise<XPAwardResult> {
    return this.awardXP(userId, 'SUPER_LIKE');
  }

  async trackDailyLogin(userId: string): Promise<XPAwardResult> {
    return this.awardXP(userId, 'DAILY_LOGIN');
  }

  async trackMessage(userId: string, isFirstMessage: boolean = false, isQuickResponse: boolean = false): Promise<XPAwardResult> {
    if (isFirstMessage) {
      await this.awardXP(userId, 'FIRST_MESSAGE');
    }
    if (isQuickResponse) {
      await this.awardXP(userId, 'QUICK_RESPONSE');
    }
    return this.awardXP(userId, 'SEND_MESSAGE');
  }

  async trackVideoChat(userId: string): Promise<XPAwardResult> {
    return this.awardXP(userId, 'VIDEO_CHAT');
  }

  async trackSubscription(userId: string): Promise<XPAwardResult> {
    return this.awardXP(userId, 'SUBSCRIBE');
  }

  async trackReferral(userId: string): Promise<XPAwardResult> {
    return this.awardXP(userId, 'REFER_FRIEND');
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
      source: 'level_reward',
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
