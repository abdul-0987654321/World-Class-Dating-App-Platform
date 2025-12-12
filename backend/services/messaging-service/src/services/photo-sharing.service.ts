import { createLogger } from '../utils/logger';
import axios from 'axios';
import { PhotoMetadata } from '../types/enhanced-types';

const logger = createLogger('photo-sharing-service');

export class PhotoSharingService {
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  private readonly THUMBNAIL_WIDTH = 300;
  private readonly THUMBNAIL_HEIGHT = 300;

  /**
   * Validate photo file
   */
  validatePhoto(file: {
    size: number;
    mimeType: string;
  }): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `Image is too large. Maximum size is ${this.MAX_FILE_SIZE / (1024 * 1024)}MB.`,
      };
    }

    // Check mime type
    if (!this.SUPPORTED_FORMATS.includes(file.mimeType)) {
      return {
        valid: false,
        error: `Unsupported image format. Supported formats: JPEG, PNG, GIF, WebP`,
      };
    }

    return { valid: true };
  }

  /**
   * Get image dimensions
   */
  async getImageDimensions(imageBuffer: Buffer): Promise<{ width: number; height: number }> {
    try {
      // In production, use a library like 'sharp' or 'image-size'
      // For now, return mock dimensions
      return {
        width: 1920,
        height: 1080,
      };
    } catch (error: any) {
      logger.error('Failed to get image dimensions:', error);
      throw new Error('Failed to get image dimensions');
    }
  }

  /**
   * Generate thumbnail
   */
  async generateThumbnail(
    imageBuffer: Buffer,
    mimeType: string
  ): Promise<{ buffer: Buffer; width: number; height: number }> {
    try {
      // In production, use 'sharp' library for image processing
      // For now, return the original buffer (no thumbnail generation)
      return {
        buffer: imageBuffer,
        width: this.THUMBNAIL_WIDTH,
        height: this.THUMBNAIL_HEIGHT,
      };
    } catch (error: any) {
      logger.error('Failed to generate thumbnail:', error);
      throw new Error('Failed to generate thumbnail');
    }
  }

  /**
   * Process photo for messaging
   */
  async processPhoto(
    file: Buffer,
    mimeType: string,
    uploadUrl: string,
    thumbnailUploadUrl: string
  ): Promise<PhotoMetadata> {
    try {
      // Validate file
      const validation = this.validatePhoto({
        size: file.length,
        mimeType,
      });

      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Get dimensions
      const dimensions = await this.getImageDimensions(file);

      // Generate thumbnail
      const thumbnail = await this.generateThumbnail(file, mimeType);

      const metadata: PhotoMetadata = {
        url: uploadUrl,
        thumbnailUrl: thumbnailUploadUrl,
        width: dimensions.width,
        height: dimensions.height,
        fileSize: file.length,
        mimeType,
      };

      logger.info('Photo processed', {
        width: dimensions.width,
        height: dimensions.height,
        fileSize: file.length,
        mimeType,
      });

      return metadata;
    } catch (error: any) {
      logger.error('Failed to process photo:', error);
      throw error;
    }
  }

  /**
   * Compress image for storage optimization
   */
  async compressImage(
    imageBuffer: Buffer,
    mimeType: string,
    quality: number = 85
  ): Promise<Buffer> {
    try {
      // In production, use 'sharp' for compression
      // For now, return the original buffer
      logger.debug('Image compression not yet implemented');
      return imageBuffer;
    } catch (error: any) {
      logger.error('Failed to compress image:', error);
      throw error;
    }
  }

  /**
   * Optimize image for web delivery
   */
  async optimizeForWeb(
    imageBuffer: Buffer,
    mimeType: string,
    maxWidth: number = 1920,
    maxHeight: number = 1080
  ): Promise<Buffer> {
    try {
      // In production:
      // 1. Resize to max dimensions if larger
      // 2. Compress with quality setting
      // 3. Convert to WebP if browser supports it
      // For now, return the original buffer
      logger.debug('Image optimization not yet implemented');
      return imageBuffer;
    } catch (error: any) {
      logger.error('Failed to optimize image:', error);
      throw error;
    }
  }

  /**
   * Extract EXIF data and remove sensitive information
   */
  async sanitizeExifData(imageBuffer: Buffer): Promise<Buffer> {
    try {
      // In production, use 'exif-parser' or 'sharp' to:
      // 1. Remove GPS coordinates
      // 2. Remove device information
      // 3. Keep only basic metadata like orientation
      logger.debug('EXIF sanitization not yet implemented');
      return imageBuffer;
    } catch (error: any) {
      logger.error('Failed to sanitize EXIF data:', error);
      throw error;
    }
  }

  /**
   * Check if image contains inappropriate content
   */
  async moderateImage(imageUrl: string): Promise<{
    approved: boolean;
    reason?: string;
    confidence?: number;
  }> {
    try {
      // In production, integrate with Azure Content Moderator or similar service
      // For now, auto-approve all images
      return { approved: true };
    } catch (error: any) {
      logger.error('Image moderation failed:', error);
      // On error, allow the image but log for manual review
      return { approved: true };
    }
  }

  /**
   * Get supported image formats
   */
  getSupportedFormats(): string[] {
    return this.SUPPORTED_FORMATS;
  }

  /**
   * Get maximum allowed file size
   */
  getMaxFileSize(): number {
    return this.MAX_FILE_SIZE;
  }

  /**
   * Get thumbnail dimensions
   */
  getThumbnailDimensions(): { width: number; height: number } {
    return {
      width: this.THUMBNAIL_WIDTH,
      height: this.THUMBNAIL_HEIGHT,
    };
  }
}

export const photoSharingService = new PhotoSharingService();
export default photoSharingService;
