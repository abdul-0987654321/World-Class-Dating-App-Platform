import { Knex } from 'knex';
import db from '../../infrastructure/database/connection';
import { Match } from '../entities/Match.entity';
import { MatchStatus } from '../../types';
import { createLogger } from '@flamoral/shared';

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
        })
        .returning('*');

      return this.mapToMatch(created);
    } catch (error) {
      logger.error('Failed to create match', error);
      throw error;
    }
  }

  /**
   * Find match by ID
   */
  async findById(matchId: string): Promise<Match | null> {
    try {
      const match = await this.db('matches')
        .where({ id: matchId })
        .first();

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
   * Get all matches for a user
   */
  async findByUserId(userId: string, status?: MatchStatus): Promise<Match[]> {
    try {
      let query = this.db('matches')
        .where('user1_id', userId)
        .orWhere('user2_id', userId);

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
   * Delete a match
   */
  async delete(matchId: string): Promise<boolean> {
    try {
      const deleted = await this.db('matches')
        .where({ id: matchId })
        .del();

      return deleted > 0;
    } catch (error) {
      logger.error('Failed to delete match', error);
      throw error;
    }
  }

  /**
   * Count matches for a user
   */
  async countByUserId(userId: string, status?: MatchStatus): Promise<number> {
    try {
      let query = this.db('matches')
        .where('user1_id', userId)
        .orWhere('user2_id', userId);

      if (status) {
        query = query.andWhere('status', status);
      }

      const result = await query.count('* as count').first();

      return parseInt(result?.count as string || '0', 10);
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
        .where(function() {
          this.where('user1_id', userId).orWhere('user2_id', userId);
        })
        .andWhere('status', MatchStatus.MATCHED)
        .count('* as count')
        .first();

      return parseInt(result?.count as string || '0', 10);
    } catch (error) {
      logger.error('Failed to get user match count', error);
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
      compatibilityScore: record.compatibility_score ? parseFloat(record.compatibility_score) : undefined,
      matchedAt: new Date(record.matched_at),
      lastActivityAt: new Date(record.last_activity_at),
      unmatchedAt: record.unmatched_at ? new Date(record.unmatched_at) : undefined,
    });
  }
}

export default new MatchRepository();
