import { Knex } from 'knex';
import db from '../../infrastructure/database/connection';
import { VideoMetadata, ModerationStatus } from '../../types';
import { createLogger } from '@flamoral/shared';

const logger = createLogger('video-repository');

export class VideoRepository {
  private db: Knex;

  constructor(database: Knex = db) {
    this.db = database;
  }

  async create(video: VideoMetadata): Promise<VideoMetadata> {
    try {
      const [created] = await this.db('videos')
        .insert({
          id: video.id,
          user_id: video.userId,
          file_name: video.fileName,
          original_name: video.originalName,
          mime_type: video.mimeType,
          size: video.size,
          duration: video.duration,
          urls: JSON.stringify(video.urls),
          dimensions: JSON.stringify(video.dimensions),
          codec: video.codec,
          bitrate: video.bitrate,
          frame_rate: video.frameRate,
          moderation_status: video.moderationStatus,
          moderation_result: video.moderationResult ? JSON.stringify(video.moderationResult) : null,
          uploaded_at: video.uploadedAt,
          updated_at: video.updatedAt,
        })
        .returning('*');

      return this.mapToVideoMetadata(created);
    } catch (error) {
      logger.error('Failed to create video record', error);
      throw error;
    }
  }

  async findById(id: string): Promise<VideoMetadata | null> {
    try {
      const video = await this.db('videos').where({ id }).first();
      return video ? this.mapToVideoMetadata(video) : null;
    } catch (error) {
      logger.error('Failed to find video by ID', error);
      throw error;
    }
  }

  async findByUserId(userId: string): Promise<VideoMetadata[]> {
    try {
      const videos = await this.db('videos')
        .where({ user_id: userId })
        .orderBy('uploaded_at', 'desc');

      return videos.map(this.mapToVideoMetadata);
    } catch (error) {
      logger.error('Failed to find videos by user ID', error);
      throw error;
    }
  }

  async update(id: string, updates: Partial<VideoMetadata>): Promise<VideoMetadata | null> {
    try {
      const updateData: any = {updated_at: new Date()};

      if (updates.moderationStatus !== undefined) {
        updateData.moderation_status = updates.moderationStatus;
      }
      if (updates.moderationResult !== undefined) {
        updateData.moderation_result = JSON.stringify(updates.moderationResult);
      }

      const [updated] = await this.db('videos')
        .where({ id })
        .update(updateData)
        .returning('*');

      return updated ? this.mapToVideoMetadata(updated) : null;
    } catch (error) {
      logger.error('Failed to update video record', error);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const deleted = await this.db('videos').where({ id }).del();
      return deleted > 0;
    } catch (error) {
      logger.error('Failed to delete video record', error);
      throw error;
    }
  }

  private mapToVideoMetadata(record: any): VideoMetadata {
    return {
      id: record.id,
      userId: record.user_id,
      fileName: record.file_name,
      originalName: record.original_name,
      mimeType: record.mime_type,
      size: record.size,
      duration: record.duration,
      urls: typeof record.urls === 'string' ? JSON.parse(record.urls) : record.urls,
      dimensions: typeof record.dimensions === 'string' ? JSON.parse(record.dimensions) : record.dimensions,
      codec: record.codec,
      bitrate: record.bitrate,
      frameRate: record.frame_rate,
      moderationStatus: record.moderation_status,
      moderationResult: record.moderation_result
        ? (typeof record.moderation_result === 'string'
          ? JSON.parse(record.moderation_result)
          : record.moderation_result)
        : undefined,
      uploadedAt: new Date(record.uploaded_at),
      updatedAt: new Date(record.updated_at),
    };
  }
}

export default new VideoRepository();
