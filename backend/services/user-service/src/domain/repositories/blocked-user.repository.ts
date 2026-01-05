import db from '../../infrastructure/database/connection';
import { BlockedUser, BlockedUserCreateInput } from '../entities/BlockedUser.entity';

export class BlockedUserRepository {
  private tableName = 'blocked_users';

  async create(input: BlockedUserCreateInput): Promise<BlockedUser> {
    const now = new Date();
    const blockData = {
      blocker_id: input.blockerId,
      blocked_id: input.blockedId,
      reason: input.reason,
      created_at: now,
    };

    const [block] = await db(this.tableName).insert(blockData).returning('*');

    return this.mapToEntity(block);
  }

  async findById(id: string): Promise<BlockedUser | null> {
    const block = await db(this.tableName).where({ id }).first();

    return block ? this.mapToEntity(block) : null;
  }

  async findByBlockerAndBlocked(blockerId: string, blockedId: string): Promise<BlockedUser | null> {
    const block = await db(this.tableName)
      .where({ blocker_id: blockerId, blocked_id: blockedId })
      .first();

    return block ? this.mapToEntity(block) : null;
  }

  async findBlockedUsersByBlockerId(blockerId: string): Promise<BlockedUser[]> {
    const blocks = await db(this.tableName)
      .where({ blocker_id: blockerId })
      .orderBy('created_at', 'desc')
      .select('*');

    return blocks.map(this.mapToEntity);
  }

  async findBlockersByBlockedId(blockedId: string): Promise<BlockedUser[]> {
    const blocks = await db(this.tableName)
      .where({ blocked_id: blockedId })
      .orderBy('created_at', 'desc')
      .select('*');

    return blocks.map(this.mapToEntity);
  }

  async getBlockedUserIds(blockerId: string): Promise<string[]> {
    const blocks = await db(this.tableName).where({ blocker_id: blockerId }).select('blocked_id');

    return blocks.map((block) => block.blocked_id);
  }

  async getBlockerUserIds(blockedId: string): Promise<string[]> {
    const blocks = await db(this.tableName).where({ blocked_id: blockedId }).select('blocker_id');

    return blocks.map((block) => block.blocker_id);
  }

  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const block = await db(this.tableName)
      .where({ blocker_id: blockerId, blocked_id: blockedId })
      .first();

    return !!block;
  }

  async isBlockedBidirectional(userAId: string, userBId: string): Promise<boolean> {
    const blocks = await db(this.tableName)
      .where(function () {
        this.where({ blocker_id: userAId, blocked_id: userBId }).orWhere({
          blocker_id: userBId,
          blocked_id: userAId,
        });
      })
      .first();

    return !!blocks;
  }

  async getUsersToExclude(userId: string): Promise<string[]> {
    const blockedIds = await this.getBlockedUserIds(userId);
    const blockerIds = await this.getBlockerUserIds(userId);

    // Combine and remove duplicates
    const allIds = [...new Set([...blockedIds, ...blockerIds])];
    return allIds;
  }

  async delete(id: string): Promise<void> {
    await db(this.tableName).where({ id }).del();
  }

  async deleteByBlockerAndBlocked(blockerId: string, blockedId: string): Promise<void> {
    await db(this.tableName).where({ blocker_id: blockerId, blocked_id: blockedId }).del();
  }

  async deleteAllBlocksByUser(userId: string): Promise<void> {
    await db(this.tableName).where({ blocker_id: userId }).orWhere({ blocked_id: userId }).del();
  }

  async countBlocksByUser(userId: string): Promise<{
    blockedCount: number;
    blockedByCount: number;
  }> {
    const blockedResult = await db(this.tableName)
      .where({ blocker_id: userId })
      .count('* as count')
      .first();

    const blockedByResult = await db(this.tableName)
      .where({ blocked_id: userId })
      .count('* as count')
      .first();

    return {
      blockedCount: parseInt((blockedResult?.count as string) || '0', 10),
      blockedByCount: parseInt((blockedByResult?.count as string) || '0', 10),
    };
  }

  // Map database row to entity
  private mapToEntity(row: any): BlockedUser {
    return {
      id: row.id,
      blockerId: row.blocker_id,
      blockedId: row.blocked_id,
      reason: row.reason,
      createdAt: row.created_at,
    };
  }
}

export default new BlockedUserRepository();
