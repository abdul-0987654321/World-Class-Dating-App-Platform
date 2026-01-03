import {
  Referral,
  ReferralCreateInput,
  ReferralUpdateInput,
  ReferralStatus,
  REFERRAL_STATUS,
} from '../entities/Referral.entity';
import db from '../../infrastructure/database/connection';

export interface ReferralStats {
  totalReferrals: number;
  pendingReferrals: number;
  completedReferrals: number;
  rewardedReferrals: number;
  totalCoinsEarned: number;
  totalPremiumDaysEarned: number;
}

export class ReferralRepository {
  private tableName = 'referrals';

  async create(input: ReferralCreateInput): Promise<Referral> {
    const now = new Date();
    const referralData = {
      referrer_id: input.referrerId,
      referred_id: input.referredId,
      referral_code_id: input.referralCodeId,
      code: input.code.toUpperCase(),
      status: REFERRAL_STATUS.PENDING,
      created_at: now,
      updated_at: now,
    };

    const [referral] = await db(this.tableName)
      .insert(referralData)
      .returning('*');

    return this.mapToEntity(referral);
  }

  async findById(id: string): Promise<Referral | null> {
    const referral = await db(this.tableName)
      .where({ id })
      .first();

    return referral ? this.mapToEntity(referral) : null;
  }

  async findByReferredId(referredId: string): Promise<Referral | null> {
    const referral = await db(this.tableName)
      .where({ referred_id: referredId })
      .first();

    return referral ? this.mapToEntity(referral) : null;
  }

  async findByReferrerId(referrerId: string): Promise<Referral[]> {
    const referrals = await db(this.tableName)
      .where({ referrer_id: referrerId })
      .orderBy('created_at', 'desc');

    return referrals.map(this.mapToEntity);
  }

  async findByReferrerIdWithStatus(
    referrerId: string,
    status: ReferralStatus
  ): Promise<Referral[]> {
    const referrals = await db(this.tableName)
      .where({ referrer_id: referrerId, status })
      .orderBy('created_at', 'desc');

    return referrals.map(this.mapToEntity);
  }

  async findByCode(code: string): Promise<Referral[]> {
    const referrals = await db(this.tableName)
      .where({ code: code.toUpperCase() })
      .orderBy('created_at', 'desc');

    return referrals.map(this.mapToEntity);
  }

  async findPendingReferrals(): Promise<Referral[]> {
    const referrals = await db(this.tableName)
      .where({ status: REFERRAL_STATUS.PENDING })
      .orderBy('created_at', 'asc');

    return referrals.map(this.mapToEntity);
  }

  async findCompletedUnrewarded(): Promise<Referral[]> {
    const referrals = await db(this.tableName)
      .where({ status: REFERRAL_STATUS.COMPLETED })
      .orderBy('completed_at', 'asc');

    return referrals.map(this.mapToEntity);
  }

  async update(id: string, input: ReferralUpdateInput): Promise<Referral> {
    const updateData: any = {
      updated_at: new Date(),
    };

    if (input.status !== undefined) updateData.status = input.status;
    if (input.referrerRewardedAt !== undefined) updateData.referrer_rewarded_at = input.referrerRewardedAt;
    if (input.referredRewardedAt !== undefined) updateData.referred_rewarded_at = input.referredRewardedAt;
    if (input.completedAt !== undefined) updateData.completed_at = input.completedAt;

    const [referral] = await db(this.tableName)
      .where({ id })
      .update(updateData)
      .returning('*');

    return this.mapToEntity(referral);
  }

  async markAsCompleted(id: string): Promise<Referral> {
    const now = new Date();
    return this.update(id, {
      status: REFERRAL_STATUS.COMPLETED,
      completedAt: now,
    });
  }

  async markAsRewarded(id: string): Promise<Referral> {
    return this.update(id, {
      status: REFERRAL_STATUS.REWARDED,
    });
  }

  async markReferrerRewarded(id: string): Promise<Referral> {
    return this.update(id, {
      referrerRewardedAt: new Date(),
    });
  }

  async markReferredRewarded(id: string): Promise<Referral> {
    return this.update(id, {
      referredRewardedAt: new Date(),
    });
  }

  async delete(id: string): Promise<void> {
    await db(this.tableName)
      .where({ id })
      .del();
  }

  async hasBeenReferred(userId: string): Promise<boolean> {
    const result = await db(this.tableName)
      .where({ referred_id: userId })
      .first();
    return !!result;
  }

  async countByReferrerId(referrerId: string): Promise<number> {
    const result = await db(this.tableName)
      .where({ referrer_id: referrerId })
      .count('id as count')
      .first();
    return Number(result?.count || 0);
  }

  async countByReferrerIdAndStatus(
    referrerId: string,
    status: ReferralStatus
  ): Promise<number> {
    const result = await db(this.tableName)
      .where({ referrer_id: referrerId, status })
      .count('id as count')
      .first();
    return Number(result?.count || 0);
  }

  async getReferralStats(userId: string): Promise<ReferralStats> {
    const [stats] = await db(this.tableName)
      .where({ referrer_id: userId })
      .select(
        db.raw('COUNT(*) as total_referrals'),
        db.raw(`COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_referrals`),
        db.raw(`COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_referrals`),
        db.raw(`COUNT(CASE WHEN status = 'rewarded' THEN 1 END) as rewarded_referrals`)
      ) as unknown as { total_referrals: string; pending_referrals: string; completed_referrals: string; rewarded_referrals: string }[];

    // Calculate estimated rewards based on completed referrals
    const rewardedCount = Number(stats?.rewarded_referrals || 0);

    return {
      totalReferrals: Number(stats?.total_referrals || 0),
      pendingReferrals: Number(stats?.pending_referrals || 0),
      completedReferrals: Number(stats?.completed_referrals || 0),
      rewardedReferrals: rewardedCount,
      totalCoinsEarned: rewardedCount * 50, // REFERRAL_REWARDS.REFERRER.COINS
      totalPremiumDaysEarned: rewardedCount * 7, // REFERRAL_REWARDS.REFERRER.PREMIUM_DAYS
    };
  }

  async findExpiredPendingReferrals(daysOld: number = 30): Promise<Referral[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const referrals = await db(this.tableName)
      .where({ status: REFERRAL_STATUS.PENDING })
      .where('created_at', '<', cutoffDate);

    return referrals.map(this.mapToEntity);
  }

  async expireOldPendingReferrals(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await db(this.tableName)
      .where({ status: REFERRAL_STATUS.PENDING })
      .where('created_at', '<', cutoffDate)
      .update({
        status: REFERRAL_STATUS.EXPIRED,
        updated_at: new Date(),
      });

    return result;
  }

  private mapToEntity(row: any): Referral {
    return {
      id: row.id,
      referrerId: row.referrer_id,
      referredId: row.referred_id,
      referralCodeId: row.referral_code_id,
      code: row.code,
      status: row.status,
      referrerRewardedAt: row.referrer_rewarded_at ? new Date(row.referrer_rewarded_at) : undefined,
      referredRewardedAt: row.referred_rewarded_at ? new Date(row.referred_rewarded_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export default new ReferralRepository();
