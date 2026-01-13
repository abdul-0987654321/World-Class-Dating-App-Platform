import { postgresClient } from '../../infrastructure/database/postgres-client';
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

      const [result] = await postgresClient.callRecordings().insert(document).returning('*');

      logger.info(`Recording metadata saved: ${recording.recordingId}`);
      return result as CallRecordingDocument;
    } catch (error: any) {
      logger.error(`Failed to save recording ${recording.recordingId}:`, error);
      throw new Error(`Failed to save recording: ${error.message}`);
    }
  }

  /**
   * Find recording by ID
   */
  async findById(recordingId: string, _callId?: string): Promise<CallRecordingDocument | null> {
    try {
      const result = await postgresClient.callRecordings().where('id', recordingId).first();
      return result || null;
    } catch (error: any) {
      logger.error(`Failed to find recording ${recordingId}:`, error);
      throw error;
    }
  }

  /**
   * Update recording metadata
   */
  async update(
    recordingId: string,
    _callId: string,
    updates: Partial<CallRecordingDocument>
  ): Promise<CallRecordingDocument> {
    try {
      logger.info(`Updating recording: ${recordingId}`);

      const existing = await this.findById(recordingId);
      if (!existing) {
        throw new Error(`Recording ${recordingId} not found`);
      }

      const [result] = await postgresClient
        .callRecordings()
        .where('id', recordingId)
        .update({
          ...updates,
          updatedAt: new Date(),
        })
        .returning('*');

      logger.info(`Recording updated: ${recordingId}`);
      return result as CallRecordingDocument;
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
      const results = await postgresClient
        .callRecordings()
        .where('call_id', callId)
        .orderBy('start_time', 'desc');

      return results as CallRecordingDocument[];
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
      const results = await postgresClient
        .callRecordings()
        .where('user_id', userId)
        .orderBy('start_time', 'desc')
        .limit(limit)
        .offset(offset);

      return results as CallRecordingDocument[];
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
      const results = await postgresClient
        .callRecordings()
        .where('status', status)
        .orderBy('start_time', 'desc')
        .limit(limit);

      return results as CallRecordingDocument[];
    } catch (error: any) {
      logger.error('Failed to get recordings by status:', error);
      throw error;
    }
  }

  /**
   * Delete recording metadata
   */
  async delete(recordingId: string, _callId?: string): Promise<void> {
    try {
      logger.info(`Deleting recording metadata: ${recordingId}`);
      await postgresClient.callRecordings().where('id', recordingId).delete();
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
      const result = await postgresClient
        .callRecordings()
        .where('user_id', userId)
        .andWhere('status', 'stopped')
        .sum('duration as total')
        .first();

      return Number(result?.total) || 0;
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
      const result = await postgresClient
        .callRecordings()
        .where('user_id', userId)
        .count('* as count')
        .first();

      return Number(result?.count) || 0;
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
      const deleted = await postgresClient
        .callRecordings()
        .where('start_time', '<', olderThan.getTime())
        .delete();

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
