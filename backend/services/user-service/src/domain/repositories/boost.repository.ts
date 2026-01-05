import db from '../../infrastructure/database/connection';
import {
  Boost,
  BoostCreateInput,
  BoostUpdateInput,
  BOOST_STATUS,
  calculateBoostExpiry,
} from '../entities/Boost.entity';

export class BoostRepository {
  private tableName = 'boosts';

  async create(input: BoostCreateInput): Promise<Boost> {
    const now = new Date();
    const boostData = {
      user_id: input.userId,
      type: input.type,
      status: BOOST_STATUS.PENDING,
      duration_minutes: input.durationMinutes,
      visibility_multiplier: input.visibilityMultiplier,
      impressions_gained: 0,
      likes_gained: 0,
      matches_gained: 0,
      created_at: now,
      updated_at: now,
    };

    const [boost] = await db(this.tableName).insert(boostData).returning('*');

    return this.mapToEntity(boost);
  }

  async findById(id: string): Promise<Boost | null> {
    const boost = await db(this.tableName).where({ id }).first();

    return boost ? this.mapToEntity(boost) : null;
  }

  async findByUserId(
    userId: string,
    options?: {
      limit?: number;
      status?: string;
    }
  ): Promise<Boost[]> {
    let query = db(this.tableName).where({ user_id: userId }).orderBy('created_at', 'desc');

    if (options?.status) {
      query = query.where({ status: options.status });
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const boosts = await query.select('*');
    return boosts.map(this.mapToEntity);
  }

  async findActiveBoostByUserId(userId: string): Promise<Boost | null> {
    const boost = await db(this.tableName)
      .where({ user_id: userId, status: BOOST_STATUS.ACTIVE })
      .where('expires_at', '>', new Date())
      .first();

    return boost ? this.mapToEntity(boost) : null;
  }

  async update(id: string, input: BoostUpdateInput): Promise<Boost> {
    const updateData: any = {
      updated_at: new Date(),
    };

    if (input.status !== undefined) updateData.status = input.status;
    if (input.startedAt !== undefined) updateData.started_at = input.startedAt;
    if (input.expiresAt !== undefined) updateData.expires_at = input.expiresAt;
    if (input.impressionsGained !== undefined)
      updateData.impressions_gained = input.impressionsGained;
    if (input.likesGained !== undefined) updateData.likes_gained = input.likesGained;
    if (input.matchesGained !== undefined) updateData.matches_gained = input.matchesGained;

    const [boost] = await db(this.tableName).where({ id }).update(updateData).returning('*');

    return this.mapToEntity(boost);
  }

  async activateBoost(id: string): Promise<Boost> {
    const now = new Date();
    const boost = await this.findById(id);

    if (!boost) {
      throw new Error('Boost not found');
    }

    const expiresAt = calculateBoostExpiry(now, boost.durationMinutes);

    const [updatedBoost] = await db(this.tableName)
      .where({ id })
      .update({
        status: BOOST_STATUS.ACTIVE,
        started_at: now,
        expires_at: expiresAt,
        updated_at: now,
      })
      .returning('*');

    return this.mapToEntity(updatedBoost);
  }

  async completeBoost(id: string): Promise<Boost> {
    const [boost] = await db(this.tableName)
      .where({ id })
      .update({
        status: BOOST_STATUS.COMPLETED,
        updated_at: new Date(),
      })
      .returning('*');

    return this.mapToEntity(boost);
  }

  async cancelBoost(id: string): Promise<Boost> {
    const [boost] = await db(this.tableName)
      .where({ id })
      .update({
        status: BOOST_STATUS.CANCELED,
        updated_at: new Date(),
      })
      .returning('*');

    return this.mapToEntity(boost);
  }

  async incrementMetrics(
    id: string,
    metrics: {
      impressions?: number;
      likes?: number;
      matches?: number;
    }
  ): Promise<Boost> {
    const updateData: any = {
      updated_at: new Date(),
    };

    if (metrics.impressions) {
      updateData.impressions_gained = db.raw('impressions_gained + ?', [metrics.impressions]);
    }
    if (metrics.likes) {
      updateData.likes_gained = db.raw('likes_gained + ?', [metrics.likes]);
    }
    if (metrics.matches) {
      updateData.matches_gained = db.raw('matches_gained + ?', [metrics.matches]);
    }

    const [boost] = await db(this.tableName).where({ id }).update(updateData).returning('*');

    return this.mapToEntity(boost);
  }

  async findExpiredActiveBoosts(): Promise<Boost[]> {
    const boosts = await db(this.tableName)
      .where({ status: BOOST_STATUS.ACTIVE })
      .where('expires_at', '<', new Date())
      .select('*');

    return boosts.map(this.mapToEntity);
  }

  async getUserBoostStats(userId: string): Promise<{
    totalBoosts: number;
    totalImpressions: number;
    totalLikes: number;
    totalMatches: number;
    averageEffectiveness: number;
  }> {
    const result = (await db(this.tableName)
      .where({ user_id: userId, status: BOOST_STATUS.COMPLETED })
      .select(
        db.raw('COUNT(*) as total_boosts'),
        db.raw('SUM(impressions_gained) as total_impressions'),
        db.raw('SUM(likes_gained) as total_likes'),
        db.raw('SUM(matches_gained) as total_matches')
      )
      .first()) as any;

    const totalBoosts = parseInt(result?.total_boosts || '0', 10);
    const totalImpressions = parseInt(result?.total_impressions || '0', 10);
    const totalLikes = parseInt(result?.total_likes || '0', 10);
    const totalMatches = parseInt(result?.total_matches || '0', 10);

    const averageEffectiveness =
      totalBoosts > 0 ? (totalLikes + totalMatches * 2) / totalBoosts : 0;

    return {
      totalBoosts,
      totalImpressions,
      totalLikes,
      totalMatches,
      averageEffectiveness,
    };
  }

  async delete(id: string): Promise<void> {
    await db(this.tableName).where({ id }).del();
  }

  // Map database row to entity
  private mapToEntity(row: any): Boost {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      status: row.status,
      durationMinutes: row.duration_minutes,
      visibilityMultiplier: parseFloat(row.visibility_multiplier),
      startedAt: row.started_at,
      expiresAt: row.expires_at,
      impressionsGained: row.impressions_gained,
      likesGained: row.likes_gained,
      matchesGained: row.matches_gained,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new BoostRepository();
