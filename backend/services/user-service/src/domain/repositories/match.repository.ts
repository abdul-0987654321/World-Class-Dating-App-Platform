import db from '../../infrastructure/database/connection';
import { MatchEntity, CreateMatchDto } from '../entities/Match.entity';

export class MatchRepository {
  private readonly tableName = 'matches';

  async create(data: CreateMatchDto): Promise<MatchEntity> {
    // Ensure user1_id < user2_id for consistent ordering
    const user1_id = data.user1_id < data.user2_id ? data.user1_id : data.user2_id;
    const user2_id = data.user1_id < data.user2_id ? data.user2_id : data.user1_id;

    const [match] = await db(this.tableName).insert({ user1_id, user2_id }).returning('*');
    return match;
  }

  async findByUserId(userId: string, isActive: boolean = true): Promise<MatchEntity[]> {
    return db(this.tableName)
      .where({ is_active: isActive })
      .andWhere(function () {
        this.where({ user1_id: userId }).orWhere({ user2_id: userId });
      })
      .orderBy('matched_at', 'desc');
  }

  async findMatch(user1Id: string, user2Id: string): Promise<MatchEntity | null> {
    const minId = user1Id < user2Id ? user1Id : user2Id;
    const maxId = user1Id < user2Id ? user2Id : user1Id;

    const match = await db(this.tableName).where({ user1_id: minId, user2_id: maxId }).first();
    return match || null;
  }

  async findById(id: string): Promise<MatchEntity | null> {
    const match = await db(this.tableName).where({ id }).first();
    return match || null;
  }

  async unmatch(matchId: string, userId: string): Promise<MatchEntity> {
    const [match] = await db(this.tableName)
      .where({ id: matchId })
      .update({
        is_active: false,
        unmatched_by: userId,
        unmatched_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning('*');
    return match;
  }

  async checkMatchExists(user1Id: string, user2Id: string): Promise<boolean> {
    const minId = user1Id < user2Id ? user1Id : user2Id;
    const maxId = user1Id < user2Id ? user2Id : user1Id;

    const match = await db(this.tableName)
      .where({ user1_id: minId, user2_id: maxId, is_active: true })
      .first();
    return !!match;
  }

  async countActiveMatches(userId: string): Promise<number> {
    const result = await db(this.tableName)
      .where({ is_active: true })
      .andWhere(function () {
        this.where({ user1_id: userId }).orWhere({ user2_id: userId });
      })
      .count('* as count')
      .first();
    return parseInt(result?.count as string) || 0;
  }

  async getRecentMatches(userId: string, days: number = 7): Promise<MatchEntity[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return db(this.tableName)
      .where({ is_active: true })
      .andWhere(function () {
        this.where({ user1_id: userId }).orWhere({ user2_id: userId });
      })
      .where('matched_at', '>=', cutoffDate)
      .orderBy('matched_at', 'desc');
  }

  async getMatchedUserIds(userId: string): Promise<string[]> {
    const matches = await db(this.tableName)
      .where({ is_active: true })
      .andWhere(function () {
        this.where({ user1_id: userId }).orWhere({ user2_id: userId });
      })
      .select('user1_id', 'user2_id');

    return matches.map((m: any) => (m.user1_id === userId ? m.user2_id : m.user1_id));
  }
}
