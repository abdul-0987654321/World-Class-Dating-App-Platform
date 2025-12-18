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
    return this.repository.findUserChallengesByStatus(userId, 'active');
  }

  async getAvailableChallenges(userId: string, type?: ChallengeType): Promise<ChallengeDefinition[]> {
    const allChallenges = type
      ? await this.repository.findChallengesByType(type)
      : await this.repository.findActiveChallenges();

    const userChallenges = await this.repository.findUserChallenges(userId);
    const userChallengeIds = new Set(userChallenges.map(uc => uc.challenge_id));

    return allChallenges.filter(challenge => {
      // Filter out challenges user already has (unless repeatable)
      const isRepeatable = (challenge as any).is_repeatable;
      if (!isRepeatable && userChallengeIds.has(challenge.id)) {
        return false;
      }

      // Check date availability
      if (challenge.start_date && new Date(challenge.start_date) > new Date()) {
        return false;
      }
      if (challenge.end_date && new Date(challenge.end_date) < new Date()) {
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
      if (!challenge || !challenge.is_active) {
        throw new Error('Challenge not found or inactive');
      }

      // Check if user already has this challenge
      const existing = await repository.findUserChallenge(userId, challengeId);
      const isRepeatable = (challenge as any).is_repeatable;
      if (existing && !isRepeatable) {
        throw new Error('Challenge already started or completed');
      }

      // Calculate expiration
      const now = new Date();
      const expiresAt = new Date(now);
      const durationDays = (challenge as any).duration_days;
      if (durationDays) {
        expiresAt.setDate(expiresAt.getDate() + durationDays);
      } else if (challenge.end_date) {
        expiresAt.setTime(new Date(challenge.end_date).getTime());
      }

      // Create user challenge
      return repository.createUserChallenge({
        userId: userId,
        challengeId: challengeId,
        status: 'active',
        progress: 0,
        target: challenge.target_value,
        progressPercentage: 0,
        startedAt: now,
        expiresAt: expiresAt,
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
      const userChallenges = await repository.findUserChallengesByStatus(userId, 'active');

      let completedChallenge: ChallengeCompletionResult | null = null;

      for (const userChallenge of userChallenges) {
        const challenge = await repository.findChallengeById(userChallenge.challenge_id);
        if (!challenge) continue;

        // If challenge_id is specified, only update that specific challenge
        if (update.challenge_id && userChallenge.challenge_id !== update.challenge_id) continue;

        // Update progress
        const newProgress = update.set_progress !== undefined
          ? update.set_progress
          : userChallenge.current_progress + (update.progress_increment || 1);
        const progressPercentage = (newProgress / userChallenge.target_progress) * 100;

        await repository.updateUserChallenge(userChallenge.id, {
          progress: newProgress,
          progressPercentage,
        });

        // Log progress
        await repository.createProgressLog({
          userId,
          challengeId: challenge.id,
          userChallengeId: userChallenge.id,
          actionType: 'challenge_progress',
          progressIncrement: update.progress_increment || 1,
          progressAfter: newProgress,
          metadata: null,
        });

        // Check if completed
        const isCompleted = userChallenge.is_completed;
        if (newProgress >= userChallenge.target_progress && !isCompleted) {
          await repository.updateUserChallenge(userChallenge.id, {
            status: 'completed',
            completedAt: new Date(),
          });

          // Award rewards
          await this.awardChallengeRewards(trx, userId, challenge);

          completedChallenge = {
            challenge,
            completed: true,
            rewards: {
              xp_reward: challenge.xp_reward,
              coin_reward: challenge.coin_reward,
              boost_reward: challenge.boost_reward,
              super_like_reward: challenge.super_like_reward,
            },
          };

          break; // Only complete one challenge per action
        }
      }

      return completedChallenge;
    });
  }

  private async awardChallengeRewards(db: Knex, user_id: string, challenge: ChallengeDefinition): Promise<void> {
    const challengeName = (challenge as any).name || 'Challenge';

    if (challenge.coin_reward > 0) {
      await this.awardCoins(db, user_id, challenge.coin_reward, `Challenge: ${challengeName}`);
    }

    if (challenge.xp_reward > 0) {
      await this.awardXP(db, user_id, challenge.xp_reward, `Challenge: ${challengeName}`);
    }

    if (challenge.boost_reward > 0) {
      await this.awardBoosts(db, user_id, challenge.boost_reward);
    }

    if (challenge.super_like_reward > 0) {
      await this.awardSuperLikes(db, user_id, challenge.super_like_reward);
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
      user_id: userId,
      challenge_id: '',
      progress_increment: 1,
    });
  }

  async trackMessage(userId: string): Promise<ChallengeCompletionResult | null> {
    return this.updateChallengeProgress(userId, {
      user_id: userId,
      challenge_id: '',
      progress_increment: 1,
    });
  }

  async trackMatch(userId: string): Promise<ChallengeCompletionResult | null> {
    return this.updateChallengeProgress(userId, {
      user_id: userId,
      challenge_id: '',
      progress_increment: 1,
    });
  }

  async trackLogin(userId: string): Promise<ChallengeCompletionResult | null> {
    return this.updateChallengeProgress(userId, {
      user_id: userId,
      challenge_id: '',
      progress_increment: 1,
    });
  }

  async trackProfileUpdate(user_id: string): Promise<ChallengeCompletionResult | null> {
    return this.updateChallengeProgress(user_id, {
      user_id: user_id,
      challenge_id: '',
      progress_increment: 1,
    });
  }

  private async awardCoins(db: Knex, user_id: string, amount: number, reason: string): Promise<void> {
    const existingCoins = await db('coins').where({ user_id }).first();
    if (existingCoins) {
      await db('coins')
        .where({ user_id })
        .increment('balance', amount)
        .increment('total_earned', amount)
        .update({ updated_at: db.fn.now() });
    } else {
      await db('coins').insert({
        user_id,
        balance: amount,
        total_earned: amount,
        total_spent: 0,
        total_purchased: 0,
      });
    }
    await db('coin_transactions').insert({
      user_id,
      amount,
      type: 'earned',
      source: 'challenge',
      description: reason,
      balance_after: existingCoins ? existingCoins.balance + amount : amount,
    });
  }

  private async awardXP(db: Knex, user_id: string, amount: number, reason: string): Promise<void> {
    const userExp = await db('user_experience').where({ user_id }).first();
    if (userExp) {
      await db('user_experience')
        .where({ user_id })
        .increment('total_xp', amount)
        .update({ updated_at: db.fn.now() });
    }
  }

  private async awardBoosts(db: Knex, user_id: string, count: number): Promise<void> {
    const existingBoosts = await db('boosts').where({ user_id }).first();
    if (existingBoosts) {
      await db('boosts')
        .where({ user_id })
        .increment('available_count', count)
        .update({ updated_at: db.fn.now() });
    } else {
      await db('boosts').insert({
        user_id,
        available_count: count,
        total_purchased: 0,
        total_used: 0,
      });
    }
  }

  private async awardSuperLikes(db: Knex, user_id: string, count: number): Promise<void> {
    const usageLimit = await db('usage_limits').where({ user_id }).first();
    if (usageLimit) {
      await db('usage_limits')
        .where({ user_id })
        .increment('super_likes_remaining', count)
        .update({ updated_at: db.fn.now() });
    }
  }
}
