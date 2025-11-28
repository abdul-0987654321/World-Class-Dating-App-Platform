import sharp from 'sharp';
import config from '../../config';
import { createLogger } from '@flamoral/shared';

const logger = createLogger('image-processing-service');

export class ImageProcessingService {
  /**
   * Validate image file
   */
  validateImage(_buffer: Buffer, mimeType: string, size: number): { valid: boolean; error?: string } {
    // Check mime type
    if (!config.upload.allowedMimeTypes.includes(mimeType)) {
      return {
        valid: false,
        error: `Invalid file type. Allowed types: ${config.upload.allowedMimeTypes.join(', ')}`,
      };
    }

    // Check file size
    if (size > config.upload.maxFileSize) {
      return {
        valid: false,
        error: `File size exceeds limit of ${config.upload.maxFileSize / 1024 / 1024}MB`,
      };
    }

    return { valid: true };
  }

  /**
   * Get image metadata
   */
  async getMetadata(buffer: Buffer): Promise<{ width: number; height: number; format: string }> {
    try {
      const metadata = await sharp(buffer).metadata();

      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
      };
    } catch (error) {
      logger.error('Failed to get image metadata', error);
      throw new Error('Invalid image file');
    }
  }

  /**
   * Resize and optimize image to thumbnail size
   */
  async createThumbnail(buffer: Buffer): Promise<Buffer> {
    try {
      const { width, height } = config.imageProcessing.thumbnail;

      return await sharp(buffer)
        .resize(width, height, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: config.imageProcessing.quality })
        .toBuffer();
    } catch (error) {
      logger.error('Failed to create thumbnail', error);
      throw new Error('Thumbnail creation failed');
    }
  }

  /**
   * Resize and optimize image to standard size
   */
  async createStandard(buffer: Buffer): Promise<Buffer> {
    try {
      const { width, height } = config.imageProcessing.standard;

      return await sharp(buffer)
        .resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: config.imageProcessing.quality })
        .toBuffer();
    } catch (error) {
      logger.error('Failed to create standard image', error);
      throw new Error('Standard image creation failed');
    }
  }

  /**
   * Resize and optimize image to HD size
   */
  async createHD(buffer: Buffer): Promise<Buffer> {
    try {
      const { width, height } = config.imageProcessing.hd;

      return await sharp(buffer)
        .resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: config.imageProcessing.quality })
        .toBuffer();
    } catch (error) {
      logger.error('Failed to create HD image', error);
      throw new Error('HD image creation failed');
    }
  }

  /**
   * Process image - create all versions (thumbnail, standard, HD, and keep original)
   */
  async processImage(
    buffer: Buffer
  ): Promise<{ thumbnail: Buffer; standard: Buffer; hd: Buffer; original: Buffer }> {
    try {
      // Get metadata first to validate
      const metadata = await this.getMetadata(buffer);
      logger.info(`Processing image: ${metadata.width}x${metadata.height} ${metadata.format}`);

      // Create all versions in parallel
      const [thumbnail, standard, hd] = await Promise.all([
        this.createThumbnail(buffer),
        this.createStandard(buffer),
        this.createHD(buffer),
      ]);

      return {
        thumbnail,
        standard,
        hd,
        original: buffer,
      };
    } catch (error) {
      logger.error('Failed to process image', error);
      throw error;
    }
  }

  /**
   * Compress image without resizing
   */
  async compressImage(buffer: Buffer, quality: number = 85): Promise<Buffer> {
    try {
      return await sharp(buffer).jpeg({ quality }).toBuffer();
    } catch (error) {
      logger.error('Failed to compress image', error);
      throw new Error('Image compression failed');
    }
  }

  /**
   * Convert image to JPEG format
   */
  async convertToJpeg(buffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(buffer)
        .jpeg({ quality: config.imageProcessing.quality })
        .toBuffer();
    } catch (error) {
      logger.error('Failed to convert image to JPEG', error);
      throw new Error('Image conversion failed');
    }
  }

  /**
   * Rotate image based on EXIF orientation
   */
  async autoRotate(buffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(buffer).rotate().toBuffer();
    } catch (error) {
      logger.error('Failed to auto-rotate image', error);
      throw new Error('Image rotation failed');
    }
  }

  /**
   * Extract face region from image (for verification)
   */
  async extractFace(
    buffer: Buffer,
    faceRegion: { left: number; top: number; width: number; height: number }
  ): Promise<Buffer> {
    try {
      return await sharp(buffer)
        .extract({
          left: Math.floor(faceRegion.left),
          top: Math.floor(faceRegion.top),
          width: Math.floor(faceRegion.width),
          height: Math.floor(faceRegion.height),
        })
        .toBuffer();
    } catch (error) {
      logger.error('Failed to extract face region', error);
      throw new Error('Face extraction failed');
    }
  }
}

export default new ImageProcessingService();
