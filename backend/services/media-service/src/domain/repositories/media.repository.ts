import { createLogger } from '@flamoral/backend-shared';
import { Knex } from 'knex';

import db from '../../infrastructure/database/connection';
import { MediaMetadata, ModerationStatus } from '../../types';

const logger = createLogger('media-repository');

export interface MediaRecord extends MediaMetadata {
  verificationData?: any;
  flaggedForReview?: boolean;
  flagReason?: string;
}

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
  async findById(id: string): Promise<MediaRecord | null> {
    try {
      const media = await this.db('media').where({ id }).first();

      return media ? this.mapToMediaRecord(media) : null;
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
   * Find all media with optional filters
   */
  async findAll(options?: { where?: any; select?: string[] }): Promise<MediaRecord[]> {
    try {
      let query = this.db('media');

      if (options?.where) {
        // Handle special operators like $ne
        Object.entries(options.where).forEach(([key, value]: [string, any]) => {
          const dbKey = key === 'userId' ? 'user_id' : key === 'isVerified' ? 'is_verified' : key;

          if (value && typeof value === 'object' && value.$ne !== undefined) {
            query = query.whereNot(dbKey, value.$ne);
          } else {
            query = query.where(dbKey, value);
          }
        });
      }

      if (options?.select) {
        const dbColumns = options.select.map((col) => {
          if (col === 'userId') return 'user_id';
          if (col === 'isVerified') return 'is_verified';
          if (col === 'verificationData') return 'verification_data';
          return col;
        });
        query = query.select(dbColumns);
      }

      const media = await query;
      return media.map(this.mapToMediaRecord);
    } catch (error) {
      logger.error('Failed to find all media', error);
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
  async update(id: string, updates: Partial<MediaRecord>): Promise<MediaRecord | null> {
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

      // Handle additional fields like verificationData, flaggedForReview, flagReason
      if (updates.verificationData !== undefined) {
        updateData.verification_data = JSON.stringify(updates.verificationData);
      }
      if (updates.flaggedForReview !== undefined) {
        updateData.flagged_for_review = updates.flaggedForReview;
      }
      if (updates.flagReason !== undefined) {
        updateData.flag_reason = updates.flagReason;
      }

      updateData.updated_at = new Date();

      const [updated] = await this.db('media').where({ id }).update(updateData).returning('*');

      return updated ? this.mapToMediaRecord(updated) : null;
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
      await this.db('media').where({ user_id: userId }).update({ is_profile_photo: false });
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
      const deleted = await this.db('media').where({ id }).del();

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
      const result = await this.db('media').where({ user_id: userId }).count('* as count').first();

      return parseInt((result?.count as string) || '0', 10);
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
      dimensions:
        typeof record.dimensions === 'string' ? JSON.parse(record.dimensions) : record.dimensions,
      isProfilePhoto: record.is_profile_photo,
      isVerified: record.is_verified,
      moderationStatus: record.moderation_status,
      moderationResult: record.moderation_result
        ? typeof record.moderation_result === 'string'
          ? JSON.parse(record.moderation_result)
          : record.moderation_result
        : undefined,
      uploadedAt: new Date(record.uploaded_at),
      updatedAt: new Date(record.updated_at),
    };
  }

  /**
   * Map database record to MediaRecord (includes extra fields)
   */
  private mapToMediaRecord(record: any): MediaRecord {
    const base = this.mapToMediaMetadata(record);
    return {
      ...base,
      verificationData: record.verification_data
        ? typeof record.verification_data === 'string'
          ? JSON.parse(record.verification_data)
          : record.verification_data
        : undefined,
      flaggedForReview: record.flagged_for_review,
      flagReason: record.flag_reason,
    };
  }
}

export default new MediaRepository();
