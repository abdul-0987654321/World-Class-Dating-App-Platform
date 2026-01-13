import axios from 'axios';
import sharp from 'sharp';

import config from '../config';
import { PhotoMetadata } from '../types/enhanced-types';
import { createLogger } from '../utils/logger';

const logger = createLogger('photo-sharing-service');

export class PhotoSharingService {
  private readonly MAX_FILE_SIZE: number;
  private readonly SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  private readonly THUMBNAIL_WIDTH: number;
  private readonly THUMBNAIL_HEIGHT: number;
  private readonly MAX_IMAGE_WIDTH: number;
  private readonly MAX_IMAGE_HEIGHT: number;
  private readonly COMPRESSION_QUALITY: number;

  constructor() {
    const imageConfig = config.mediaProcessing.image;
    this.MAX_FILE_SIZE = imageConfig.maxFileSize;
    this.THUMBNAIL_WIDTH = imageConfig.thumbnailWidth;
    this.THUMBNAIL_HEIGHT = imageConfig.thumbnailHeight;
    this.MAX_IMAGE_WIDTH = imageConfig.maxWidth;
    this.MAX_IMAGE_HEIGHT = imageConfig.maxHeight;
    this.COMPRESSION_QUALITY = imageConfig.compressionQuality;
  }

  /**
   * Validate photo file
   */
  validatePhoto(file: { size: number; mimeType: string }): { valid: boolean; error?: string } {
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
   * Get image dimensions using sharp
   */
  async getImageDimensions(imageBuffer: Buffer): Promise<{ width: number; height: number }> {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
      };
    } catch (error: any) {
      logger.error('Failed to get image dimensions:', error);
      throw new Error('Failed to get image dimensions');
    }
  }

  /**
   * Generate thumbnail using sharp
   */
  async generateThumbnail(
    imageBuffer: Buffer,
    mimeType: string
  ): Promise<{ buffer: Buffer; width: number; height: number }> {
    try {
      const thumbnail = await sharp(imageBuffer)
        .resize(this.THUMBNAIL_WIDTH, this.THUMBNAIL_HEIGHT, {
          fit: 'cover',
          position: 'center',
        })
        .webp({ quality: 80 })
        .toBuffer();

      return {
        buffer: thumbnail,
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
   * Compress image for storage optimization using sharp
   */
  async compressImage(
    imageBuffer: Buffer,
    mimeType: string,
    quality: number = this.COMPRESSION_QUALITY
  ): Promise<Buffer> {
    try {
      let sharpInstance = sharp(imageBuffer);

      // Apply compression based on mime type
      switch (mimeType) {
        case 'image/jpeg':
          sharpInstance = sharpInstance.jpeg({ quality, mozjpeg: true });
          break;
        case 'image/png':
          sharpInstance = sharpInstance.png({ compressionLevel: 9, adaptiveFiltering: true });
          break;
        case 'image/webp':
          sharpInstance = sharpInstance.webp({ quality });
          break;
        case 'image/gif':
          // GIF compression is limited, return as-is
          return imageBuffer;
        default:
          sharpInstance = sharpInstance.jpeg({ quality, mozjpeg: true });
      }

      const compressedBuffer = await sharpInstance.toBuffer();

      logger.debug('Image compressed', {
        originalSize: imageBuffer.length,
        compressedSize: compressedBuffer.length,
        reduction: `${Math.round((1 - compressedBuffer.length / imageBuffer.length) * 100)}%`,
      });

      return compressedBuffer;
    } catch (error: any) {
      logger.error('Failed to compress image:', error);
      throw error;
    }
  }

  /**
   * Optimize image for web delivery using sharp
   * - Resizes to max dimensions if larger
   * - Compresses with quality setting
   * - Converts to WebP format for better compression
   */
  async optimizeForWeb(
    imageBuffer: Buffer,
    mimeType: string,
    maxWidth: number = this.MAX_IMAGE_WIDTH,
    maxHeight: number = this.MAX_IMAGE_HEIGHT,
    convertToWebP: boolean = true
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      const currentWidth = metadata.width || 0;
      const currentHeight = metadata.height || 0;

      let sharpInstance = sharp(imageBuffer);

      // Only resize if image is larger than max dimensions
      if (currentWidth > maxWidth || currentHeight > maxHeight) {
        sharpInstance = sharpInstance.resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        });

        logger.debug('Image resized', {
          originalWidth: currentWidth,
          originalHeight: currentHeight,
          maxWidth,
          maxHeight,
        });
      }

      // Convert to WebP for better compression if requested
      let outputMimeType = mimeType;
      if (convertToWebP && mimeType !== 'image/gif') {
        sharpInstance = sharpInstance.webp({ quality: this.COMPRESSION_QUALITY });
        outputMimeType = 'image/webp';
      } else {
        // Compress in original format
        switch (mimeType) {
          case 'image/jpeg':
            sharpInstance = sharpInstance.jpeg({
              quality: this.COMPRESSION_QUALITY,
              mozjpeg: true,
            });
            break;
          case 'image/png':
            sharpInstance = sharpInstance.png({ compressionLevel: 9, adaptiveFiltering: true });
            break;
          case 'image/gif':
            // Keep GIF as-is
            break;
        }
      }

      const optimizedBuffer = await sharpInstance.toBuffer();

      logger.debug('Image optimized for web', {
        originalSize: imageBuffer.length,
        optimizedSize: optimizedBuffer.length,
        reduction: `${Math.round((1 - optimizedBuffer.length / imageBuffer.length) * 100)}%`,
        outputMimeType,
      });

      return { buffer: optimizedBuffer, mimeType: outputMimeType };
    } catch (error: any) {
      logger.error('Failed to optimize image:', error);
      throw error;
    }
  }

  /**
   * Extract EXIF data and remove sensitive information for privacy
   * Uses sharp to strip all metadata except orientation
   */
  async sanitizeExifData(imageBuffer: Buffer): Promise<Buffer> {
    try {
      // Get original metadata to preserve orientation
      const metadata = await sharp(imageBuffer).metadata();
      const orientation = metadata.orientation;

      // Remove all EXIF data but preserve orientation if present
      let sharpInstance = sharp(imageBuffer).rotate(); // Auto-rotate based on EXIF orientation

      // Determine output format based on original format
      switch (metadata.format) {
        case 'jpeg':
          sharpInstance = sharpInstance.jpeg({ quality: 95 });
          break;
        case 'png':
          sharpInstance = sharpInstance.png();
          break;
        case 'webp':
          sharpInstance = sharpInstance.webp({ quality: 95 });
          break;
        case 'gif':
          // GIF doesn't typically contain sensitive EXIF
          return imageBuffer;
        default:
          sharpInstance = sharpInstance.jpeg({ quality: 95 });
      }

      const sanitizedBuffer = await sharpInstance.toBuffer();

      logger.debug('EXIF data sanitized', {
        originalSize: imageBuffer.length,
        sanitizedSize: sanitizedBuffer.length,
        hadOrientation: !!orientation,
      });

      return sanitizedBuffer;
    } catch (error: any) {
      logger.error('Failed to sanitize EXIF data:', error);
      throw error;
    }
  }

  /**
   * Get image metadata including format, dimensions, and other properties
   */
  async getImageMetadata(imageBuffer: Buffer): Promise<{
    format: string;
    width: number;
    height: number;
    hasAlpha: boolean;
    orientation?: number;
    space?: string;
  }> {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      return {
        format: metadata.format || 'unknown',
        width: metadata.width || 0,
        height: metadata.height || 0,
        hasAlpha: metadata.hasAlpha || false,
        orientation: metadata.orientation,
        space: metadata.space,
      };
    } catch (error: any) {
      logger.error('Failed to get image metadata:', error);
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
      // In production, integrate with AWS Rekognition or similar content moderation service
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
