import { v4 as uuidv4 } from 'uuid';
import imageProcessingService from './image-processing.service';
import azureStorageService from '../../infrastructure/storage/azure-storage.service';
import contentModerationService from './content-moderation.service';
import mediaRepository from '../repositories/media.repository';
import { MediaMetadata, ModerationStatus, UploadedFile } from '../../types';
import { createLogger } from '@flamoral/backend-shared';

const logger = createLogger('upload-service');

export class UploadService {
  /**
   * Upload and process a photo
   */
  async uploadPhoto(
    file: UploadedFile,
    userId: string,
    isProfilePhoto: boolean = false
  ): Promise<MediaMetadata> {
    try {
      logger.info(`Uploading photo for user ${userId}`);

      // Step 1: Validate the image
      const validation = imageProcessingService.validateImage(
        file.buffer,
        file.mimetype,
        file.size
      );

      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Step 2: Get image metadata
      const metadata = await imageProcessingService.getMetadata(file.buffer);

      // Step 3: Process image (create all versions)
      const processedImages = await imageProcessingService.processImage(file.buffer);

      // Step 4: Upload all versions to Azure Storage
      const urls = await azureStorageService.uploadImageVersions(
        processedImages,
        file.originalname,
        file.mimetype,
        userId
      );

      // Step 5: Create media metadata
      const mediaId = uuidv4();
      const media: MediaMetadata = {
        id: mediaId,
        userId,
        fileName: `${mediaId}-${file.originalname}`,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        urls,
        dimensions: {
          width: metadata.width,
          height: metadata.height,
        },
        isProfilePhoto,
        isVerified: false,
        moderationStatus: ModerationStatus.PENDING,
        uploadedAt: new Date(),
        updatedAt: new Date(),
      };

      // Step 6: Save to database
      const savedMedia = await mediaRepository.create(media);

      // Step 7: Start content moderation (async - don't wait)
      this.moderatePhotoAsync(savedMedia);

      logger.info(`Photo uploaded successfully: ${mediaId}`);
      return savedMedia;
    } catch (error) {
      logger.error('Photo upload failed', error);
      throw error;
    }
  }

  /**
   * Moderate photo asynchronously
   */
  private async moderatePhotoAsync(media: MediaMetadata): Promise<void> {
    try {
      logger.info(`Starting content moderation for media ${media.id}`);

      // Analyze the standard version of the image using the moderation service
      const { status, result } = await contentModerationService.moderateImage(
        media.urls.standard,
        media.id,
        media.userId
      );

      // Update media metadata with moderation results
      await mediaRepository.update(media.id, {
        moderationStatus: status,
        moderationResult: result,
      });

      logger.info(`Content moderation complete for media ${media.id}: ${status}`);

      // If rejected, delete the files from storage
      if (status === ModerationStatus.REJECTED) {
        await this.deletePhoto(media.id, media.urls);
        logger.info(`Rejected photo deleted: ${media.id}`);
      }
    } catch (error) {
      logger.error('Content moderation failed', error);
    }
  }

  /**
   * Delete a photo
   */
  async deletePhoto(
    mediaId: string,
    urls: {
      thumbnail: string;
      standard: string;
      hd: string;
      original: string;
    }
  ): Promise<boolean> {
    try {
      logger.info(`Deleting photo: ${mediaId}`);

      // Delete all versions from Azure Storage
      const deleted = await azureStorageService.deleteImageVersions(urls);

      if (deleted) {
        // Delete from database
        await mediaRepository.delete(mediaId);
        logger.info(`Photo deleted successfully: ${mediaId}`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Photo deletion failed', error);
      throw error;
    }
  }

  /**
   * Get user's photos
   */
  async getUserPhotos(userId: string): Promise<MediaMetadata[]> {
    try {
      logger.info(`Retrieving photos for user: ${userId}`);
      return await mediaRepository.findByUserId(userId);
    } catch (error) {
      logger.error('Failed to retrieve user photos', error);
      throw error;
    }
  }

  /**
   * Get a specific photo
   */
  async getPhoto(mediaId: string): Promise<MediaMetadata | null> {
    try {
      logger.info(`Retrieving photo: ${mediaId}`);
      return await mediaRepository.findById(mediaId);
    } catch (error) {
      logger.error('Failed to retrieve photo', error);
      throw error;
    }
  }

  /**
   * Set photo as profile photo
   */
  async setAsProfilePhoto(mediaId: string, userId: string): Promise<boolean> {
    try {
      logger.info(`Setting photo ${mediaId} as profile photo for user ${userId}`);

      // 1. Unset current profile photo
      await mediaRepository.unsetProfilePhotos(userId);

      // 2. Set new profile photo
      await mediaRepository.update(mediaId, { isProfilePhoto: true });

      logger.info(`Profile photo updated successfully`);
      return true;
    } catch (error) {
      logger.error('Failed to set profile photo', error);
      throw error;
    }
  }

  /**
   * Verify photo meets requirements
   */
  async verifyPhotoRequirements(imageUrl: string): Promise<{ valid: boolean; error?: string }> {
    try {
      // Check if photo contains at least one face
      const hasFace = await contentModerationService.verifyFacePresence(imageUrl);

      if (!hasFace) {
        return {
          valid: false,
          error: 'Photo must contain a clear view of your face',
        };
      }

      return { valid: true };
    } catch (error) {
      logger.error('Photo verification failed', error);
      return {
        valid: false,
        error: 'Failed to verify photo requirements',
      };
    }
  }
}

export default new UploadService();
