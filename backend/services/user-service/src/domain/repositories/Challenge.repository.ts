import { Knex } from 'knex';

import {
  ChallengeDefinition,
  UserChallenge,
  ChallengeType,
  ChallengeStatus,
} from '../entities/Challenge.entity';

export class ChallengeRepository {
  constructor(private db: Knex) {}

  async findActiveChallenges(): Promise<ChallengeDefinition[]> {
    const challenges = await this.db('challenge_definitions').where({ is_active: true });
    return challenges.map(this.mapToEntity);
  }

  async findChallengesByType(type: ChallengeType): Promise<ChallengeDefinition[]> {
    const challenges = await this.db('challenge_definitions').where({ type, is_active: true });
    return challenges.map(this.mapToEntity);
  }

  async findChallengeById(id: string): Promise<ChallengeDefinition | null> {
    const challenge = await this.db('challenge_definitions').where({ id }).first();
    return challenge ? this.mapToEntity(challenge) : null;
  }

  async findUserChallenges(userId: string): Promise<UserChallenge[]> {
    const challenges = await this.db('user_challenges').where({ user_id: userId });
    return challenges.map(this.mapUserChallengeToEntity);
  }

  async findUserChallengesByStatus(
    userId: string,
    status: ChallengeStatus
  ): Promise<UserChallenge[]> {
    const challenges = await this.db('user_challenges').where({ user_id: userId, status });
    return challenges.map(this.mapUserChallengeToEntity);
  }

  async findUserChallengesByType(userId: string, type: ChallengeType): Promise<UserChallenge[]> {
    const challenges = await this.db('user_challenges as uc')
      .select('uc.*')
      .join('challenge_definitions as cd', 'uc.challenge_id', 'cd.id')
      .where({ 'uc.user_id': userId, 'cd.type': type });
    return challenges.map(this.mapUserChallengeToEntity);
  }

  async findUserChallenge(userId: string, challengeId: string): Promise<UserChallenge | null> {
    const challenge = await this.db('user_challenges')
      .where({ user_id: userId, challenge_id: challengeId })
      .first();
    return challenge ? this.mapUserChallengeToEntity(challenge) : null;
  }

  async createUserChallenge(data: any): Promise<UserChallenge> {
    const [created] = await this.db('user_challenges')
      .insert({
        user_id: data.userId,
        challenge_id: data.challengeId,
        status: data.status,
        progress: data.progress,
        target: data.target,
        progress_percentage: data.progressPercentage,
        started_at: data.startedAt,
        expires_at: data.expiresAt,
        reward_claimed: data.rewardClaimed,
        progress_data: JSON.stringify(data.progressData),
        times_completed: data.timesCompleted,
      })
      .returning('*');
    return this.mapUserChallengeToEntity(created);
  }

  async updateUserChallenge(userChallengeId: string, updates: any): Promise<UserChallenge> {
    const [updated] = await this.db('user_challenges')
      .where({ id: userChallengeId })
      .update({
        status: updates.status,
        progress: updates.progress,
        progress_percentage: updates.progressPercentage,
        completed_at: updates.completedAt,
        reward_claimed: updates.rewardClaimed,
        reward_claimed_at: updates.rewardClaimedAt,
        updated_at: this.db.fn.now(),
      })
      .returning('*');
    return this.mapUserChallengeToEntity(updated);
  }

  async createProgressLog(data: any): Promise<any> {
    return this.db('challenge_progress_logs').insert({
      user_id: data.userId,
      challenge_id: data.challengeId,
      user_challenge_id: data.userChallengeId,
      action_type: data.actionType,
      progress_increment: data.progressIncrement,
      progress_after: data.progressAfter,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    });
  }

  async findExpiredChallenges(): Promise<UserChallenge[]> {
    const now = new Date();
    const challenges = await this.db('user_challenges')
      .where('expires_at', '<', now)
      .where('status', 'in_progress');
    return challenges.map(this.mapUserChallengeToEntity);
  }

  private mapToEntity(row: any): any {
    return {
      id: row.id,
      slug: row.key || row.challenge_slug,
      title: row.title,
      description: row.description,
      type: row.type,
      category: row.category,
      difficulty: row.difficulty,
      requirements: row.requirements ? JSON.parse(row.requirements) : {},
      targetValue: row.target_value,
      coinReward: row.coin_reward,
      xpReward: row.xp_reward,
      boostReward: row.boost_reward,
      superLikeReward: row.super_like_reward,
      bonusRewards: row.bonus_rewards ? JSON.parse(row.bonus_rewards) : null,
      iconName: row.icon_name,
      badgeColor: row.badge_color,
      startDate: row.start_date,
      endDate: row.end_date,
      durationDays: row.duration_days,
      isRepeatable: row.is_repeatable,
      isFeatured: row.is_featured,
      displayOrder: row.display_order,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapUserChallengeToEntity(row: any): any {
    return {
      id: row.id,
      user_id: row.user_id,
      challenge_id: row.challenge_id,
      status: row.status,
      progress: row.progress,
      target: row.target,
      progressPercentage: row.progress_percentage,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      expiresAt: row.expires_at,
      rewardClaimed: row.reward_claimed,
      rewardClaimedAt: row.reward_claimed_at,
      progressData: row.progress_data ? JSON.parse(row.progress_data) : {},
      timesCompleted: row.times_completed,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
