import { createLogger } from '@flamoral/backend-shared';
import { Knex } from 'knex';

import db from '../../infrastructure/database/connection';
import { MatchStatus } from '../../types';
import { Match } from '../entities/Match.entity';

const logger = createLogger('match-repository');

export class MatchRepository {
  private db: Knex;

  constructor(database: Knex = db) {
    this.db = database;
  }

  /**
   * Create a new match
   */
  async create(match: Partial<Match>): Promise<Match> {
    try {
      const [created] = await this.db('matches')
        .insert({
          user1_id: match.user1Id,
          user2_id: match.user2Id,
          status: match.status || MatchStatus.MATCHED,
          compatibility_score: match.compatibilityScore,
          matched_at: match.matchedAt || new Date(),
          last_activity_at: match.lastActivityAt || new Date(),
          expires_at: match.expiresAt,
          extended: match.extended || false,
          extended_at: match.extendedAt,
          expired: match.expired || false,
          first_message_sent: match.firstMessageSent || false,
        })
        .returning('*');

      return this.mapToMatch(created);
    } catch (error) {
      logger.error('Failed to create match', error);
      throw error;
    }
  }

  /**
   * Create a new match within a transaction
   * Used for atomic swipe + match creation
   */
  async createWithTransaction(trx: Knex, match: Partial<Match>): Promise<Match> {
    const [created] = await trx('matches')
      .insert({
        user1_id: match.user1Id,
        user2_id: match.user2Id,
        status: match.status || MatchStatus.MATCHED,
        compatibility_score: match.compatibilityScore,
        matched_at: match.matchedAt || new Date(),
        last_activity_at: match.lastActivityAt || new Date(),
        expires_at: match.expiresAt,
        extended: match.extended || false,
        extended_at: match.extendedAt,
        expired: match.expired || false,
        first_message_sent: match.firstMessageSent || false,
      })
      .returning('*');

    return this.mapToMatch(created);
  }

  /**
   * Find match by ID
   */
  async findById(matchId: string): Promise<Match | null> {
    try {
      const match = await this.db('matches').where({ id: matchId }).first();

      return match ? this.mapToMatch(match) : null;
    } catch (error) {
      logger.error('Failed to find match by ID', error);
      throw error;
    }
  }

  /**
   * Find match between two users
   */
  async findByUsers(user1Id: string, user2Id: string): Promise<Match | null> {
    try {
      const [sortedUser1, sortedUser2] = [user1Id, user2Id].sort();

      const match = await this.db('matches')
        .where({
          user1_id: sortedUser1,
          user2_id: sortedUser2,
        })
        .first();

      return match ? this.mapToMatch(match) : null;
    } catch (error) {
      logger.error('Failed to find match by users', error);
      throw error;
    }
  }

  /**
   * Find match between two users within a transaction
   */
  async findByUsersWithTransaction(
    trx: Knex,
    user1Id: string,
    user2Id: string
  ): Promise<Match | null> {
    const [sortedUser1, sortedUser2] = [user1Id, user2Id].sort();

    const match = await trx('matches')
      .where({
        user1_id: sortedUser1,
        user2_id: sortedUser2,
      })
      .first();

    return match ? this.mapToMatch(match) : null;
  }

  /**
   * Get all matches for a user
   */
  async findByUserId(userId: string, status?: MatchStatus): Promise<Match[]> {
    try {
      let query = this.db('matches').where('user1_id', userId).orWhere('user2_id', userId);

      if (status) {
        query = query.andWhere('status', status);
      }

      const matches = await query.orderBy('last_activity_at', 'desc');

      return matches.map(this.mapToMatch);
    } catch (error) {
      logger.error('Failed to find matches by user ID', error);
      throw error;
    }
  }

  /**
   * Update match status
   */
  async updateStatus(matchId: string, status: MatchStatus): Promise<Match | null> {
    try {
      const updateData: any = { status };

      if (status === MatchStatus.UNMATCHED) {
        updateData.unmatched_at = new Date();
      }

      const [updated] = await this.db('matches')
        .where({ id: matchId })
        .update(updateData)
        .returning('*');

      return updated ? this.mapToMatch(updated) : null;
    } catch (error) {
      logger.error('Failed to update match status', error);
      throw error;
    }
  }

  /**
   * Update a match with partial data
   */
  async update(matchId: string, data: Partial<Match>): Promise<Match | null> {
    try {
      const updateData: any = {};
      if (data.conversationInitiated !== undefined)
        updateData.conversation_initiated = data.conversationInitiated;
      if (data.firstMessageSentBy !== undefined)
        updateData.first_message_sent_by = data.firstMessageSentBy;
      if (data.firstMessageSent !== undefined)
        updateData.first_message_sent = data.firstMessageSent;
      if (data.status !== undefined) updateData.status = data.status;

      const [updated] = await this.db('matches')
        .where({ id: matchId })
        .update(updateData)
        .returning('*');

      return updated ? this.mapToMatch(updated) : null;
    } catch (error) {
      logger.error('Failed to update match', error);
      throw error;
    }
  }

  /**
   * Unmatch users
   */
  async unmatch(matchId: string, reason?: string): Promise<Match | null> {
    try {
      const [updated] = await this.db('matches')
        .where({ id: matchId })
        .update({
          status: MatchStatus.UNMATCHED,
          unmatched_at: new Date(),
        })
        .returning('*');

      return updated ? this.mapToMatch(updated) : null;
    } catch (error) {
      logger.error('Failed to unmatch', error);
      throw error;
    }
  }

  /**
   * Delete a match
   */
  async delete(matchId: string): Promise<boolean> {
    try {
      const deleted = await this.db('matches').where({ id: matchId }).del();

      return deleted > 0;
    } catch (error) {
      logger.error('Failed to delete match', error);
      throw error;
    }
  }

  /**
   * Delete a match within a transaction
   */
  async deleteWithTransaction(trx: Knex, matchId: string): Promise<boolean> {
    const deleted = await trx('matches').where({ id: matchId }).del();
    return deleted > 0;
  }

  /**
   * Count matches for a user
   */
  async countByUserId(userId: string, status?: MatchStatus): Promise<number> {
    try {
      let query = this.db('matches').where('user1_id', userId).orWhere('user2_id', userId);

      if (status) {
        query = query.andWhere('status', status);
      }

      const result = await query.count('* as count').first();

      return parseInt((result?.count as string) || '0', 10);
    } catch (error) {
      logger.error('Failed to count matches', error);
      throw error;
    }
  }

  /**
   * Get recent matches for a user
   */
  async getRecentMatches(userId: string, limit: number = 10): Promise<Match[]> {
    try {
      const matches = await this.db('matches')
        .where('user1_id', userId)
        .orWhere('user2_id', userId)
        .andWhere('status', MatchStatus.MATCHED)
        .orderBy('matched_at', 'desc')
        .limit(limit);

      return matches.map(this.mapToMatch);
    } catch (error) {
      logger.error('Failed to get recent matches', error);
      throw error;
    }
  }

  /**
   * Check if match exists between two users
   */
  async exists(user1Id: string, user2Id: string): Promise<boolean> {
    try {
      const [sortedUser1, sortedUser2] = [user1Id, user2Id].sort();

      const match = await this.db('matches')
        .where({
          user1_id: sortedUser1,
          user2_id: sortedUser2,
        })
        .first();

      return !!match;
    } catch (error) {
      logger.error('Failed to check if match exists', error);
      throw error;
    }
  }

  /**
   * Get total match count for a user (for analytics)
   */
  async getUserMatchCount(userId: string): Promise<number> {
    try {
      const result = await this.db('matches')
        .where(function () {
          this.where('user1_id', userId).orWhere('user2_id', userId);
        })
        .andWhere('status', MatchStatus.MATCHED)
        .count('* as count')
        .first();

      return parseInt((result?.count as string) || '0', 10);
    } catch (error) {
      logger.error('Failed to get user match count', error);
      throw error;
    }
  }

  /**
   * Find matches that need to expire
   */
  async findMatchesToExpire(): Promise<Match[]> {
    try {
      const matches = await this.db('matches')
        .where('expires_at', '<', new Date())
        .andWhere('expired', false)
        .andWhere('first_message_sent', false)
        .andWhere('status', MatchStatus.MATCHED);

      return matches.map(this.mapToMatch);
    } catch (error) {
      logger.error('Failed to find matches to expire', error);
      throw error;
    }
  }

  /**
   * Mark match as expired
   */
  async markAsExpired(matchId: string): Promise<Match | null> {
    try {
      const [updated] = await this.db('matches')
        .where({ id: matchId })
        .update({
          expired: true,
          status: MatchStatus.MATCHED, // Keep as matched, just mark expired
        })
        .returning('*');

      return updated ? this.mapToMatch(updated) : null;
    } catch (error) {
      logger.error('Failed to mark match as expired', error);
      throw error;
    }
  }

  /**
   * Extend match expiration (Premium feature)
   */
  async extendMatch(matchId: string): Promise<Match | null> {
    try {
      const match = await this.findById(matchId);

      if (!match) {
        return null;
      }

      // Check if match can be extended
      if (match.extended || match.expired || match.firstMessageSent) {
        throw new Error('Match cannot be extended');
      }

      // Extend by 24 hours
      const newExpiresAt = new Date(match.expiresAt);
      newExpiresAt.setHours(newExpiresAt.getHours() + 24);

      const [updated] = await this.db('matches')
        .where({ id: matchId })
        .update({
          expires_at: newExpiresAt,
          extended: true,
          extended_at: new Date(),
        })
        .returning('*');

      return updated ? this.mapToMatch(updated) : null;
    } catch (error) {
      logger.error('Failed to extend match', error);
      throw error;
    }
  }

  /**
   * Mark first message sent
   */
  async markFirstMessageSent(matchId: string): Promise<Match | null> {
    try {
      const [updated] = await this.db('matches')
        .where({ id: matchId })
        .update({
          first_message_sent: true,
        })
        .returning('*');

      return updated ? this.mapToMatch(updated) : null;
    } catch (error) {
      logger.error('Failed to mark first message sent', error);
      throw error;
    }
  }

  /**
   * Rematch with expired match (Premium feature)
   */
  async rematch(user1Id: string, user2Id: string): Promise<Match | null> {
    try {
      const [sortedUser1, sortedUser2] = [user1Id, user2Id].sort();

      // Find the expired match
      const existingMatch = await this.db('matches')
        .where({
          user1_id: sortedUser1,
          user2_id: sortedUser2,
        })
        .andWhere('expired', true)
        .first();

      if (!existingMatch) {
        throw new Error('No expired match found');
      }

      // Reset expiration fields
      const newExpiresAt = new Date();
      newExpiresAt.setHours(newExpiresAt.getHours() + 24);

      const [updated] = await this.db('matches')
        .where({ id: existingMatch.id })
        .update({
          expires_at: newExpiresAt,
          extended: false,
          extended_at: null,
          expired: false,
          first_message_sent: false,
          status: MatchStatus.MATCHED,
          matched_at: new Date(),
        })
        .returning('*');

      return updated ? this.mapToMatch(updated) : null;
    } catch (error) {
      logger.error('Failed to rematch', error);
      throw error;
    }
  }

  /**
   * Find matches expiring soon (for notifications)
   */
  async findMatchesExpiringSoon(hours: number): Promise<Match[]> {
    try {
      const expirationThreshold = new Date();
      expirationThreshold.setHours(expirationThreshold.getHours() + hours);

      const matches = await this.db('matches')
        .where('expires_at', '<=', expirationThreshold)
        .andWhere('expires_at', '>', new Date())
        .andWhere('expired', false)
        .andWhere('first_message_sent', false)
        .andWhere('status', MatchStatus.MATCHED);

      return matches.map(this.mapToMatch);
    } catch (error) {
      logger.error('Failed to find matches expiring soon', error);
      throw error;
    }
  }

  /**
   * Map database record to Match entity
   */
  private mapToMatch(record: any): Match {
    return new Match({
      id: record.id,
      user1Id: record.user1_id,
      user2Id: record.user2_id,
      status: record.status,
      mode: record.mode || 'date',
      compatibilityScore: record.compatibility_score
        ? parseFloat(record.compatibility_score)
        : undefined,
      matchedAt: new Date(record.matched_at),
      lastActivityAt: new Date(record.last_activity_at),
      unmatchedAt: record.unmatched_at ? new Date(record.unmatched_at) : undefined,
      expiresAt: record.expires_at ? new Date(record.expires_at) : undefined,
      extended: record.extended || false,
      extendedAt: record.extended_at ? new Date(record.extended_at) : undefined,
      expired: record.expired || false,
      firstMessageSent: record.first_message_sent || false,
    });
  }
}

export default new MatchRepository();
