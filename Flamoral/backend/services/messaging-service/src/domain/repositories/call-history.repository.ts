import { Container } from '@azure/cosmos';
import { createLogger } from '../../utils/logger';
import { cosmosClient } from '../../infrastructure/database/cosmos-client';
import { CallHistory } from '../../types/enhanced-types';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('call-history-repository');

export class CallHistoryRepository {
  private container: Container;

  constructor() {
    this.container = cosmosClient.getCallHistoryContainer();
  }

  /**
   * Create a new call history record
   */
  async create(callHistory: Omit<CallHistory, 'id' | 'createdAt' | 'updatedAt'>): Promise<CallHistory> {
    try {
      const record: CallHistory = {
        id: uuidv4(),
        ...callHistory,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      logger.info(`Creating call history record: ${record.id}`);

      const { resource } = await this.container.items.create(record);

      logger.info(`Call history record created: ${record.id}`);
      return resource as CallHistory;
    } catch (error: any) {
      logger.error(`Failed to create call history record:`, error);
      throw new Error(`Failed to create call history: ${error.message}`);
    }
  }

  /**
   * Find call history by call ID
   */
  async findByCallId(callId: string): Promise<CallHistory | null> {
    try {
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.callId = @callId',
        parameters: [{ name: '@callId', value: callId }],
      };

      const { resources } = await this.container.items.query<CallHistory>(querySpec).fetchAll();

      return resources.length > 0 ? resources[0] : null;
    } catch (error: any) {
      logger.error(`Failed to find call history by call ID ${callId}:`, error);
      throw error;
    }
  }

  /**
   * Find call history by ID
   */
  async findById(id: string, callerId: string): Promise<CallHistory | null> {
    try {
      const { resource } = await this.container.item(id, callerId).read<CallHistory>();
      return resource || null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      logger.error(`Failed to find call history ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update call history
   */
  async update(id: string, callerId: string, updates: Partial<CallHistory>): Promise<CallHistory> {
    try {
      logger.info(`Updating call history: ${id}`);

      const existing = await this.findById(id, callerId);
      if (!existing) {
        throw new Error(`Call history ${id} not found`);
      }

      const updated: CallHistory = {
        ...existing,
        ...updates,
        updatedAt: new Date(),
      };

      const { resource } = await this.container.item(id, callerId).replace(updated);

      logger.info(`Call history updated: ${id}`);
      return resource as CallHistory;
    } catch (error: any) {
      logger.error(`Failed to update call history ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get call history for a user
   */
  async getCallHistoryByUser(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<CallHistory[]> {
    try {
      const querySpec = {
        query: `SELECT * FROM c
                WHERE c.callerId = @userId OR c.calleeId = @userId
                ORDER BY c.startTime DESC
                OFFSET @offset LIMIT @limit`,
        parameters: [
          { name: '@userId', value: userId },
          { name: '@offset', value: offset },
          { name: '@limit', value: limit },
        ],
      };

      const { resources } = await this.container.items.query<CallHistory>(querySpec).fetchAll();
      return resources;
    } catch (error: any) {
      logger.error('Failed to get call history by user:', error);
      throw error;
    }
  }

  /**
   * Get call history between two users
   */
  async getCallHistoryBetweenUsers(
    userId1: string,
    userId2: string,
    limit: number = 50
  ): Promise<CallHistory[]> {
    try {
      const querySpec = {
        query: `SELECT * FROM c
                WHERE (c.callerId = @userId1 AND c.calleeId = @userId2)
                   OR (c.callerId = @userId2 AND c.calleeId = @userId1)
                ORDER BY c.startTime DESC
                OFFSET 0 LIMIT @limit`,
        parameters: [
          { name: '@userId1', value: userId1 },
          { name: '@userId2', value: userId2 },
          { name: '@limit', value: limit },
        ],
      };

      const { resources } = await this.container.items.query<CallHistory>(querySpec).fetchAll();
      return resources;
    } catch (error: any) {
      logger.error('Failed to get call history between users:', error);
      throw error;
    }
  }

  /**
   * Get call statistics for a user
   */
  async getCallStats(userId: string): Promise<{
    totalCalls: number;
    videoCalls: number;
    audioCalls: number;
    completedCalls: number;
    missedCalls: number;
    rejectedCalls: number;
    totalDuration: number;
  }> {
    try {
      const querySpec = {
        query: `SELECT * FROM c
                WHERE c.callerId = @userId OR c.calleeId = @userId`,
        parameters: [{ name: '@userId', value: userId }],
      };

      const { resources } = await this.container.items.query<CallHistory>(querySpec).fetchAll();

      const stats = {
        totalCalls: resources.length,
        videoCalls: resources.filter(c => c.callType === 'video').length,
        audioCalls: resources.filter(c => c.callType === 'audio').length,
        completedCalls: resources.filter(c => c.status === 'ended').length,
        missedCalls: resources.filter(c => c.status === 'missed' && c.calleeId === userId).length,
        rejectedCalls: resources.filter(c => c.status === 'rejected').length,
        totalDuration: resources.reduce((sum, c) => sum + (c.duration || 0), 0),
      };

      return stats;
    } catch (error: any) {
      logger.error('Failed to get call stats:', error);
      throw error;
    }
  }

  /**
   * Delete call history (soft delete by marking status as deleted)
   */
  async delete(id: string, callerId: string): Promise<void> {
    try {
      logger.info(`Deleting call history: ${id}`);
      await this.container.item(id, callerId).delete();
      logger.info(`Call history deleted: ${id}`);
    } catch (error: any) {
      logger.error(`Failed to delete call history ${id}:`, error);
      throw error;
    }
  }
}

export const callHistoryRepository = new CallHistoryRepository();
export default callHistoryRepository;
