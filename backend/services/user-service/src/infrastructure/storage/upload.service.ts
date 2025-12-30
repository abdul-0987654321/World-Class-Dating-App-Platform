import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '@flamoral/backend-shared';
import { s3Storage } from './s3-storage.config';
import { imageProcessor, ProcessedImage } from './image-processor';

const logger = createLogger('upload-service');

export interface UploadResult {
  photoId: string;
  url: string;
  storageKey: string;
  thumbnailUrl?: string;
  mediumUrl?: string;
  width: number;
  height: number;
  size: number;
}

class UploadService {
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
  ];

  /**
   * Validate uploaded file
   */
  validateFile(file: Express.Multer.File): { isValid: boolean; error?: string } {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`,
      };
    }

    // Check MIME type
    if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return {
        isValid: false,
        error: 'Invalid file type. Allowed types: JPEG, PNG, WebP, GIF',
      };
    }

    return { isValid: true };
  }

  /**
   * Upload a photo with processing and multiple sizes
   */
  async uploadPhoto(
    file: Express.Multer.File,
    userId: string
  ): Promise<UploadResult> {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Validate image
      const imageValidation = await imageProcessor.validateImage(file.buffer);
      if (!imageValidation.isValid) {
        throw new Error(imageValidation.error);
      }

      // Generate unique filename
      const photoId = uuidv4();
      const timestamp = Date.now();
      const baseFileName = `${userId}/${photoId}-${timestamp}`;

      // Process image into multiple sizes
      const { thumbnail, medium, large } = await imageProcessor.createMultipleSizes(
        file.buffer
      );

      // Upload all versions to S3
      const [largeUrl, mediumUrl, thumbnailUrl] = await Promise.all([
        this.uploadProcessedImage(`${baseFileName}-large`, large),
        this.uploadProcessedImage(`${baseFileName}-medium`, medium),
        this.uploadProcessedImage(`${baseFileName}-thumb`, thumbnail),
      ]);

      return {
        photoId,
        url: largeUrl,
        storageKey: `${baseFileName}-large`,
        thumbnailUrl,
        mediumUrl,
        width: large.width,
        height: large.height,
        size: large.size,
      };
    } catch (error) {
      logger.error('Error uploading photo:', error);
      throw error instanceof Error ? error : new Error('Failed to upload photo');
    }
  }

  /**
   * Upload a single processed image
   */
  private async uploadProcessedImage(
    fileName: string,
    image: ProcessedImage
  ): Promise<string> {
    const contentType = `image/${image.format}`;
    return await s3Storage.uploadFile(fileName, image.buffer, contentType);
  }

  /**
   * Delete a photo and all its variants
   */
  async deletePhoto(storageKey: string): Promise<void> {
    try {
      // Extract base filename (without size suffix)
      const baseFileName = storageKey.replace(/-large$|-medium$|-thumb$/, '');

      // Delete all variants
      await Promise.all([
        s3Storage.deleteFile(`${baseFileName}-large`),
        s3Storage.deleteFile(`${baseFileName}-medium`),
        s3Storage.deleteFile(`${baseFileName}-thumb`),
      ]);
    } catch (error) {
      logger.error('Error deleting photo:', error);
      throw new Error('Failed to delete photo');
    }
  }

  /**
   * Delete all photos for a user
   */
  async deleteUserPhotos(userId: string): Promise<void> {
    try {
      // In a production environment, you would list all objects with the userId prefix
      // and delete them. For now, we'll rely on the database to track photos
      logger.info(`Deleting all photos for user ${userId}`);
    } catch (error) {
      logger.error('Error deleting user photos:', error);
      throw new Error('Failed to delete user photos');
    }
  }

  /**
   * Initialize S3 Storage
   */
  async initialize(): Promise<void> {
    try {
      logger.info('S3 upload service initialized');
    } catch (error) {
      logger.error('Error initializing upload service:', error);
      // Don't throw - allow service to start even if S3 is not configured
      // This is useful for local development without AWS
    }
  }
}

export const uploadService = new UploadService();
