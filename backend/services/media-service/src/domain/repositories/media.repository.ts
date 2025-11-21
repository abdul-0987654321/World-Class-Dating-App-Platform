import { Knex } from 'knex';
import db from '../../infrastructure/database/connection';
import { MediaMetadata, ModerationStatus } from '../../types';
import { createLogger } from '@connectsphere/shared';

const logger = createLogger('media-repository');

export class MediaRepository {
  private db: Knex;

  constructor(database: Knex = db) {
    this.db = database;
  }

  /**
   * Create a new media record
   */
  async create(media: MediaMetadata): Promise<MediaMetadata> {
    try {
      const [created] = await this.db('media')
        .insert({
          id: media.id,
          user_id: media.userId,
          file_name: media.fileName,
          original_name: media.originalName,
          mime_type: media.mimeType,
          size: media.size,
          urls: JSON.stringify(media.urls),
          dimensions: JSON.stringify(media.dimensions),
          is_profile_photo: media.isProfilePhoto,
          is_verified: media.isVerified,
          moderation_status: media.moderationStatus,
          moderation_result: media.moderationResult ? JSON.stringify(media.moderationResult) : null,
          uploaded_at: media.uploadedAt,
          updated_at: media.updatedAt,
        })
        .returning('*');

      return this.mapToMediaMetadata(created);
    } catch (error) {
      logger.error('Failed to create media record', error);
      throw error;
    }
  }

  /**
   * Find media by ID
   */
  async findById(id: string): Promise<MediaMetadata | null> {
    try {
      const media = await this.db('media')
        .where({ id })
        .first();

      return media ? this.mapToMediaMetadata(media) : null;
    } catch (error) {
      logger.error('Failed to find media by ID', error);
      throw error;
    }
  }

  /**
   * Find all media for a user
   */
  async findByUserId(userId: string): Promise<MediaMetadata[]> {
    try {
      const media = await this.db('media')
        .where({ user_id: userId })
        .orderBy('uploaded_at', 'desc');

      return media.map(this.mapToMediaMetadata);
    } catch (error) {
      logger.error('Failed to find media by user ID', error);
      throw error;
    }
  }

  /**
   * Find user's profile photo
   */
  async findProfilePhoto(userId: string): Promise<MediaMetadata | null> {
    try {
      const media = await this.db('media')
        .where({
          user_id: userId,
          is_profile_photo: true,
        })
        .first();

      return media ? this.mapToMediaMetadata(media) : null;
    } catch (error) {
      logger.error('Failed to find profile photo', error);
      throw error;
    }
  }

  /**
   * Update media record
   */
  async update(id: string, updates: Partial<MediaMetadata>): Promise<MediaMetadata | null> {
    try {
      const updateData: any = {};

      if (updates.isProfilePhoto !== undefined) {
        updateData.is_profile_photo = updates.isProfilePhoto;
      }
      if (updates.isVerified !== undefined) {
        updateData.is_verified = updates.isVerified;
      }
      if (updates.moderationStatus !== undefined) {
        updateData.moderation_status = updates.moderationStatus;
      }
      if (updates.moderationResult !== undefined) {
        updateData.moderation_result = JSON.stringify(updates.moderationResult);
      }

      const [updated] = await this.db('media')
        .where({ id })
        .update(updateData)
        .returning('*');

      return updated ? this.mapToMediaMetadata(updated) : null;
    } catch (error) {
      logger.error('Failed to update media record', error);
      throw error;
    }
  }

  /**
   * Unset all profile photos for a user
   */
  async unsetProfilePhotos(userId: string): Promise<void> {
    try {
      await this.db('media')
        .where({ user_id: userId })
        .update({ is_profile_photo: false });
    } catch (error) {
      logger.error('Failed to unset profile photos', error);
      throw error;
    }
  }

  /**
   * Delete media record
   */
  async delete(id: string): Promise<boolean> {
    try {
      const deleted = await this.db('media')
        .where({ id })
        .del();

      return deleted > 0;
    } catch (error) {
      logger.error('Failed to delete media record', error);
      throw error;
    }
  }

  /**
   * Count user's media
   */
  async countByUserId(userId: string): Promise<number> {
    try {
      const result = await this.db('media')
        .where({ user_id: userId })
        .count('* as count')
        .first();

      return parseInt(result?.count as string || '0', 10);
    } catch (error) {
      logger.error('Failed to count user media', error);
      throw error;
    }
  }

  /**
   * Find media by moderation status
   */
  async findByModerationStatus(status: ModerationStatus): Promise<MediaMetadata[]> {
    try {
      const media = await this.db('media')
        .where({ moderation_status: status })
        .orderBy('uploaded_at', 'asc');

      return media.map(this.mapToMediaMetadata);
    } catch (error) {
      logger.error('Failed to find media by moderation status', error);
      throw error;
    }
  }

  /**
   * Map database record to MediaMetadata
   */
  private mapToMediaMetadata(record: any): MediaMetadata {
    return {
      id: record.id,
      userId: record.user_id,
      fileName: record.file_name,
      originalName: record.original_name,
      mimeType: record.mime_type,
      size: record.size,
      urls: typeof record.urls === 'string' ? JSON.parse(record.urls) : record.urls,
      dimensions: typeof record.dimensions === 'string' ? JSON.parse(record.dimensions) : record.dimensions,
      isProfilePhoto: record.is_profile_photo,
      isVerified: record.is_verified,
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

export default new MediaRepository();
