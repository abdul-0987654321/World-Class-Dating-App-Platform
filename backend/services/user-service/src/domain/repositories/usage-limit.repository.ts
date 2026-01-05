import db from '../../infrastructure/database/connection';
import {
  UsageLimit,
  UsageLimitCreateInput,
  UsageLimitUpdateInput,
  getNextResetTime,
} from '../entities/UsageLimit.entity';

export class UsageLimitRepository {
  private tableName = 'usage_limits';

  async create(input: UsageLimitCreateInput): Promise<UsageLimit> {
    const now = new Date();
    const limitData = {
      user_id: input.userId,
      resource_type: input.resourceType,
      daily_limit: input.dailyLimit,
      current_usage: 0,
      reset_at: getNextResetTime(),
      created_at: now,
      updated_at: now,
    };

    const [limit] = await db(this.tableName).insert(limitData).returning('*');

    return this.mapToEntity(limit);
  }

  async findById(id: string): Promise<UsageLimit | null> {
    const limit = await db(this.tableName).where({ id }).first();

    return limit ? this.mapToEntity(limit) : null;
  }

  async findByUserIdAndResource(userId: string, resourceType: string): Promise<UsageLimit | null> {
    const limit = await db(this.tableName)
      .where({ user_id: userId, resource_type: resourceType })
      .first();

    return limit ? this.mapToEntity(limit) : null;
  }

  async findByUserId(userId: string): Promise<UsageLimit[]> {
    const limits = await db(this.tableName).where({ user_id: userId }).select('*');

    return limits.map(this.mapToEntity);
  }

  async update(id: string, input: UsageLimitUpdateInput): Promise<UsageLimit> {
    const updateData: any = {
      updated_at: new Date(),
    };

    if (input.dailyLimit !== undefined) updateData.daily_limit = input.dailyLimit;
    if (input.currentUsage !== undefined) updateData.current_usage = input.currentUsage;
    if (input.resetAt !== undefined) updateData.reset_at = input.resetAt;

    const [limit] = await db(this.tableName).where({ id }).update(updateData).returning('*');

    return this.mapToEntity(limit);
  }

  async incrementUsage(id: string, amount: number = 1): Promise<UsageLimit> {
    const [limit] = await db(this.tableName)
      .where({ id })
      .update({
        current_usage: db.raw('current_usage + ?', [amount]),
        updated_at: new Date(),
      })
      .returning('*');

    return this.mapToEntity(limit);
  }

  async resetUsage(id: string): Promise<UsageLimit> {
    const [limit] = await db(this.tableName)
      .where({ id })
      .update({
        current_usage: 0,
        last_reset_at: new Date(),
        reset_at: getNextResetTime(),
        updated_at: new Date(),
      })
      .returning('*');

    return this.mapToEntity(limit);
  }

  async resetAllUserLimits(userId: string): Promise<UsageLimit[]> {
    const limits = await db(this.tableName)
      .where({ user_id: userId })
      .update({
        current_usage: 0,
        last_reset_at: new Date(),
        reset_at: getNextResetTime(),
        updated_at: new Date(),
      })
      .returning('*');

    return limits.map(this.mapToEntity);
  }

  async findLimitsNeedingReset(): Promise<UsageLimit[]> {
    const limits = await db(this.tableName)
      .where('reset_at', '<=', new Date())
      .where('current_usage', '>', 0)
      .select('*');

    return limits.map(this.mapToEntity);
  }

  async delete(id: string): Promise<void> {
    await db(this.tableName).where({ id }).del();
  }

  async deleteByUserId(userId: string): Promise<void> {
    await db(this.tableName).where({ user_id: userId }).del();
  }

  // Map database row to entity
  private mapToEntity(row: any): UsageLimit {
    return {
      id: row.id,
      userId: row.user_id,
      resourceType: row.resource_type,
      dailyLimit: row.daily_limit,
      currentUsage: row.current_usage,
      resetAt: row.reset_at,
      lastResetAt: row.last_reset_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new UsageLimitRepository();
