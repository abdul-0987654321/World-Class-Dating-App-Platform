import sharp from 'sharp';

export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

export interface ProcessedImage {
  buffer: Buffer;
  format: string;
  width: number;
  height: number;
  size: number;
}

class ImageProcessor {
  private readonly DEFAULT_MAX_WIDTH = 1920;
  private readonly DEFAULT_MAX_HEIGHT = 1920;
  private readonly DEFAULT_QUALITY = 85;
  private readonly DEFAULT_FORMAT = 'jpeg';

  /**
   * Process an image: resize, optimize, and convert format
   */
  async processImage(
    imageBuffer: Buffer,
    options: ImageProcessingOptions = {}
  ): Promise<ProcessedImage> {
    try {
      const {
        maxWidth = this.DEFAULT_MAX_WIDTH,
        maxHeight = this.DEFAULT_MAX_HEIGHT,
        quality = this.DEFAULT_QUALITY,
        format = this.DEFAULT_FORMAT,
      } = options;

      // Process image
      let processed = sharp(imageBuffer)
        .rotate() // Auto-rotate based on EXIF orientation
        .resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true, // Don't upscale small images
        });

      // Convert to specified format
      if (format === 'jpeg') {
        processed = processed.jpeg({ quality, progressive: true });
      } else if (format === 'png') {
        processed = processed.png({ quality, progressive: true });
      } else if (format === 'webp') {
        processed = processed.webp({ quality });
      }

      const buffer = await processed.toBuffer();
      const info = await sharp(buffer).metadata();

      return {
        buffer,
        format: info.format || format,
        width: info.width || 0,
        height: info.height || 0,
        size: buffer.length,
      };
    } catch (error) {
      console.error('Error processing image:', error);
      throw new Error('Failed to process image');
    }
  }

  /**
   * Create multiple sized versions of an image (thumbnail, medium, large)
   */
  async createMultipleSizes(imageBuffer: Buffer): Promise<{
    thumbnail: ProcessedImage;
    medium: ProcessedImage;
    large: ProcessedImage;
  }> {
    try {
      const [thumbnail, medium, large] = await Promise.all([
        this.processImage(imageBuffer, {
          maxWidth: 400,
          maxHeight: 400,
          quality: 80,
        }),
        this.processImage(imageBuffer, {
          maxWidth: 800,
          maxHeight: 800,
          quality: 85,
        }),
        this.processImage(imageBuffer, {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 90,
        }),
      ]);

      return { thumbnail, medium, large };
    } catch (error) {
      console.error('Error creating multiple sizes:', error);
      throw new Error('Failed to create multiple image sizes');
    }
  }

  /**
   * Validate image file
   */
  async validateImage(imageBuffer: Buffer): Promise<{
    isValid: boolean;
    error?: string;
    metadata?: sharp.Metadata;
  }> {
    try {
      const metadata = await sharp(imageBuffer).metadata();

      // Check if it's a valid image format
      const validFormats = ['jpeg', 'jpg', 'png', 'webp', 'gif'];
      if (!metadata.format || !validFormats.includes(metadata.format)) {
        return {
          isValid: false,
          error: 'Invalid image format. Allowed formats: JPEG, PNG, WebP, GIF',
        };
      }

      // Check minimum dimensions
      const MIN_WIDTH = 400;
      const MIN_HEIGHT = 400;
      if (
        !metadata.width ||
        !metadata.height ||
        metadata.width < MIN_WIDTH ||
        metadata.height < MIN_HEIGHT
      ) {
        return {
          isValid: false,
          error: `Image must be at least ${MIN_WIDTH}x${MIN_HEIGHT} pixels`,
        };
      }

      // Check maximum dimensions
      const MAX_WIDTH = 10000;
      const MAX_HEIGHT = 10000;
      if (metadata.width > MAX_WIDTH || metadata.height > MAX_HEIGHT) {
        return {
          isValid: false,
          error: `Image dimensions too large. Maximum: ${MAX_WIDTH}x${MAX_HEIGHT} pixels`,
        };
      }

      return {
        isValid: true,
        metadata,
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid or corrupted image file',
      };
    }
  }

  /**
   * Get image metadata without processing
   */
  async getMetadata(imageBuffer: Buffer): Promise<sharp.Metadata> {
    try {
      return await sharp(imageBuffer).metadata();
    } catch (error) {
      console.error('Error getting image metadata:', error);
      throw new Error('Failed to get image metadata');
    }
  }
}

export const imageProcessor = new ImageProcessor();
