import azureStorageService from '../infrastructure/storage/azure-storage.service';
import mediaRepository from '../domain/repositories/media.repository';
import { createLogger } from '@flamoral/shared';

const logger = createLogger('blob-lifecycle-util');

export interface CleanupResult {
  deletedCount: number;
  failedCount: number;
  errors: string[];
}

export interface OrphanedBlob {
  url: string;
  lastModified?: Date;
  size?: number;
}

class BlobLifecycleUtil {
  /**
   * Delete orphaned blobs (blobs that exist in storage but not in database)
   * This should be run periodically as a maintenance task
   */
  async cleanupOrphanedBlobs(dryRun: boolean = true): Promise<CleanupResult> {
    logger.info('Starting orphaned blob cleanup', { dryRun });

    const result: CleanupResult = {
      deletedCount: 0,
      failedCount: 0,
      errors: [],
    };

    try {
      // Get all media records from database
      const allMedia = await mediaRepository.findAll();
      const registeredUrls = new Set<string>();

      // Collect all registered URLs (all versions)
      allMedia.forEach((media) => {
        if (media.urls) {
          registeredUrls.add(media.urls.thumbnail);
          registeredUrls.add(media.urls.standard);
          registeredUrls.add(media.urls.hd);
          registeredUrls.add(media.urls.original);
        }
      });

      logger.info('Registered URLs collected', {
        totalMedia: allMedia.length,
        totalUrls: registeredUrls.size,
      });

      // TODO: Implement blob listing when needed
      // This would require iterating through all blobs in the container
      // and checking if they exist in registeredUrls
      // For now, this is a placeholder for the implementation

      logger.info('Orphaned blob cleanup completed', {
        dryRun,
        deletedCount: result.deletedCount,
        failedCount: result.failedCount,
      });

      return result;
    } catch (error) {
      logger.error('Orphaned blob cleanup failed', error);
      throw error;
    }
  }

  /**
   * Delete media for a specific user
   */
  async deleteUserMedia(userId: string, dryRun: boolean = false): Promise<CleanupResult> {
    logger.info('Deleting media for user', { userId, dryRun });

    const result: CleanupResult = {
      deletedCount: 0,
      failedCount: 0,
      errors: [],
    };

    try {
      // Get all media for user
      const userMedia = await mediaRepository.findByUserId(userId);

      logger.info('Found user media', {
        userId,
        count: userMedia.length,
      });

      // Delete each media item
      for (const media of userMedia) {
        try {
          if (!dryRun && media.urls) {
            // Delete all versions from storage
            const deleted = await azureStorageService.deleteImageVersions(media.urls);

            if (deleted) {
              // Delete from database
              await mediaRepository.delete(media.id);
              result.deletedCount++;
              logger.info('Deleted media', { mediaId: media.id, userId });
            } else {
              result.failedCount++;
              result.errors.push(`Failed to delete media ${media.id} from storage`);
            }
          } else {
            logger.info('Dry run - would delete media', { mediaId: media.id });
            result.deletedCount++;
          }
        } catch (error) {
          result.failedCount++;
          const errorMessage = `Failed to delete media ${media.id}: ${(error as Error).message}`;
          result.errors.push(errorMessage);
          logger.error('Failed to delete media', { mediaId: media.id, error });
        }
      }

      logger.info('User media deletion completed', {
        userId,
        dryRun,
        deletedCount: result.deletedCount,
        failedCount: result.failedCount,
      });

      return result;
    } catch (error) {
      logger.error('User media deletion failed', error);
      throw error;
    }
  }

  /**
   * Delete old unverified media (media pending moderation for too long)
   */
  async cleanupOldUnverifiedMedia(
    olderThanDays: number = 30,
    dryRun: boolean = true
  ): Promise<CleanupResult> {
    logger.info('Cleaning up old unverified media', {
      olderThanDays,
      dryRun,
    });

    const result: CleanupResult = {
      deletedCount: 0,
      failedCount: 0,
      errors: [],
    };

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      // Get all pending media older than cutoff date
      const oldMedia = await mediaRepository.findPendingOlderThan(cutoffDate);

      logger.info('Found old unverified media', {
        count: oldMedia.length,
        cutoffDate,
      });

      // Delete each old media item
      for (const media of oldMedia) {
        try {
          if (!dryRun && media.urls) {
            // Delete all versions from storage
            const deleted = await azureStorageService.deleteImageVersions(media.urls);

            if (deleted) {
              // Delete from database
              await mediaRepository.delete(media.id);
              result.deletedCount++;
              logger.info('Deleted old unverified media', {
                mediaId: media.id,
                uploadedAt: media.uploadedAt,
              });
            } else {
              result.failedCount++;
              result.errors.push(`Failed to delete media ${media.id} from storage`);
            }
          } else {
            logger.info('Dry run - would delete old unverified media', {
              mediaId: media.id,
              uploadedAt: media.uploadedAt,
            });
            result.deletedCount++;
          }
        } catch (error) {
          result.failedCount++;
          const errorMessage = `Failed to delete media ${media.id}: ${(error as Error).message}`;
          result.errors.push(errorMessage);
          logger.error('Failed to delete old unverified media', {
            mediaId: media.id,
            error,
          });
        }
      }

      logger.info('Old unverified media cleanup completed', {
        dryRun,
        deletedCount: result.deletedCount,
        failedCount: result.failedCount,
      });

      return result;
    } catch (error) {
      logger.error('Old unverified media cleanup failed', error);
      throw error;
    }
  }

  /**
   * Calculate storage usage for a user
   */
  async calculateUserStorageUsage(userId: string): Promise<{
    count: number;
    totalSize: number;
    byType: { [key: string]: { count: number; size: number } };
  }> {
    try {
      const userMedia = await mediaRepository.findByUserId(userId);

      const result = {
        count: userMedia.length,
        totalSize: 0,
        byType: {} as { [key: string]: { count: number; size: number } },
      };

      for (const media of userMedia) {
        result.totalSize += media.size || 0;

        const type = media.mimeType?.split('/')[0] || 'unknown';
        if (!result.byType[type]) {
          result.byType[type] = { count: 0, size: 0 };
        }

        result.byType[type].count++;
        result.byType[type].size += media.size || 0;
      }

      logger.info('Calculated user storage usage', {
        userId,
        count: result.count,
        totalSize: result.totalSize,
      });

      return result;
    } catch (error) {
      logger.error('Failed to calculate user storage usage', error);
      throw error;
    }
  }

  /**
   * Archive old media (move to cold storage tier)
   * This is a placeholder for future implementation with Azure Blob Storage tiers
   */
  async archiveOldMedia(
    olderThanDays: number = 180,
    dryRun: boolean = true
  ): Promise<CleanupResult> {
    logger.info('Archiving old media', {
      olderThanDays,
      dryRun,
    });

    // TODO: Implement blob tier management
    // This would involve changing blob access tier to Cool or Archive

    return {
      deletedCount: 0,
      failedCount: 0,
      errors: ['Archive functionality not yet implemented'],
    };
  }
}

export default new BlobLifecycleUtil();
