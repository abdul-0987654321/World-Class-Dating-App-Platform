import { Knex } from 'knex';
import { SwipeModel, MatchModel, DailyLimitModel, BoostModel, BlockModel, ReportModel } from '../models/Match.model';
import { v4 as uuidv4 } from 'uuid';

export class MatchRepository {
  private db: Knex;

  constructor(db: Knex) {
    this.db = db;
  }

  // Swipe operations
  async createSwipe(userId: string, targetUserId: string, action: 'like' | 'pass' | 'super_like'): Promise<SwipeModel> {
    const swipeId = uuidv4();

    const [swipe] = await this.db('swipes')
      .insert({
        id: swipeId,
        user_id: userId,
        target_user_id: targetUserId,
        action,
        swiped_at: new Date(),
        created_at: new Date(),
      })
      .returning('*');

    return swipe;
  }

  async getSwipe(userId: string, targetUserId: string): Promise<SwipeModel | null> {
    const swipe = await this.db('swipes')
      .where({ user_id: userId, target_user_id: targetUserId })
      .first();

    return swipe || null;
  }

  async hasSwipedOn(userId: string, targetUserId: string): Promise<boolean> {
    const swipe = await this.getSwipe(userId, targetUserId);
    return swipe !== null;
  }

  // Match operations
  async createMatch(userId1: string, userId2: string): Promise<MatchModel> {
    const matchId = uuidv4();

    const [match] = await this.db('matches')
      .insert({
        id: matchId,
        user_id_1: userId1,
        user_id_2: userId2,
        matched_at: new Date(),
        is_active: true,
        unread_count_user_1: 0,
        unread_count_user_2: 0,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    return match;
  }

  async getMatch(matchId: string): Promise<MatchModel | null> {
    const match = await this.db('matches')
      .where({ id: matchId })
      .first();

    return match || null;
  }

  async getMatchBetweenUsers(userId1: string, userId2: string): Promise<MatchModel | null> {
    const match = await this.db('matches')
      .where((builder) => {
        builder.where({ user_id_1: userId1, user_id_2: userId2 })
          .orWhere({ user_id_1: userId2, user_id_2: userId1 });
      })
      .first();

    return match || null;
  }

  async getUserMatches(userId: string, limit: number = 50, offset: number = 0): Promise<MatchModel[]> {
    const matches = await this.db('matches')
      .where((builder) => {
        builder.where({ user_id_1: userId }).orWhere({ user_id_2: userId });
      })
      .andWhere({ is_active: true })
      .orderBy('last_message_at', 'desc')
      .limit(limit)
      .offset(offset);

    return matches;
  }

  async unmatch(matchId: string): Promise<void> {
    await this.db('matches')
      .where({ id: matchId })
      .update({
        is_active: false,
        updated_at: new Date(),
      });
  }

  async updateLastMessage(matchId: string, senderId: string): Promise<void> {
    const match = await this.getMatch(matchId);
    if (!match) return;

    const updateData: any = {
      last_message_at: new Date(),
      updated_at: new Date(),
    };

    // Increment unread count for the other user
    if (senderId === match.user_id_1) {
      updateData.unread_count_user_2 = match.unread_count_user_2 + 1;
    } else {
      updateData.unread_count_user_1 = match.unread_count_user_1 + 1;
    }

    await this.db('matches')
      .where({ id: matchId })
      .update(updateData);
  }

  async markAsRead(matchId: string, userId: string): Promise<void> {
    const match = await this.getMatch(matchId);
    if (!match) return;

    const updateData: any = {
      updated_at: new Date(),
    };

    if (userId === match.user_id_1) {
      updateData.unread_count_user_1 = 0;
    } else {
      updateData.unread_count_user_2 = 0;
    }

    await this.db('matches')
      .where({ id: matchId })
      .update(updateData);
  }

  // Daily limits
  async getDailyLimit(userId: string, date: Date): Promise<DailyLimitModel | null> {
    const dateStr = date.toISOString().split('T')[0];

    const limit = await this.db('daily_limits')
      .where({ user_id: userId })
      .whereRaw('DATE(date) = ?', [dateStr])
      .first();

    return limit || null;
  }

  async incrementDailyLimit(userId: string, type: 'likes' | 'super_likes' | 'rewinds' | 'boosts'): Promise<DailyLimitModel> {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    const existing = await this.getDailyLimit(userId, today);

    if (existing) {
      const field = `${type}_count`;
      const [limit] = await this.db('daily_limits')
        .where({ id: existing.id })
        .increment(field, 1)
        .update({ updated_at: new Date() })
        .returning('*');

      return limit;
    } else {
      const limitId = uuidv4();
      const [limit] = await this.db('daily_limits')
        .insert({
          id: limitId,
          user_id: userId,
          date: dateStr,
          likes_count: type === 'likes' ? 1 : 0,
          super_likes_count: type === 'super_likes' ? 1 : 0,
          rewinds_count: type === 'rewinds' ? 1 : 0,
          boosts_count: type === 'boosts' ? 1 : 0,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning('*');

      return limit;
    }
  }

  // Boost operations
  async createBoost(userId: string, durationMinutes: number = 30): Promise<BoostModel> {
    const boostId = uuidv4();
    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + durationMinutes * 60 * 1000);

    const [boost] = await this.db('boosts')
      .insert({
        id: boostId,
        user_id: userId,
        started_at: startedAt,
        expires_at: expiresAt,
        is_active: true,
        views_gained: 0,
        created_at: new Date(),
      })
      .returning('*');

    return boost;
  }

  async getActiveBoost(userId: string): Promise<BoostModel | null> {
    const boost = await this.db('boosts')
      .where({ user_id: userId, is_active: true })
      .where('expires_at', '>', new Date())
      .orderBy('created_at', 'desc')
      .first();

    return boost || null;
  }

  async incrementBoostViews(boostId: string): Promise<void> {
    await this.db('boosts')
      .where({ id: boostId })
      .increment('views_gained', 1);
  }

  async expireBoosts(): Promise<void> {
    await this.db('boosts')
      .where('expires_at', '<', new Date())
      .where({ is_active: true })
      .update({ is_active: false });
  }

  // Block operations
  async blockUser(userId: string, blockedUserId: string, reason?: string): Promise<BlockModel> {
    const blockId = uuidv4();

    const [block] = await this.db('blocks')
      .insert({
        id: blockId,
        user_id: userId,
        blocked_user_id: blockedUserId,
        reason,
        blocked_at: new Date(),
        created_at: new Date(),
      })
      .returning('*');

    // If they have a match, deactivate it
    const match = await this.getMatchBetweenUsers(userId, blockedUserId);
    if (match) {
      await this.unmatch(match.id);
    }

    return block;
  }

  async unblockUser(userId: string, blockedUserId: string): Promise<void> {
    await this.db('blocks')
      .where({ user_id: userId, blocked_user_id: blockedUserId })
      .delete();
  }

  async getBlockedUsers(userId: string): Promise<BlockModel[]> {
    const blocks = await this.db('blocks')
      .where({ user_id: userId })
      .orderBy('blocked_at', 'desc');

    return blocks;
  }

  async isBlocked(userId: string, targetUserId: string): Promise<boolean> {
    const block = await this.db('blocks')
      .where((builder) => {
        builder.where({ user_id: userId, blocked_user_id: targetUserId })
          .orWhere({ user_id: targetUserId, blocked_user_id: userId });
      })
      .first();

    return block !== undefined;
  }

  // Report operations
  async createReport(reporterUserId: string, reportedUserId: string, reason: string, details?: string): Promise<ReportModel> {
    const reportId = uuidv4();

    const [report] = await this.db('reports')
      .insert({
        id: reportId,
        reporter_user_id: reporterUserId,
        reported_user_id: reportedUserId,
        reason,
        details,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    return report;
  }

  async getPendingReports(limit: number = 50): Promise<ReportModel[]> {
    const reports = await this.db('reports')
      .where({ status: 'pending' })
      .orderBy('created_at', 'asc')
      .limit(limit);

    return reports;
  }

  async updateReportStatus(reportId: string, status: string, reviewedBy: string, actionTaken?: string): Promise<ReportModel> {
    const [report] = await this.db('reports')
      .where({ id: reportId })
      .update({
        status,
        reviewed_by: reviewedBy,
        reviewed_at: new Date(),
        action_taken: actionTaken,
        updated_at: new Date(),
      })
      .returning('*');

    return report;
  }
}
