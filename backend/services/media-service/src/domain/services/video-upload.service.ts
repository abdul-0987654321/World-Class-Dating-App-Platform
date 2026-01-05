import { createLogger } from '@flamoral/backend-shared';
import { v4 as uuidv4 } from 'uuid';

import azureStorageService from '../../infrastructure/storage/azure-storage.service';
import { VideoMetadata, ModerationStatus, UploadedFile } from '../../types';
import videoRepository from '../repositories/video.repository';

import contentModerationService from './content-moderation.service';
import videoProcessingService from './video-processing.service';

const logger = createLogger('video-upload-service');

export class VideoUploadService {
  /**
   * Upload and process a video
   */
  async uploadVideo(
    file: UploadedFile,
    userId: string,
    videoType: 'profile' | 'prompt' = 'profile'
  ): Promise<VideoMetadata> {
    try {
      logger.info(`Uploading video for user ${userId}, type: ${videoType}`);

      // Step 1: Process video (validate, compress, generate thumbnails)
      const processed = await videoProcessingService.processVideo(file);

      if (!processed.valid) {
        throw new Error(processed.error || 'Video validation failed');
      }

      if (!processed.compressed || !processed.thumbnails || !processed.metadata) {
        throw new Error('Video processing incomplete');
      }

      // Step 2: Upload compressed video to Azure Storage
      const videoId = uuidv4();
      const videoFileName = `${videoId}-${file.originalname}`;

      const compressedVideoUrl = await azureStorageService.uploadBlob(
        processed.compressed,
        `videos/${userId}/${videoFileName}`,
        file.mimetype
      );

      // Step 3: Upload original video (optional, for backup)
      const originalVideoUrl = await azureStorageService.uploadBlob(
        file.buffer,
        `videos/${userId}/original-${videoFileName}`,
        file.mimetype
      );

      // Step 4: Upload thumbnails
      const thumbnailUrls: string[] = [];
      for (let i = 0; i < processed.thumbnails.length; i++) {
        const thumbnailUrl = await azureStorageService.uploadBlob(
          processed.thumbnails[i],
          `videos/${userId}/thumbnails/${videoId}-thumb-${i}.jpg`,
          'image/jpeg'
        );
        thumbnailUrls.push(thumbnailUrl);
      }

      // Step 5: Create video metadata
      const videoMetadata: VideoMetadata = {
        id: videoId,
        userId,
        fileName: videoFileName,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: processed.metadata.compressedSize,
        duration: processed.metadata.duration || 0,
        urls: {
          original: originalVideoUrl,
          compressed: compressedVideoUrl,
          thumbnails: thumbnailUrls,
        },
        dimensions: {
          width: processed.metadata.dimensions?.width || 0,
          height: processed.metadata.dimensions?.height || 0,
        },
        codec: processed.metadata.codec,
        bitrate: processed.metadata.bitrate,
        frameRate: processed.metadata.frameRate,
        moderationStatus: ModerationStatus.PENDING,
        uploadedAt: new Date(),
        updatedAt: new Date(),
      };

      // Step 6: Save to database
      const savedVideo = await videoRepository.create(videoMetadata);

      // Step 7: Start content moderation (async - don't wait)
      this.moderateVideoAsync(savedVideo);

      logger.info(`Video uploaded successfully: ${videoId}`);
      return savedVideo;
    } catch (error) {
      logger.error('Video upload failed', error);
      throw error;
    }
  }

  /**
   * Moderate video asynchronously
   */
  private async moderateVideoAsync(video: VideoMetadata): Promise<void> {
    try {
      logger.info(`Starting content moderation for video ${video.id}`);

      // Moderate using the first thumbnail
      const thumbnailUrl = video.urls.thumbnails[0];

      const { status, result } = await contentModerationService.moderateImage(
        thumbnailUrl,
        video.id,
        video.userId
      );

      // Update video metadata with moderation results
      await videoRepository.update(video.id, {
        moderationStatus: status,
        moderationResult: result,
      });

      logger.info(`Content moderation complete for video ${video.id}: ${status}`);

      // If rejected, delete the files from storage
      if (status === ModerationStatus.REJECTED) {
        await this.deleteVideo(video.id, video.urls);
        logger.info(`Rejected video deleted: ${video.id}`);
      }
    } catch (error) {
      logger.error('Video moderation failed', error);
    }
  }

  /**
   * Delete a video
   */
  async deleteVideo(
    videoId: string,
    urls: {
      original: string;
      compressed: string;
      thumbnails: string[];
    }
  ): Promise<boolean> {
    try {
      logger.info(`Deleting video: ${videoId}`);

      // Delete compressed video
      await azureStorageService.deleteBlob(urls.compressed);

      // Delete original video
      await azureStorageService.deleteBlob(urls.original);

      // Delete all thumbnails
      for (const thumbnailUrl of urls.thumbnails) {
        await azureStorageService.deleteBlob(thumbnailUrl);
      }

      // Delete from database
      await videoRepository.delete(videoId);

      logger.info(`Video deleted successfully: ${videoId}`);
      return true;
    } catch (error) {
      logger.error('Video deletion failed', error);
      throw error;
    }
  }

  /**
   * Get user's videos
   */
  async getUserVideos(userId: string): Promise<VideoMetadata[]> {
    try {
      logger.info(`Retrieving videos for user: ${userId}`);
      return await videoRepository.findByUserId(userId);
    } catch (error) {
      logger.error('Failed to retrieve user videos', error);
      throw error;
    }
  }

  /**
   * Get a specific video
   */
  async getVideo(videoId: string): Promise<VideoMetadata | null> {
    try {
      logger.info(`Retrieving video: ${videoId}`);
      return await videoRepository.findById(videoId);
    } catch (error) {
      logger.error('Failed to retrieve video', error);
      throw error;
    }
  }

  /**
   * Get user's profile video
   */
  async getUserProfileVideo(userId: string): Promise<VideoMetadata | null> {
    try {
      logger.info(`Retrieving profile video for user: ${userId}`);
      const videos = await videoRepository.findByUserId(userId);
      return videos.find((v) => v.moderationStatus === ModerationStatus.APPROVED) || null;
    } catch (error) {
      logger.error('Failed to retrieve profile video', error);
      throw error;
    }
  }

  /**
   * Update video metadata
   */
  async updateVideo(videoId: string, updates: Partial<VideoMetadata>): Promise<boolean> {
    try {
      logger.info(`Updating video ${videoId}`);
      await videoRepository.update(videoId, updates);
      return true;
    } catch (error) {
      logger.error('Failed to update video', error);
      throw error;
    }
  }
}

export default new VideoUploadService();
