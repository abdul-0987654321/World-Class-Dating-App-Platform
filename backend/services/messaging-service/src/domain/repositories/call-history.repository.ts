import { Container } from '@azure/cosmos';

import { cosmosClient } from '../../infrastructure/database/cosmos-client';
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
  private _container: Container | null = null;

  private get container(): Container {
    if (!this._container) {
      this._container = cosmosClient.getCallHistoryContainer();
    }
    return this._container;
  }

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

      const { resource } = await this.container.items.create(document);

      logger.info(`Call saved to history: ${callSession.callId}`);
      return resource as CallHistoryDocument;
    } catch (error: any) {
      logger.error(`Failed to save call ${callSession.callId}:`, error);
      throw new Error(`Failed to save call: ${error.message}`);
    }
  }

  /**
   * Find call by ID
   */
  async findById(callId: string, callerId: string): Promise<CallHistoryDocument | null> {
    try {
      const { resource } = await this.container.item(callId, callerId).read<CallHistoryDocument>();
      return resource || null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
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
      let query: string;
      let parameters: { name: string; value: any }[];

      if (type === 'outgoing') {
        query = `SELECT * FROM c
                 WHERE c.callerId = @userId
                 ORDER BY c.startTime DESC
                 OFFSET @offset LIMIT @limit`;
        parameters = [
          { name: '@userId', value: userId },
          { name: '@offset', value: offset },
          { name: '@limit', value: limit },
        ];
      } else if (type === 'incoming') {
        query = `SELECT * FROM c
                 WHERE c.calleeId = @userId
                 ORDER BY c.startTime DESC
                 OFFSET @offset LIMIT @limit`;
        parameters = [
          { name: '@userId', value: userId },
          { name: '@offset', value: offset },
          { name: '@limit', value: limit },
        ];
      } else {
        query = `SELECT * FROM c
                 WHERE c.callerId = @userId OR c.calleeId = @userId
                 ORDER BY c.startTime DESC
                 OFFSET @offset LIMIT @limit`;
        parameters = [
          { name: '@userId', value: userId },
          { name: '@offset', value: offset },
          { name: '@limit', value: limit },
        ];
      }

      const querySpec = { query, parameters };
      const { resources } = await this.container.items
        .query<CallHistoryDocument>(querySpec)
        .fetchAll();

      return resources;
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
      const querySpec = {
        query: `SELECT * FROM c
                WHERE ((c.callerId = @userId1 AND c.calleeId = @userId2)
                   OR (c.callerId = @userId2 AND c.calleeId = @userId1))
                ORDER BY c.startTime DESC
                OFFSET 0 LIMIT @limit`,
        parameters: [
          { name: '@userId1', value: userId1 },
          { name: '@userId2', value: userId2 },
          { name: '@limit', value: limit },
        ],
      };

      const { resources } = await this.container.items
        .query<CallHistoryDocument>(querySpec)
        .fetchAll();
      return resources;
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
      // Total calls and duration
      const totalQuery = {
        query: `SELECT VALUE {
                  totalCalls: COUNT(1),
                  totalDuration: SUM(c.duration),
                  completedCalls: SUM(c.status = 'ended' ? 1 : 0),
                  missedCalls: SUM(c.status = 'missed' ? 1 : 0),
                  rejectedCalls: SUM(c.status = 'rejected' ? 1 : 0)
                }
                FROM c
                WHERE c.callerId = @userId OR c.calleeId = @userId`,
        parameters: [{ name: '@userId', value: userId }],
      };

      const { resources } = await this.container.items
        .query<{
          totalCalls: number;
          totalDuration: number;
          completedCalls: number;
          missedCalls: number;
          rejectedCalls: number;
        }>(totalQuery)
        .fetchAll();

      const stats = resources[0] || {
        totalCalls: 0,
        totalDuration: 0,
        completedCalls: 0,
        missedCalls: 0,
        rejectedCalls: 0,
      };

      return {
        totalCalls: stats.totalCalls || 0,
        totalDuration: stats.totalDuration || 0,
        avgDuration:
          stats.totalCalls > 0 ? Math.round((stats.totalDuration || 0) / stats.totalCalls) : 0,
        completedCalls: stats.completedCalls || 0,
        missedCalls: stats.missedCalls || 0,
        rejectedCalls: stats.rejectedCalls || 0,
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
      const querySpec = {
        query: `SELECT VALUE COUNT(1) FROM c
                WHERE (c.callerId = @userId OR c.calleeId = @userId)
                AND c.startTime >= @since`,
        parameters: [
          { name: '@userId', value: userId },
          { name: '@since', value: since.getTime() },
        ],
      };

      const { resources } = await this.container.items.query<number>(querySpec).fetchAll();
      return resources[0] || 0;
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
      const querySpec = {
        query: `SELECT c.id, c.callerId FROM c
                WHERE c.startTime < @olderThan`,
        parameters: [{ name: '@olderThan', value: olderThan.getTime() }],
      };

      const { resources } = await this.container.items
        .query<{ id: string; callerId: string }>(querySpec)
        .fetchAll();

      let deleted = 0;
      for (const call of resources) {
        try {
          await this.container.item(call.id, call.callerId).delete();
          deleted++;
        } catch (error) {
          logger.error(`Failed to delete call ${call.id}:`, error);
        }
      }

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
