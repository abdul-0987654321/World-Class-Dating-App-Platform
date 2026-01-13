import { postgresClient } from '../../infrastructure/database/postgres-client';
import { CallSession } from '../../services/video-call.service';
import { createLogger } from '../../utils/logger';

const logger = createLogger('call-history-repository');

export interface CallHistoryDocument extends CallSession {
  id: string;
  createdAt: Date;
}

export interface CallStatistics {
  totalCalls: number;
  totalDuration: number;
  avgDuration: number;
  completedCalls: number;
  missedCalls: number;
  rejectedCalls: number;
}

export class CallHistoryRepository {
  /**
   * Save call to history
   */
  async save(callSession: CallSession): Promise<CallHistoryDocument> {
    try {
      const document: CallHistoryDocument = {
        ...callSession,
        id: callSession.callId,
        createdAt: new Date(),
      };

      logger.info(`Saving call to history: ${callSession.callId}`);

      const [result] = await postgresClient.callHistory().insert(document).returning('*');

      logger.info(`Call saved to history: ${callSession.callId}`);
      return result as CallHistoryDocument;
    } catch (error: any) {
      logger.error(`Failed to save call ${callSession.callId}:`, error);
      throw new Error(`Failed to save call: ${error.message}`);
    }
  }

  /**
   * Find call by ID
   */
  async findById(callId: string, _callerId?: string): Promise<CallHistoryDocument | null> {
    try {
      const result = await postgresClient.callHistory().where('id', callId).first();
      return result || null;
    } catch (error: any) {
      logger.error(`Failed to find call ${callId}:`, error);
      throw error;
    }
  }

  /**
   * Get call history for a user
   */
  async getHistoryForUser(
    userId: string,
    type: 'all' | 'outgoing' | 'incoming' = 'all',
    limit: number = 50,
    offset: number = 0
  ): Promise<CallHistoryDocument[]> {
    try {
      let query = postgresClient.callHistory();

      if (type === 'outgoing') {
        query = query.where('caller_id', userId);
      } else if (type === 'incoming') {
        query = query.where('callee_id', userId);
      } else {
        query = query.where('caller_id', userId).orWhere('callee_id', userId);
      }

      const results = await query.orderBy('start_time', 'desc').limit(limit).offset(offset);

      return results as CallHistoryDocument[];
    } catch (error: any) {
      logger.error('Failed to get call history:', error);
      throw error;
    }
  }

  /**
   * Get calls between two users
   */
  async getCallsBetweenUsers(
    userId1: string,
    userId2: string,
    limit: number = 50
  ): Promise<CallHistoryDocument[]> {
    try {
      const results = await postgresClient
        .callHistory()
        .where(function () {
          this.where('caller_id', userId1).andWhere('callee_id', userId2);
        })
        .orWhere(function () {
          this.where('caller_id', userId2).andWhere('callee_id', userId1);
        })
        .orderBy('start_time', 'desc')
        .limit(limit);

      return results as CallHistoryDocument[];
    } catch (error: any) {
      logger.error('Failed to get calls between users:', error);
      throw error;
    }
  }

  /**
   * Get call statistics for a user
   */
  async getStatisticsForUser(userId: string): Promise<CallStatistics> {
    try {
      const result = await postgresClient
        .callHistory()
        .where('caller_id', userId)
        .orWhere('callee_id', userId)
        .select(
          postgresClient.callHistory().client.raw('COUNT(*) as total_calls'),
          postgresClient.callHistory().client.raw('COALESCE(SUM(duration), 0) as total_duration'),
          postgresClient
            .callHistory()
            .client.raw("COALESCE(SUM(CASE WHEN status = 'ended' THEN 1 ELSE 0 END), 0) as completed_calls"),
          postgresClient
            .callHistory()
            .client.raw("COALESCE(SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END), 0) as missed_calls"),
          postgresClient
            .callHistory()
            .client.raw("COALESCE(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0) as rejected_calls")
        )
        .first();

      const stats = result || {
        total_calls: 0,
        total_duration: 0,
        completed_calls: 0,
        missed_calls: 0,
        rejected_calls: 0,
      };

      const totalCalls = Number(stats.total_calls) || 0;
      const totalDuration = Number(stats.total_duration) || 0;

      return {
        totalCalls,
        totalDuration,
        avgDuration: totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0,
        completedCalls: Number(stats.completed_calls) || 0,
        missedCalls: Number(stats.missed_calls) || 0,
        rejectedCalls: Number(stats.rejected_calls) || 0,
      };
    } catch (error: any) {
      logger.error('Failed to get call statistics:', error);
      throw error;
    }
  }

  /**
   * Get recent calls count
   */
  async getRecentCallsCount(userId: string, since: Date): Promise<number> {
    try {
      const result = await postgresClient
        .callHistory()
        .where(function () {
          this.where('caller_id', userId).orWhere('callee_id', userId);
        })
        .andWhere('start_time', '>=', since.getTime())
        .count('* as count')
        .first();

      return Number(result?.count) || 0;
    } catch (error: any) {
      logger.error('Failed to get recent calls count:', error);
      throw error;
    }
  }

  /**
   * Delete old call history
   */
  async deleteOldCalls(olderThan: Date): Promise<number> {
    try {
      const deleted = await postgresClient
        .callHistory()
        .where('start_time', '<', olderThan.getTime())
        .delete();

      logger.info(`Deleted ${deleted} old calls`);
      return deleted;
    } catch (error: any) {
      logger.error('Failed to delete old calls:', error);
      throw error;
    }
  }
}

export const callHistoryRepository = new CallHistoryRepository();
export default callHistoryRepository;
