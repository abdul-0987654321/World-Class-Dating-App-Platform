import { Container } from '@azure/cosmos';

import { cosmosClient } from '../../infrastructure/database/cosmos-client';
import { RecordingSession } from '../../services/call-recording.service';
import { createLogger } from '../../utils/logger';

const logger = createLogger('call-recording-repository');

export interface CallRecordingDocument {
  id: string;
  recordingId: string;
  callId: string;
  userId: string;
  channelName: string;
  resourceId: string;
  sid: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  storageUrl?: string;
  fileSize?: number;
  fileList?: string[];
  status: 'started' | 'stopped' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

export interface CallRecordingMetadata {
  recordingId: string;
  callId: string;
  userId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  storageUrl?: string;
  fileSize?: number;
  status: 'started' | 'stopped' | 'failed';
}

export class CallRecordingRepository {
  private _container: Container | null = null;

  private get container(): Container {
    if (!this._container) {
      this._container = cosmosClient.getCallRecordingsContainer();
    }
    return this._container;
  }

  /**
   * Save recording metadata to database
   */
  async save(
    recording: RecordingSession,
    userId: string,
    storageUrl?: string,
    fileSize?: number
  ): Promise<CallRecordingDocument> {
    try {
      const now = new Date();
      const duration = recording.endTime
        ? Math.round((recording.endTime - recording.startTime) / 1000)
        : undefined;

      const document: CallRecordingDocument = {
        id: recording.recordingId,
        recordingId: recording.recordingId,
        callId: recording.callId,
        userId,
        channelName: recording.channelName,
        resourceId: recording.resourceId,
        sid: recording.sid,
        startTime: recording.startTime,
        endTime: recording.endTime,
        duration,
        storageUrl,
        fileSize,
        fileList: recording.fileList,
        status: recording.status,
        createdAt: now,
        updatedAt: now,
      };

      logger.info(`Saving recording metadata: ${recording.recordingId}`);

      const { resource } = await this.container.items.create(document);

      logger.info(`Recording metadata saved: ${recording.recordingId}`);
      return resource as CallRecordingDocument;
    } catch (error: any) {
      logger.error(`Failed to save recording ${recording.recordingId}:`, error);
      throw new Error(`Failed to save recording: ${error.message}`);
    }
  }

  /**
   * Find recording by ID
   */
  async findById(recordingId: string, callId: string): Promise<CallRecordingDocument | null> {
    try {
      const { resource } = await this.container
        .item(recordingId, callId)
        .read<CallRecordingDocument>();
      return resource || null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      logger.error(`Failed to find recording ${recordingId}:`, error);
      throw error;
    }
  }

  /**
   * Update recording metadata
   */
  async update(
    recordingId: string,
    callId: string,
    updates: Partial<CallRecordingDocument>
  ): Promise<CallRecordingDocument> {
    try {
      logger.info(`Updating recording: ${recordingId}`);

      const existing = await this.findById(recordingId, callId);
      if (!existing) {
        throw new Error(`Recording ${recordingId} not found`);
      }

      const updated = {
        ...existing,
        ...updates,
        updatedAt: new Date(),
      };

      const { resource } = await this.container.item(recordingId, callId).replace(updated);

      logger.info(`Recording updated: ${recordingId}`);
      return resource as CallRecordingDocument;
    } catch (error: any) {
      logger.error(`Failed to update recording ${recordingId}:`, error);
      throw error;
    }
  }

  /**
   * Get recordings by call ID
   */
  async getRecordingsByCallId(callId: string): Promise<CallRecordingDocument[]> {
    try {
      const querySpec = {
        query: `SELECT * FROM c WHERE c.callId = @callId ORDER BY c.startTime DESC`,
        parameters: [{ name: '@callId', value: callId }],
      };

      const { resources } = await this.container.items
        .query<CallRecordingDocument>(querySpec)
        .fetchAll();
      return resources;
    } catch (error: any) {
      logger.error('Failed to get recordings by call ID:', error);
      throw error;
    }
  }

  /**
   * Get recordings by user ID
   */
  async getRecordingsByUserId(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<CallRecordingDocument[]> {
    try {
      const querySpec = {
        query: `SELECT * FROM c
                WHERE c.userId = @userId
                ORDER BY c.startTime DESC
                OFFSET @offset LIMIT @limit`,
        parameters: [
          { name: '@userId', value: userId },
          { name: '@offset', value: offset },
          { name: '@limit', value: limit },
        ],
      };

      const { resources } = await this.container.items
        .query<CallRecordingDocument>(querySpec)
        .fetchAll();
      return resources;
    } catch (error: any) {
      logger.error('Failed to get recordings by user ID:', error);
      throw error;
    }
  }

  /**
   * Get recordings by status
   */
  async getRecordingsByStatus(
    status: 'started' | 'stopped' | 'failed',
    limit: number = 100
  ): Promise<CallRecordingDocument[]> {
    try {
      const querySpec = {
        query: `SELECT * FROM c
                WHERE c.status = @status
                ORDER BY c.startTime DESC
                OFFSET 0 LIMIT @limit`,
        parameters: [
          { name: '@status', value: status },
          { name: '@limit', value: limit },
        ],
      };

      const { resources } = await this.container.items
        .query<CallRecordingDocument>(querySpec)
        .fetchAll();
      return resources;
    } catch (error: any) {
      logger.error('Failed to get recordings by status:', error);
      throw error;
    }
  }

  /**
   * Delete recording metadata
   */
  async delete(recordingId: string, callId: string): Promise<void> {
    try {
      logger.info(`Deleting recording metadata: ${recordingId}`);
      await this.container.item(recordingId, callId).delete();
      logger.info(`Recording metadata deleted: ${recordingId}`);
    } catch (error: any) {
      logger.error(`Failed to delete recording ${recordingId}:`, error);
      throw error;
    }
  }

  /**
   * Get total recording duration for a user
   */
  async getTotalDurationForUser(userId: string): Promise<number> {
    try {
      const querySpec = {
        query: `SELECT VALUE SUM(c.duration) FROM c
                WHERE c.userId = @userId
                AND c.status = 'stopped'`,
        parameters: [{ name: '@userId', value: userId }],
      };

      const { resources } = await this.container.items.query<number>(querySpec).fetchAll();
      return resources[0] || 0;
    } catch (error: any) {
      logger.error('Failed to get total duration:', error);
      throw error;
    }
  }

  /**
   * Get recording count for a user
   */
  async getRecordingCountForUser(userId: string): Promise<number> {
    try {
      const querySpec = {
        query: `SELECT VALUE COUNT(1) FROM c WHERE c.userId = @userId`,
        parameters: [{ name: '@userId', value: userId }],
      };

      const { resources } = await this.container.items.query<number>(querySpec).fetchAll();
      return resources[0] || 0;
    } catch (error: any) {
      logger.error('Failed to get recording count:', error);
      throw error;
    }
  }

  /**
   * Delete old recordings (for cleanup)
   */
  async deleteOldRecordings(olderThan: Date): Promise<number> {
    try {
      const querySpec = {
        query: `SELECT c.id, c.callId FROM c WHERE c.startTime < @olderThan`,
        parameters: [{ name: '@olderThan', value: olderThan.getTime() }],
      };

      const { resources } = await this.container.items
        .query<{ id: string; callId: string }>(querySpec)
        .fetchAll();

      let deleted = 0;
      for (const recording of resources) {
        try {
          await this.container.item(recording.id, recording.callId).delete();
          deleted++;
        } catch (error) {
          logger.error(`Failed to delete recording ${recording.id}:`, error);
        }
      }

      logger.info(`Deleted ${deleted} old recording metadata entries`);
      return deleted;
    } catch (error: any) {
      logger.error('Failed to delete old recordings:', error);
      throw error;
    }
  }
}

export const callRecordingRepository = new CallRecordingRepository();
export default callRecordingRepository;
