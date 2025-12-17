import { Knex } from 'knex';
import { ChallengeRepository } from '../repositories/Challenge.repository';
import {
  ChallengeDefinition,
  UserChallenge,
  ChallengeType,
  ChallengeStatus,
  ChallengeProgressUpdate,
  ChallengeCompletionResult,
} from '../entities/Challenge.entity';

export class ChallengeService {
  private repository: ChallengeRepository;

  constructor(private db: Knex) {
    this.repository = new ChallengeRepository(db);
  }

  async getActiveChallenges(userId: string): Promise<UserChallenge[]> {
    return this.repository.findUserChallengesByStatus(userId, 'in_progress');
  }

  async getAvailableChallenges(userId: string, type?: ChallengeType): Promise<ChallengeDefinition[]> {
    const allChallenges = type
      ? await this.repository.findChallengesByType(type)
      : await this.repository.findActiveChallenges();

    const userChallenges = await this.repository.findUserChallenges(userId);
    const userChallengeIds = new Set(userChallenges.map(uc => uc.challengeId));

    return allChallenges.filter(challenge => {
      // Filter out challenges user already has (unless repeatable)
      if (!challenge.isRepeatable && userChallengeIds.has(challenge.id)) {
        return false;
      }

      // Check date availability
      if (challenge.startDate && new Date(challenge.startDate) > new Date()) {
        return false;
      }
      if (challenge.endDate && new Date(challenge.endDate) < new Date()) {
        return false;
      }

      return true;
    });
  }

  async getDailyChallenges(userId: string): Promise<UserChallenge[]> {
    return this.repository.findUserChallengesByType(userId, 'daily');
  }

  async getWeeklyChallenges(userId: string): Promise<UserChallenge[]> {
    return this.repository.findUserChallengesByType(userId, 'weekly');
  }

  async getMonthlyChallenges(userId: string): Promise<UserChallenge[]> {
    return this.repository.findUserChallengesByType(userId, 'monthly');
  }

  async startChallenge(userId: string, challengeId: string): Promise<UserChallenge> {
    return this.db.transaction(async (trx) => {
      const repository = new ChallengeRepository(trx);

      const challenge = await repository.findChallengeById(challengeId);
      if (!challenge || !challenge.isActive) {
        throw new Error('Challenge not found or inactive');
      }

      // Check if user already has this challenge
      const existing = await repository.findUserChallenge(userId, challengeId);
      if (existing && !challenge.isRepeatable) {
        throw new Error('Challenge already started or completed');
      }

      // Calculate expiration
      const now = new Date();
      const expiresAt = new Date(now);
      if (challenge.durationDays) {
        expiresAt.setDate(expiresAt.getDate() + challenge.durationDays);
      } else if (challenge.endDate) {
        expiresAt.setTime(new Date(challenge.endDate).getTime());
      }

      // Create user challenge
      return repository.createUserChallenge({
        userId,
        challengeId,
        status: 'in_progress',
        progress: 0,
        target: challenge.targetValue,
        progressPercentage: 0,
        startedAt: now,
        expiresAt,
        rewardClaimed: false,
        progressData: {},
        timesCompleted: 0,
      });
    });
  }

  async updateChallengeProgress(
    userId: string,
    update: ChallengeProgressUpdate
  ): Promise<ChallengeCompletionResult | null> {
    return this.db.transaction(async (trx) => {
      const repository = new ChallengeRepository(trx);

      // Find matching challenges
      const userChallenges = await repository.findUserChallengesByStatus(userId, 'in_progress');

      let completedChallenge: ChallengeCompletionResult | null = null;

      for (const userChallenge of userChallenges) {
        const challenge = await repository.findChallengeById(userChallenge.challengeId);
        if (!challenge) continue;

        // Check if this challenge matches the action
        const requirements = challenge.requirements as any;
        if (requirements.action !== update.actionType) continue;

        // Update progress
        const newProgress = userChallenge.progress + (update.incrementBy || 1);
        const progressPercentage = (newProgress / userChallenge.target) * 100;

        await repository.updateUserChallenge(userChallenge.id, {
          progress: newProgress,
          progressPercentage,
        });

        // Log progress
        await repository.createProgressLog({
          userId,
          challengeId: challenge.id,
          userChallengeId: userChallenge.id,
          actionType: update.actionType,
          progressIncrement: update.incrementBy || 1,
          progressAfter: newProgress,
          metadata: update.metadata || null,
        });

        // Check if completed
        if (newProgress >= userChallenge.target && userChallenge.status === 'in_progress') {
          await repository.updateUserChallenge(userChallenge.id, {
            status: 'completed',
            completedAt: new Date(),
          });

          // Award rewards
          await this.awardChallengeRewards(trx, userId, challenge);

          completedChallenge = {
            challenge,
            userChallenge: {
              ...userChallenge,
              status: 'completed',
              progress: newProgress,
              progressPercentage,
            },
            rewardsAwarded: {
              coins: challenge.coinReward,
              xp: challenge.xpReward,
              boosts: challenge.boostReward,
              superLikes: challenge.superLikeReward,
            },
          };

          break; // Only complete one challenge per action
        }
      }

      return completedChallenge;
    });
  }

  private async awardChallengeRewards(db: Knex, userId: string, challenge: ChallengeDefinition): Promise<void> {
    if (challenge.coinReward > 0) {
      await this.awardCoins(db, userId, challenge.coinReward, `Challenge: ${challenge.title}`);
    }

    if (challenge.xpReward > 0) {
      await this.awardXP(db, userId, challenge.xpReward, `Challenge: ${challenge.title}`);
    }

    if (challenge.boostReward > 0) {
      await this.awardBoosts(db, userId, challenge.boostReward);
    }

    if (challenge.superLikeReward > 0) {
      await this.awardSuperLikes(db, userId, challenge.superLikeReward);
    }
  }

  async expireOldChallenges(): Promise<number> {
    return this.db.transaction(async (trx) => {
      const repository = new ChallengeRepository(trx);
      const expiredChallenges = await repository.findExpiredChallenges();

      for (const userChallenge of expiredChallenges) {
        await repository.updateUserChallenge(userChallenge.id, {
          status: 'expired',
        });
      }

      return expiredChallenges.length;
    });
  }

  async generateDailyChallenges(userId: string): Promise<UserChallenge[]> {
    const dailyChallenges = await this.repository.findChallengesByType('daily');
    const created: UserChallenge[] = [];

    for (const challenge of dailyChallenges) {
      try {
        const userChallenge = await this.startChallenge(userId, challenge.id);
        created.push(userChallenge);
      } catch (error) {
        // Challenge already exists, skip
      }
    }

    return created;
  }

  // Tracking methods
  async trackSwipe(userId: string): Promise<ChallengeCompletionResult | null> {
    return this.updateChallengeProgress(userId, {
      actionType: 'swipe',
      incrementBy: 1,
    });
  }

  async trackMessage(userId: string): Promise<ChallengeCompletionResult | null> {
    return this.updateChallengeProgress(userId, {
      actionType: 'message',
      incrementBy: 1,
    });
  }

  async trackMatch(userId: string): Promise<ChallengeCompletionResult | null> {
    return this.updateChallengeProgress(userId, {
      actionType: 'match',
      incrementBy: 1,
    });
  }

  async trackLogin(userId: string): Promise<ChallengeCompletionResult | null> {
    return this.updateChallengeProgress(userId, {
      actionType: 'login',
      incrementBy: 1,
    });
  }

  async trackProfileUpdate(userId: string): Promise<ChallengeCompletionResult | null> {
    return this.updateChallengeProgress(userId, {
      actionType: 'profile_update',
      incrementBy: 1,
    });
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
      source: 'challenge',
      description: reason,
      balance_after: existingCoins ? existingCoins.balance + amount : amount,
    });
  }

  private async awardXP(db: Knex, userId: string, amount: number, reason: string): Promise<void> {
    const userExp = await db('user_experience').where({ user_id: userId }).first();
    if (userExp) {
      await db('user_experience')
        .where({ user_id: userId })
        .increment('total_xp', amount)
        .update({ updated_at: db.fn.now() });
    }
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
