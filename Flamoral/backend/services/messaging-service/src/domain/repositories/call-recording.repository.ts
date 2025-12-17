import { Container } from '@azure/cosmos';
import { createLogger } from '../../utils/logger';
import { cosmosClient } from '../../infrastructure/database/cosmos-client';
import { CallRecording } from '../../types/enhanced-types';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('call-recording-repository');

export class CallRecordingRepository {
  private container: Container;

  constructor() {
    this.container = cosmosClient.getCallRecordingsContainer();
  }

  /**
   * Create a new call recording record
   */
  async create(recording: Omit<CallRecording, 'id' | 'createdAt' | 'updatedAt'>): Promise<CallRecording> {
    try {
      const record: CallRecording = {
        id: uuidv4(),
        ...recording,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      logger.info(`Creating call recording record: ${record.id}`);

      const { resource } = await this.container.items.create(record);

      logger.info(`Call recording record created: ${record.id}`);
      return resource as CallRecording;
    } catch (error: any) {
      logger.error(`Failed to create call recording record:`, error);
      throw new Error(`Failed to create call recording: ${error.message}`);
    }
  }

  /**
   * Find recording by recording ID
   */
  async findByRecordingId(recordingId: string): Promise<CallRecording | null> {
    try {
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.recordingId = @recordingId',
        parameters: [{ name: '@recordingId', value: recordingId }],
      };

      const { resources } = await this.container.items.query<CallRecording>(querySpec).fetchAll();

      return resources.length > 0 ? resources[0] : null;
    } catch (error: any) {
      logger.error(`Failed to find recording by recording ID ${recordingId}:`, error);
      throw error;
    }
  }

  /**
   * Find recording by ID
   */
  async findById(id: string, callId: string): Promise<CallRecording | null> {
    try {
      const { resource } = await this.container.item(id, callId).read<CallRecording>();
      return resource || null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      logger.error(`Failed to find recording ${id}:`, error);
      throw error;
    }
  }

  /**
   * Find recordings by call ID
   */
  async findByCallId(callId: string): Promise<CallRecording[]> {
    try {
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.callId = @callId ORDER BY c.startTime DESC',
        parameters: [{ name: '@callId', value: callId }],
      };

      const { resources } = await this.container.items.query<CallRecording>(querySpec).fetchAll();
      return resources;
    } catch (error: any) {
      logger.error(`Failed to find recordings by call ID ${callId}:`, error);
      throw error;
    }
  }

  /**
   * Update call recording
   */
  async update(id: string, callId: string, updates: Partial<CallRecording>): Promise<CallRecording> {
    try {
      logger.info(`Updating call recording: ${id}`);

      const existing = await this.findById(id, callId);
      if (!existing) {
        throw new Error(`Call recording ${id} not found`);
      }

      const updated: CallRecording = {
        ...existing,
        ...updates,
        updatedAt: new Date(),
      };

      const { resource } = await this.container.item(id, callId).replace(updated);

      logger.info(`Call recording updated: ${id}`);
      return resource as CallRecording;
    } catch (error: any) {
      logger.error(`Failed to update call recording ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update recording by recording ID
   */
  async updateByRecordingId(recordingId: string, updates: Partial<CallRecording>): Promise<CallRecording> {
    try {
      const existing = await this.findByRecordingId(recordingId);
      if (!existing) {
        throw new Error(`Recording ${recordingId} not found`);
      }

      return await this.update(existing.id, existing.callId, updates);
    } catch (error: any) {
      logger.error(`Failed to update recording by recording ID ${recordingId}:`, error);
      throw error;
    }
  }

  /**
   * Get all recordings with pagination
   */
  async getRecordings(limit: number = 50, offset: number = 0): Promise<CallRecording[]> {
    try {
      const querySpec = {
        query: `SELECT * FROM c
                ORDER BY c.startTime DESC
                OFFSET @offset LIMIT @limit`,
        parameters: [
          { name: '@offset', value: offset },
          { name: '@limit', value: limit },
        ],
      };

      const { resources } = await this.container.items.query<CallRecording>(querySpec).fetchAll();
      return resources;
    } catch (error: any) {
      logger.error('Failed to get recordings:', error);
      throw error;
    }
  }

  /**
   * Get recordings by status
   */
  async getRecordingsByStatus(
    status: 'started' | 'stopped' | 'failed',
    limit: number = 50
  ): Promise<CallRecording[]> {
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

      const { resources } = await this.container.items.query<CallRecording>(querySpec).fetchAll();
      return resources;
    } catch (error: any) {
      logger.error('Failed to get recordings by status:', error);
      throw error;
    }
  }

  /**
   * Get recording statistics
   */
  async getRecordingStats(): Promise<{
    totalRecordings: number;
    activeRecordings: number;
    completedRecordings: number;
    failedRecordings: number;
    totalDuration: number;
    totalSize: number;
  }> {
    try {
      const querySpec = {
        query: 'SELECT * FROM c',
      };

      const { resources } = await this.container.items.query<CallRecording>(querySpec).fetchAll();

      const stats = {
        totalRecordings: resources.length,
        activeRecordings: resources.filter(r => r.status === 'started').length,
        completedRecordings: resources.filter(r => r.status === 'stopped').length,
        failedRecordings: resources.filter(r => r.status === 'failed').length,
        totalDuration: resources.reduce((sum, r) => sum + (r.duration || 0), 0),
        totalSize: resources.reduce((sum, r) => sum + (r.fileSize || 0), 0),
      };

      return stats;
    } catch (error: any) {
      logger.error('Failed to get recording stats:', error);
      throw error;
    }
  }

  /**
   * Delete recording metadata
   */
  async delete(id: string, callId: string): Promise<void> {
    try {
      logger.info(`Deleting call recording: ${id}`);
      await this.container.item(id, callId).delete();
      logger.info(`Call recording deleted: ${id}`);
    } catch (error: any) {
      logger.error(`Failed to delete call recording ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete recording by recording ID
   */
  async deleteByRecordingId(recordingId: string): Promise<void> {
    try {
      const existing = await this.findByRecordingId(recordingId);
      if (!existing) {
        throw new Error(`Recording ${recordingId} not found`);
      }

      await this.delete(existing.id, existing.callId);
    } catch (error: any) {
      logger.error(`Failed to delete recording by recording ID ${recordingId}:`, error);
      throw error;
    }
  }
}

export const callRecordingRepository = new CallRecordingRepository();
export default callRecordingRepository;
