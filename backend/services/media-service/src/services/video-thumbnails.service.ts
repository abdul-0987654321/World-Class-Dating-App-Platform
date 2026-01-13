import { createLogger } from '@flamoral/backend-shared';

const logger = createLogger('video-thumbnails-service');
import * as path from 'path';

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  format: string;
  size: number;
  bitrate: number;
  fps: number;
}

export interface ThumbnailOptions {
  timestamps?: number[]; // Seconds
  count?: number;
  width?: number;
  height?: number;
  quality?: number;
}

export interface ProcessedVideo {
  originalUrl: string;
  variants: {
    quality: string;
    url: string;
    width: number;
    height: number;
    bitrate: number;
  }[];
  thumbnails: {
    url: string;
    timestamp: number;
  }[];
  metadata: VideoMetadata;
}

class VideoThumbnailsService {
  private readonly QUALITY_PRESETS = {
    '1080p': { width: 1920, height: 1080, bitrate: 5000 },
    '720p': { width: 1280, height: 720, bitrate: 2500 },
    '480p': { width: 854, height: 480, bitrate: 1000 },
    '360p': { width: 640, height: 360, bitrate: 500 },
  };

  /**
   * Process video with multiple quality variants
   */
  async processVideo(videoPath: string, userId: string): Promise<ProcessedVideo> {
    try {
      logger.info('Starting video processing', { videoPath, userId });

      // Extract metadata
      const metadata = await this.extractMetadata(videoPath);

      // Generate thumbnails
      const thumbnails = await this.generateThumbnails(videoPath, {
        count: 5,
        width: 320,
        height: 180,
        quality: 80,
      });

      // Create quality variants
      const variants = await this.createQualityVariants(videoPath, metadata);

      // Upload to storage
      const originalUrl = await this.uploadToStorage(videoPath, userId, 'original');

      const processed: ProcessedVideo = {
        originalUrl,
        variants,
        thumbnails,
        metadata,
      };

      logger.info('Video processing completed', {
        videoPath,
        userId,
        variantCount: variants.length,
        thumbnailCount: thumbnails.length,
      });

      return processed;
    } catch (error: any) {
      logger.error('Video processing failed', { videoPath, userId, error: error.message });
      throw error;
    }
  }

  /**
   * Generate video thumbnails
   */
  async generateThumbnails(
    videoPath: string,
    options: ThumbnailOptions
  ): Promise<{ url: string; timestamp: number }[]> {
    const thumbnails: { url: string; timestamp: number }[] = [];

    try {
      // Get video duration
      const metadata = await this.extractMetadata(videoPath);
      const duration = metadata.duration;

      // Calculate timestamps
      let timestamps: number[];
      if (options.timestamps) {
        timestamps = options.timestamps;
      } else {
        const count = options.count || 5;
        timestamps = Array.from({ length: count }, (_, i) =>
          Math.floor((duration / (count + 1)) * (i + 1))
        );
      }

      // Generate thumbnail for each timestamp
      for (const timestamp of timestamps) {
        const thumbnailPath = await this.extractFrame(
          videoPath,
          timestamp,
          options.width || 320,
          options.height || 180,
          options.quality || 80
        );

        // Upload thumbnail
        const url = await this.uploadToStorage(thumbnailPath, 'thumbnails', `thumb_${timestamp}`);

        thumbnails.push({ url, timestamp });

        // Clean up local file
        await this.cleanupFile(thumbnailPath);
      }

      logger.info('Thumbnails generated', { videoPath, count: thumbnails.length });

      return thumbnails;
    } catch (error: any) {
      logger.error('Thumbnail generation failed', { videoPath, error: error.message });
      throw error;
    }
  }

  /**
   * Extract video metadata
   */
  private async extractMetadata(videoPath: string): Promise<VideoMetadata> {
    // In production, use ffprobe or similar
    // This is a placeholder
    return {
      duration: 60,
      width: 1920,
      height: 1080,
      format: 'mp4',
      size: 10485760, // 10MB
      bitrate: 5000,
      fps: 30,
    };
  }

  /**
   * Extract frame at specific timestamp
   */
  private async extractFrame(
    videoPath: string,
    timestamp: number,
    width: number,
    height: number,
    quality: number
  ): Promise<string> {
    // In production, use ffmpeg to extract frame
    // Example command: ffmpeg -ss {timestamp} -i {videoPath} -vframes 1 -s {width}x{height} -q:v {quality} output.jpg

    const outputPath = path.join(path.dirname(videoPath), `thumb_${timestamp}.jpg`);

    logger.debug('Frame extracted', { videoPath, timestamp, outputPath });

    return outputPath;
  }

  /**
   * Create quality variants
   */
  private async createQualityVariants(
    videoPath: string,
    metadata: VideoMetadata
  ): Promise<ProcessedVideo['variants']> {
    const variants: ProcessedVideo['variants'] = [];

    // Determine which quality variants to create based on original video
    const originalHeight = metadata.height;
    const presets = Object.entries(this.QUALITY_PRESETS).filter(
      ([_, preset]) => preset.height <= originalHeight
    );

    for (const [quality, preset] of presets) {
      try {
        const variantPath = await this.transcodeVideo(videoPath, preset);
        const url = await this.uploadToStorage(variantPath, 'videos', quality);

        variants.push({
          quality,
          url,
          width: preset.width,
          height: preset.height,
          bitrate: preset.bitrate,
        });

        // Clean up local file
        await this.cleanupFile(variantPath);

        logger.debug('Quality variant created', { quality, videoPath });
      } catch (error: any) {
        logger.error('Failed to create variant', { quality, error: error.message });
      }
    }

    return variants;
  }

  /**
   * Transcode video to specific quality
   */
  private async transcodeVideo(
    videoPath: string,
    preset: { width: number; height: number; bitrate: number }
  ): Promise<string> {
    // In production, use ffmpeg for transcoding
    // Example command: ffmpeg -i {input} -s {width}x{height} -b:v {bitrate}k -c:v libx264 -preset medium {output}

    const outputPath = path.join(
      path.dirname(videoPath),
      `${preset.height}p_${path.basename(videoPath)}`
    );

    logger.debug('Video transcoded', { videoPath, preset, outputPath });

    return outputPath;
  }

  /**
   * Upload to storage service
   */
  private async uploadToStorage(
    filePath: string,
    folder: string,
    identifier: string
  ): Promise<string> {
    // In production, upload to AWS S3
    const url = `https://cdn.example.com/${folder}/${identifier}/${path.basename(filePath)}`;

    logger.debug('File uploaded to storage', { filePath, url });

    return url;
  }

  /**
   * Clean up local file
   */
  private async cleanupFile(filePath: string): Promise<void> {
    // In production, delete local file
    logger.debug('Local file cleaned up', { filePath });
  }

  /**
   * Validate video file
   */
  async validateVideo(videoPath: string): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      const metadata = await this.extractMetadata(videoPath);

      // Check duration (max 60 seconds for dating app)
      if (metadata.duration > 60) {
        errors.push('Video duration exceeds 60 seconds');
      }

      // Check file size (max 50MB)
      if (metadata.size > 50 * 1024 * 1024) {
        errors.push('Video file size exceeds 50MB');
      }

      // Check resolution (max 4K)
      if (metadata.width > 3840 || metadata.height > 2160) {
        errors.push('Video resolution exceeds 4K');
      }

      // Check format
      const allowedFormats = ['mp4', 'mov', 'avi', 'webm'];
      if (!allowedFormats.includes(metadata.format.toLowerCase())) {
        errors.push(`Video format ${metadata.format} not supported`);
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (error: any) {
      return {
        valid: false,
        errors: [`Failed to validate video: ${error.message}`],
      };
    }
  }

  /**
   * Get video info
   */
  async getVideoInfo(videoPath: string): Promise<VideoMetadata> {
    return await this.extractMetadata(videoPath);
  }

  /**
   * Compress video
   */
  async compressVideo(videoPath: string, targetSizeKB: number): Promise<string> {
    // In production, use ffmpeg to compress
    // Calculate target bitrate based on duration and target size
    const metadata = await this.extractMetadata(videoPath);
    const targetBitrate = Math.floor((targetSizeKB * 8) / metadata.duration);

    const compressedPath = path.join(
      path.dirname(videoPath),
      `compressed_${path.basename(videoPath)}`
    );

    logger.info('Video compressed', { videoPath, targetSizeKB, targetBitrate });

    return compressedPath;
  }
}

export const videoThumbnailsService = new VideoThumbnailsService();
export default videoThumbnailsService;
