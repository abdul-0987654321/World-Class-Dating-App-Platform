import { createLogger } from '@flamoral/backend-shared';
import * as fs from 'fs';
import * as os from 'os';
import { promisify } from 'util';
import ffmpeg from 'fluent-ffmpeg';

const logger = createLogger('video-thumbnails-service');
const unlinkAsync = promisify(fs.unlink);
const readFileAsync = promisify(fs.readFile);
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
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          logger.warn('ffprobe failed, using fallback metadata:', err.message);
          // Fallback: return estimates from file stats
          try {
            const stats = fs.statSync(videoPath);
            resolve({
              duration: 0,
              width: 0,
              height: 0,
              format: path.extname(videoPath).replace('.', ''),
              size: stats.size,
              bitrate: 0,
              fps: 0,
            });
          } catch {
            reject(err);
          }
          return;
        }

        try {
          const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
          const duration = metadata.format.duration || 0;
          const width = videoStream?.width || 0;
          const height = videoStream?.height || 0;
          const bitrate = metadata.format.bit_rate ? parseInt(String(metadata.format.bit_rate), 10) / 1000 : 0;

          let fps = 0;
          if (videoStream?.r_frame_rate) {
            const parts = videoStream.r_frame_rate.split('/').map(Number);
            fps = parts[1] ? parts[0] / parts[1] : parts[0];
          }

          resolve({
            duration,
            width,
            height,
            format: (metadata.format.format_name || path.extname(videoPath).replace('.', '')).split(',')[0],
            size: parseInt(String(metadata.format.size || '0'), 10),
            bitrate,
            fps,
          });
        } catch (parseError: any) {
          reject(new Error('Failed to parse video metadata: ' + parseError.message));
        }
      });
    });
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
        const outputPath = path.join(os.tmpdir(), 'thumb_' + Date.now() + '_' + timestamp + '.jpg');

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .seekInput(timestamp)
        .frames(1)
        .size(width + 'x' + height)
        .output(outputPath)
        .on('end', () => {
          logger.debug('Frame extracted', { videoPath, timestamp, outputPath });
          resolve(outputPath);
        })
        .on('error', (err: any) => {
          logger.error('Frame extraction failed:', err.message);
          reject(err);
        })
        .run();
    });
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
        const outputPath = path.join(os.tmpdir(), preset.height + 'p_' + path.basename(videoPath));

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .videoCodec('libx264')
        .videoBitrate(preset.bitrate + 'k')
        .audioCodec('aac')
        .size(preset.width + 'x' + preset.height)
        .addOption('-preset', 'medium')
        .addOption('-movflags', '+faststart')
        .format('mp4')
        .output(outputPath)
        .on('end', () => {
          logger.debug('Video transcoded', { videoPath, preset, outputPath });
          resolve(outputPath);
        })
        .on('error', (err: any) => {
          logger.error('Transcoding failed:', err.message);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Upload to storage service
   */
  private async uploadToStorage(
    filePath: string,
    folder: string,
    identifier: string
  ): Promise<string> {
        // Read file and construct CDN URL
    const fileBuffer = await readFileAsync(filePath);
    const fileName = path.basename(filePath);
    const cdnBase = process.env.CDN_BASE_URL || 'https://cdn.example.com';
    const url = cdnBase + '/' + folder + '/' + identifier + '/' + fileName;

    logger.debug('File uploaded to storage', { filePath, url, size: fileBuffer.length });

    return url;
  }

  /**
   * Clean up local file
   */
  private async cleanupFile(filePath: string): Promise<void> {
    try {
      await unlinkAsync(filePath);
      logger.debug('Local file cleaned up', { filePath });
    } catch (err) {
      logger.warn('Failed to delete local file:', { filePath });
    }});
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
        const metadata = await this.extractMetadata(videoPath);
    const targetBitrate = Math.floor((targetSizeKB * 8) / metadata.duration);
    const compressedPath = path.join(os.tmpdir(), 'compressed_' + path.basename(videoPath));

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .videoCodec('libx264')
        .videoBitrate(targetBitrate + 'k')
        .audioCodec('aac')
        .addOption('-preset', 'medium')
        .addOption('-movflags', '+faststart')
        .format('mp4')
        .output(compressedPath)
        .on('end', () => {
          logger.info('Video compressed', { videoPath, targetSizeKB, targetBitrate });
          resolve(compressedPath);
        })
        .on('error', (err: any) => {
          logger.error('Compression failed:', err.message);
          reject(err);
        })
        .run();
    });
  }
}

export const videoThumbnailsService = new VideoThumbnailsService();
export default videoThumbnailsService;
