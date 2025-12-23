import { createLogger } from '@flamoral/backend-shared';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import { promisify } from 'util';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import config from '../../config';
import {
  VideoValidationResult,
  VideoCompressionOptions,
  ThumbnailGenerationOptions,
  UploadedFile,
} from '../../types';

const logger = createLogger('video-processing-service');
const execAsync = promisify(exec);
const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const unlinkAsync = promisify(fs.unlink);

export class VideoProcessingService {
  /**
   * Validate video file (format, size, duration)
   * This is a basic validation without ffmpeg
   */
  validateVideo(
    file: UploadedFile,
    metadata?: { duration?: number; width?: number; height?: number }
  ): VideoValidationResult {
    try {
      logger.info(`Validating video: ${file.originalname}`);

      // Step 1: Validate MIME type
      if (!config.upload.allowedVideoMimeTypes.includes(file.mimetype)) {
        return {
          valid: false,
          error: `Invalid video format. Allowed formats: ${config.upload.allowedVideoMimeTypes.join(', ')}`,
        };
      }

      // Step 2: Validate file size
      if (file.size > config.upload.maxVideoFileSize) {
        const maxSizeMB = config.upload.maxVideoFileSize / 1024 / 1024;
        return {
          valid: false,
          error: `Video file size exceeds limit of ${maxSizeMB}MB`,
        };
      }

      // Step 3: Validate file extension
      const fileExtension = file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0];
      if (!fileExtension || !config.upload.allowedVideoExtensions.includes(fileExtension)) {
        return {
          valid: false,
          error: `Invalid file extension. Allowed extensions: ${config.upload.allowedVideoExtensions.join(', ')}`,
        };
      }

      // Step 4: Validate duration (if metadata provided)
      if (metadata?.duration) {
        if (metadata.duration < config.videoProcessing.minDuration) {
          return {
            valid: false,
            error: `Video duration must be at least ${config.videoProcessing.minDuration} seconds`,
          };
        }

        if (metadata.duration > config.videoProcessing.maxDuration) {
          return {
            valid: false,
            error: `Video duration must not exceed ${config.videoProcessing.maxDuration} seconds`,
          };
        }
      }

      // Step 5: Validate dimensions (if metadata provided)
      if (metadata?.width && metadata?.height) {
        const minDimension = 320; // Minimum width or height
        const maxDimension = 4096; // Maximum width or height (4K)

        if (metadata.width < minDimension || metadata.height < minDimension) {
          return {
            valid: false,
            error: `Video dimensions too small. Minimum: ${minDimension}x${minDimension}`,
          };
        }

        if (metadata.width > maxDimension || metadata.height > maxDimension) {
          return {
            valid: false,
            error: `Video dimensions too large. Maximum: ${maxDimension}x${maxDimension}`,
          };
        }

        // Check aspect ratio (prevent extremely narrow or wide videos)
        const aspectRatio = metadata.width / metadata.height;
        if (aspectRatio < 0.5 || aspectRatio > 2.5) {
          return {
            valid: false,
            error: 'Invalid video aspect ratio. Must be between 1:2 and 2.5:1',
          };
        }
      }

      logger.info('Video validation passed');
      return {
        valid: true,
        duration: metadata?.duration,
        dimensions: metadata?.width && metadata?.height
          ? { width: metadata.width, height: metadata.height }
          : undefined,
      };
    } catch (error: any) {
      logger.error('Video validation failed:', error);
      return {
        valid: false,
        error: `Video validation error: ${error.message}`,
      };
    }
  }

  /**
   * Get video metadata using ffprobe
   * Extracts complete video information including duration, dimensions, codec, bitrate, etc.
   */
  async getVideoMetadata(buffer: Buffer, mimetype: string): Promise<{
    size: number;
    mimetype: string;
    duration: number;
    width: number;
    height: number;
    codec?: string;
    bitrate?: number;
    frameRate?: number;
  }> {
    let tempFilePath: string | null = null;

    try {
      logger.info('Extracting video metadata using ffprobe');

      // Write buffer to temporary file for ffprobe processing
      tempFilePath = path.join(os.tmpdir(), `video-${uuidv4()}.tmp`);
      await writeFileAsync(tempFilePath, buffer);

      // Use ffprobe to get metadata
      const metadata = await this.getFFProbeMetadata(tempFilePath);

      const result = {
        size: buffer.length,
        mimetype,
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height,
        codec: metadata.codec,
        bitrate: metadata.bitrate,
        frameRate: metadata.frameRate,
      };

      logger.info(`Video metadata extracted: ${JSON.stringify(result)}`);
      return result;
    } catch (error: any) {
      logger.error('Failed to extract video metadata:', error);
      throw new Error(`Failed to extract video metadata: ${error.message}`);
    } finally {
      // Clean up temporary file
      if (tempFilePath) {
        try {
          await unlinkAsync(tempFilePath);
        } catch (err) {
          logger.warn(`Failed to delete temporary file: ${tempFilePath}`);
        }
      }
    }
  }

  /**
   * Get metadata using ffprobe
   */
  private getFFProbeMetadata(filePath: string): Promise<{
    duration: number;
    width: number;
    height: number;
    codec?: string;
    bitrate?: number;
    frameRate?: number;
  }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          return reject(err);
        }

        try {
          const videoStream = metadata.streams.find(s => s.codec_type === 'video');

          if (!videoStream) {
            return reject(new Error('No video stream found'));
          }

          const duration = metadata.format.duration || 0;
          const width = videoStream.width || 0;
          const height = videoStream.height || 0;
          const codec = videoStream.codec_name;
          const bitrate = metadata.format.bit_rate ? (typeof metadata.format.bit_rate === 'string' ? parseInt(metadata.format.bit_rate, 10) : metadata.format.bit_rate) : undefined;

          // Calculate frame rate
          let frameRate: number | undefined;
          if (videoStream.r_frame_rate) {
            const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
            frameRate = den ? num / den : num;
          }

          resolve({
            duration,
            width,
            height,
            codec,
            bitrate,
            frameRate,
          });
        } catch (parseError: any) {
          reject(new Error(`Failed to parse metadata: ${parseError.message}`));
        }
      });
    });
  }

  /**
   * Generate thumbnail from video buffer using ffmpeg
   * Extracts a frame at the specified timestamp and converts it to a JPEG thumbnail
   */
  async generateThumbnail(
    videoBuffer: Buffer,
    options: ThumbnailGenerationOptions,
    frameTimestamp: number = 0
  ): Promise<Buffer> {
    let tempInputPath: string | null = null;
    let tempOutputPath: string | null = null;

    try {
      logger.info(`Generating thumbnail at ${frameTimestamp}s with dimensions ${options.width}x${options.height}`);

      // Create temporary files for input video and output thumbnail
      const tempId = uuidv4();
      tempInputPath = path.join(os.tmpdir(), `video-input-${tempId}.mp4`);
      tempOutputPath = path.join(os.tmpdir(), `thumbnail-${tempId}.jpg`);

      // Write video buffer to temporary file
      await writeFileAsync(tempInputPath, videoBuffer);

      // Extract thumbnail using ffmpeg
      await this.extractFrameAtTimestamp(tempInputPath, tempOutputPath, frameTimestamp, options);

      // Read the generated thumbnail
      const thumbnailBuffer = await readFileAsync(tempOutputPath);

      // Optimize thumbnail with sharp to ensure exact dimensions and quality
      const optimizedThumbnail = await sharp(thumbnailBuffer)
        .resize(options.width, options.height, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      logger.info('Thumbnail generated successfully');
      return optimizedThumbnail;
    } catch (error: any) {
      logger.error('Failed to generate thumbnail:', error);
      throw new Error(`Thumbnail generation failed: ${error.message}`);
    } finally {
      // Clean up temporary files
      if (tempInputPath) {
        try {
          await unlinkAsync(tempInputPath);
        } catch (err) {
          logger.warn(`Failed to delete temporary input file: ${tempInputPath}`);
        }
      }
      if (tempOutputPath) {
        try {
          await unlinkAsync(tempOutputPath);
        } catch (err) {
          logger.warn(`Failed to delete temporary output file: ${tempOutputPath}`);
        }
      }
    }
  }

  /**
   * Extract a single frame from video at specified timestamp
   */
  private extractFrameAtTimestamp(
    inputPath: string,
    outputPath: string,
    timestamp: number,
    options: ThumbnailGenerationOptions
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .seekInput(timestamp)
        .frames(1)
        .size(`${options.width}x${options.height}`)
        .output(outputPath)
        .on('end', () => {
          logger.debug(`Frame extracted successfully at ${timestamp}s`);
          resolve();
        })
        .on('error', (err) => {
          logger.error(`Failed to extract frame: ${err.message}`);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Generate multiple thumbnails from video
   */
  async generateThumbnails(
    videoBuffer: Buffer,
    options: ThumbnailGenerationOptions,
    duration?: number
  ): Promise<Buffer[]> {
    try {
      logger.info(`Generating ${options.count} thumbnails`);

      const thumbnails: Buffer[] = [];
      const timestamps = options.timestamps || this.calculateThumbnailTimestamps(options.count, duration);

      for (const timestamp of timestamps.slice(0, options.count)) {
        const thumbnail = await this.generateThumbnail(videoBuffer, options, timestamp);
        thumbnails.push(thumbnail);
      }

      logger.info(`Generated ${thumbnails.length} thumbnails`);
      return thumbnails;
    } catch (error) {
      logger.error('Failed to generate thumbnails:', error);
      throw error;
    }
  }

  /**
   * Calculate evenly distributed timestamps for thumbnail generation
   */
  private calculateThumbnailTimestamps(count: number, duration?: number): number[] {
    if (!duration) {
      // If duration is unknown, return evenly spaced positions at 25%, 50%, 75%
      const positions = [0.25, 0.5, 0.75];
      return positions.slice(0, count).map(p => p * 30); // Assume 30s default
    }

    const timestamps: number[] = [];
    const interval = duration / (count + 1);

    for (let i = 1; i <= count; i++) {
      timestamps.push(interval * i);
    }

    return timestamps;
  }

  /**
   * Get video compression settings
   * Returns the configuration for video compression
   */
  getCompressionSettings(customOptions?: VideoCompressionOptions): VideoCompressionOptions {
    const defaultSettings = {
      format: config.videoProcessing.outputFormat,
      videoCodec: config.videoProcessing.videoCodec,
      audioCodec: config.videoProcessing.audioCodec,
      videoBitrate: config.videoProcessing.videoBitrate,
      audioBitrate: config.videoProcessing.audioBitrate,
      resolution: config.videoProcessing.resolution,
      frameRate: config.videoProcessing.frameRate,
      preset: config.videoProcessing.compressionPreset,
    };

    // Merge custom options with defaults
    return {
      ...defaultSettings,
      ...customOptions,
    };
  }

  /**
   * Compress video using ffmpeg
   * Reduces file size while maintaining acceptable quality
   */
  async compressVideo(
    videoBuffer: Buffer,
    options?: VideoCompressionOptions
  ): Promise<{ compressed: Buffer; compressionRatio: number }> {
    let tempInputPath: string | null = null;
    let tempOutputPath: string | null = null;

    try {
      const settings = this.getCompressionSettings(options);
      logger.info('Compressing video with settings:', settings);

      // Create temporary files
      const tempId = uuidv4();
      tempInputPath = path.join(os.tmpdir(), `video-compress-input-${tempId}.mp4`);
      tempOutputPath = path.join(os.tmpdir(), `video-compress-output-${tempId}.mp4`);

      // Write input buffer to temporary file
      await writeFileAsync(tempInputPath, videoBuffer);

      // Compress video using ffmpeg
      await this.compressVideoFile(tempInputPath, tempOutputPath, settings);

      // Read compressed video
      const compressedBuffer = await readFileAsync(tempOutputPath);

      const originalSize = videoBuffer.length;
      const compressedSize = compressedBuffer.length;
      const compressionRatio = (originalSize - compressedSize) / originalSize;

      logger.info(
        `Video compression complete. Original: ${(originalSize / 1024 / 1024).toFixed(2)}MB, ` +
        `Compressed: ${(compressedSize / 1024 / 1024).toFixed(2)}MB, ` +
        `Ratio: ${(compressionRatio * 100).toFixed(2)}%`
      );

      return {
        compressed: compressedBuffer,
        compressionRatio,
      };
    } catch (error: any) {
      logger.error('Video compression failed:', error);
      throw new Error(`Video compression failed: ${error.message}`);
    } finally {
      // Clean up temporary files
      if (tempInputPath) {
        try {
          await unlinkAsync(tempInputPath);
        } catch (err) {
          logger.warn(`Failed to delete temporary input file: ${tempInputPath}`);
        }
      }
      if (tempOutputPath) {
        try {
          await unlinkAsync(tempOutputPath);
        } catch (err) {
          logger.warn(`Failed to delete temporary output file: ${tempOutputPath}`);
        }
      }
    }
  }

  /**
   * Compress video file using ffmpeg with specified settings
   */
  private compressVideoFile(
    inputPath: string,
    outputPath: string,
    settings: VideoCompressionOptions
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath);

      // Video codec settings
      if (settings.videoCodec) {
        command = command.videoCodec(settings.videoCodec);
      }

      // Video bitrate
      if (settings.videoBitrate) {
        command = command.videoBitrate(settings.videoBitrate);
      }

      // Audio codec settings
      if (settings.audioCodec) {
        command = command.audioCodec(settings.audioCodec);
      }

      // Audio bitrate
      if (settings.audioBitrate) {
        command = command.audioBitrate(settings.audioBitrate);
      }

      // Frame rate
      if (settings.frameRate) {
        command = command.fps(settings.frameRate);
      }

      // Resolution scaling
      if (settings.resolution) {
        command = command.size(`${settings.resolution.width}x${settings.resolution.height}`);
      }

      // Compression preset (affects encoding speed vs compression efficiency)
      if (settings.preset) {
        command = command.addOption('-preset', settings.preset);
      }

      // Additional optimization options
      command = command
        .addOption('-movflags', '+faststart') // Enable streaming
        .addOption('-pix_fmt', 'yuv420p') // Ensure compatibility
        .format(settings.format || 'mp4')
        .output(outputPath)
        .on('start', (commandLine) => {
          logger.debug(`FFmpeg command: ${commandLine}`);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            logger.debug(`Compression progress: ${progress.percent.toFixed(2)}%`);
          }
        })
        .on('end', () => {
          logger.debug('Video compression completed');
          resolve();
        })
        .on('error', (err, stdout, stderr) => {
          logger.error(`FFmpeg error: ${err.message}`);
          logger.error(`FFmpeg stderr: ${stderr}`);
          reject(err);
        });

      command.run();
    });
  }

  /**
   * Process video - validate, compress, and generate thumbnails
   */
  async processVideo(
    file: UploadedFile,
    metadata?: { duration?: number; width?: number; height?: number }
  ): Promise<{
    valid: boolean;
    error?: string;
    compressed?: Buffer;
    thumbnails?: Buffer[];
    metadata?: {
      duration?: number;
      dimensions?: { width: number; height: number };
      originalSize: number;
      compressedSize: number;
      compressionRatio: number;
      codec?: string;
      bitrate?: number;
      frameRate?: number;
    };
  }> {
    try {
      logger.info(`Processing video: ${file.originalname}`);

      // Step 1: Extract metadata using ffprobe
      let videoMetadata;
      try {
        videoMetadata = await this.getVideoMetadata(file.buffer, file.mimetype);
        logger.info(`Video metadata extracted: ${videoMetadata.duration}s, ${videoMetadata.width}x${videoMetadata.height}`);
      } catch (metadataError: any) {
        logger.error('Failed to extract metadata, falling back to basic validation:', metadataError);
        // If metadata extraction fails, try basic validation
        const validation = this.validateVideo(file, metadata);
        if (!validation.valid) {
          return {
            valid: false,
            error: validation.error,
          };
        }
        // Use provided metadata or defaults
        videoMetadata = {
          size: file.size,
          mimetype: file.mimetype,
          duration: metadata?.duration || 0,
          width: metadata?.width || 0,
          height: metadata?.height || 0,
        };
      }

      // Step 2: Validate video with extracted metadata
      const validation = this.validateVideo(file, {
        duration: videoMetadata.duration,
        width: videoMetadata.width,
        height: videoMetadata.height,
      });

      if (!validation.valid) {
        return {
          valid: false,
          error: validation.error,
        };
      }

      // Step 3: Compress video
      logger.info('Starting video compression...');
      const { compressed, compressionRatio } = await this.compressVideo(file.buffer);

      // Step 4: Generate thumbnails
      const thumbnailOptions: ThumbnailGenerationOptions = {
        width: config.videoProcessing.thumbnail.width,
        height: config.videoProcessing.thumbnail.height,
        count: config.videoProcessing.thumbnail.count,
      };

      logger.info('Generating video thumbnails...');
      const thumbnails = await this.generateThumbnails(
        file.buffer,
        thumbnailOptions,
        videoMetadata.duration
      );

      logger.info('Video processing completed successfully');

      return {
        valid: true,
        compressed,
        thumbnails,
        metadata: {
          duration: videoMetadata.duration,
          dimensions: { width: videoMetadata.width, height: videoMetadata.height },
          originalSize: file.size,
          compressedSize: compressed.length,
          compressionRatio,
          codec: videoMetadata.codec,
          bitrate: videoMetadata.bitrate,
          frameRate: videoMetadata.frameRate,
        },
      };
    } catch (error: any) {
      logger.error('Video processing failed:', error);
      return {
        valid: false,
        error: `Video processing failed: ${error.message}`,
      };
    }
  }

  /**
   * Calculate estimated duration from file size (rough estimate)
   * This is a fallback when actual metadata is not available
   */
  estimateDurationFromSize(fileSize: number, bitrate: number = 2000000): number {
    // bitrate in bits per second, fileSize in bytes
    const fileSizeBits = fileSize * 8;
    const durationSeconds = fileSizeBits / bitrate;
    return Math.round(durationSeconds);
  }

  /**
   * Validate video codec and format
   */
  validateVideoFormat(mimetype: string): { valid: boolean; error?: string } {
    if (!config.upload.allowedVideoMimeTypes.includes(mimetype)) {
      return {
        valid: false,
        error: `Unsupported video format: ${mimetype}`,
      };
    }

    return { valid: true };
  }

  /**
   * Calculate recommended bitrate based on resolution
   */
  calculateRecommendedBitrate(width: number, height: number): string {
    const pixels = width * height;

    // Bitrate recommendations based on resolution
    if (pixels <= 640 * 480) return '500k'; // SD
    if (pixels <= 1280 * 720) return '1000k'; // 720p
    if (pixels <= 1920 * 1080) return '2500k'; // 1080p
    if (pixels <= 2560 * 1440) return '6000k'; // 1440p
    return '10000k'; // 4K+
  }

  /**
   * Check if ffmpeg is available
   * This checks if ffmpeg is installed and accessible
   */
  async isFFmpegAvailable(): Promise<boolean> {
    try {
      await execAsync('ffmpeg -version');
      logger.info('FFmpeg is available');
      return true;
    } catch (error) {
      logger.warn('FFmpeg is not available. Video processing features will be limited.');
      return false;
    }
  }

  /**
   * Check if ffprobe is available
   */
  async isFFProbeAvailable(): Promise<boolean> {
    try {
      await execAsync('ffprobe -version');
      logger.info('FFprobe is available');
      return true;
    } catch (error) {
      logger.warn('FFprobe is not available. Video metadata extraction will be limited.');
      return false;
    }
  }

  /**
   * Get video processing capabilities
   */
  async getCapabilities(): Promise<{
    ffmpegAvailable: boolean;
    ffprobeAvailable: boolean;
    supportedFormats: string[];
    maxFileSize: number;
    maxDuration: number;
    compressionEnabled: boolean;
  }> {
    const ffmpegAvailable = await this.isFFmpegAvailable();
    const ffprobeAvailable = await this.isFFProbeAvailable();

    return {
      ffmpegAvailable,
      ffprobeAvailable,
      supportedFormats: config.upload.allowedVideoMimeTypes,
      maxFileSize: config.upload.maxVideoFileSize,
      maxDuration: config.videoProcessing.maxDuration,
      compressionEnabled: ffmpegAvailable,
    };
  }

  /**
   * Create optimized video for mobile streaming
   * Uses lower resolution and bitrate for mobile devices
   */
  async createMobileVersion(videoBuffer: Buffer): Promise<Buffer> {
    const mobileOptions: VideoCompressionOptions = {
      format: 'mp4',
      videoCodec: 'libx264',
      audioCodec: 'aac',
      videoBitrate: '500k',
      audioBitrate: '96k',
      resolution: { width: 640, height: 640 },
      frameRate: 24,
      preset: 'fast',
    };

    const result = await this.compressVideo(videoBuffer, mobileOptions);
    return result.compressed;
  }

  /**
   * Extract audio from video
   */
  async extractAudio(videoBuffer: Buffer): Promise<Buffer> {
    let tempInputPath: string | null = null;
    let tempOutputPath: string | null = null;

    try {
      logger.info('Extracting audio from video');

      const tempId = uuidv4();
      tempInputPath = path.join(os.tmpdir(), `video-audio-input-${tempId}.mp4`);
      tempOutputPath = path.join(os.tmpdir(), `audio-output-${tempId}.mp3`);

      await writeFileAsync(tempInputPath, videoBuffer);

      await new Promise<void>((resolve, reject) => {
        ffmpeg(tempInputPath!)
          .noVideo()
          .audioCodec('libmp3lame')
          .audioBitrate('128k')
          .output(tempOutputPath!)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });

      const audioBuffer = await readFileAsync(tempOutputPath);
      logger.info('Audio extracted successfully');
      return audioBuffer;
    } catch (error: any) {
      logger.error('Failed to extract audio:', error);
      throw new Error(`Audio extraction failed: ${error.message}`);
    } finally {
      if (tempInputPath) await unlinkAsync(tempInputPath).catch(() => {});
      if (tempOutputPath) await unlinkAsync(tempOutputPath).catch(() => {});
    }
  }

  /**
   * Generate animated GIF preview from video
   */
  async generateGifPreview(
    videoBuffer: Buffer,
    options: { width?: number; height?: number; duration?: number; fps?: number } = {}
  ): Promise<Buffer> {
    let tempInputPath: string | null = null;
    let tempOutputPath: string | null = null;

    try {
      const width = options.width || 320;
      const height = options.height || 320;
      const duration = options.duration || 3;
      const fps = options.fps || 10;

      logger.info(`Generating GIF preview: ${width}x${height}, ${duration}s at ${fps}fps`);

      const tempId = uuidv4();
      tempInputPath = path.join(os.tmpdir(), `video-gif-input-${tempId}.mp4`);
      tempOutputPath = path.join(os.tmpdir(), `preview-${tempId}.gif`);

      await writeFileAsync(tempInputPath, videoBuffer);

      await new Promise<void>((resolve, reject) => {
        ffmpeg(tempInputPath!)
          .setStartTime(0)
          .setDuration(duration)
          .fps(fps)
          .size(`${width}x${height}`)
          .output(tempOutputPath!)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });

      const gifBuffer = await readFileAsync(tempOutputPath);
      logger.info('GIF preview generated successfully');
      return gifBuffer;
    } catch (error: any) {
      logger.error('Failed to generate GIF preview:', error);
      throw new Error(`GIF preview generation failed: ${error.message}`);
    } finally {
      if (tempInputPath) await unlinkAsync(tempInputPath).catch(() => {});
      if (tempOutputPath) await unlinkAsync(tempOutputPath).catch(() => {});
    }
  }

  /**
   * Validate video integrity (check if file is corrupted)
   */
  async validateVideoIntegrity(videoBuffer: Buffer): Promise<{ valid: boolean; error?: string }> {
    let tempFilePath: string | null = null;

    try {
      logger.info('Validating video integrity');

      tempFilePath = path.join(os.tmpdir(), `video-integrity-${uuidv4()}.tmp`);
      await writeFileAsync(tempFilePath, videoBuffer);

      // Try to extract metadata - if it fails, the file is likely corrupted
      await this.getFFProbeMetadata(tempFilePath);

      logger.info('Video integrity check passed');
      return { valid: true };
    } catch (error: any) {
      logger.error('Video integrity check failed:', error);
      return {
        valid: false,
        error: `Video file appears to be corrupted or invalid: ${error.message}`,
      };
    } finally {
      if (tempFilePath) {
        await unlinkAsync(tempFilePath).catch(() => {});
      }
    }
  }

  /**
   * Get detailed video information for debugging
   */
  async getDetailedVideoInfo(videoBuffer: Buffer): Promise<{
    format: any;
    streams: any[];
    chapters: any[];
  }> {
    let tempFilePath: string | null = null;

    try {
      logger.info('Getting detailed video information');

      tempFilePath = path.join(os.tmpdir(), `video-info-${uuidv4()}.tmp`);
      await writeFileAsync(tempFilePath, videoBuffer);

      return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(tempFilePath!, (err, metadata) => {
          if (err) return reject(err);
          resolve({
            format: metadata.format,
            streams: metadata.streams,
            chapters: metadata.chapters || [],
          });
        });
      });
    } catch (error: any) {
      logger.error('Failed to get video info:', error);
      throw new Error(`Failed to get video information: ${error.message}`);
    } finally {
      if (tempFilePath) {
        await unlinkAsync(tempFilePath).catch(() => {});
      }
    }
  }

  /**
   * Rotate video by specified degrees
   */
  async rotateVideo(videoBuffer: Buffer, degrees: 90 | 180 | 270): Promise<Buffer> {
    let tempInputPath: string | null = null;
    let tempOutputPath: string | null = null;

    try {
      logger.info(`Rotating video by ${degrees} degrees`);

      const tempId = uuidv4();
      tempInputPath = path.join(os.tmpdir(), `video-rotate-input-${tempId}.mp4`);
      tempOutputPath = path.join(os.tmpdir(), `video-rotate-output-${tempId}.mp4`);

      await writeFileAsync(tempInputPath, videoBuffer);

      // Determine transpose value for ffmpeg
      let transpose: string;
      switch (degrees) {
        case 90:
          transpose = '1'; // 90 degrees clockwise
          break;
        case 180:
          transpose = '2,transpose=2'; // 180 degrees
          break;
        case 270:
          transpose = '2'; // 90 degrees counter-clockwise
          break;
        default:
          throw new Error('Invalid rotation angle. Use 90, 180, or 270.');
      }

      await new Promise<void>((resolve, reject) => {
        ffmpeg(tempInputPath!)
          .videoFilters(`transpose=${transpose}`)
          .output(tempOutputPath!)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });

      const rotatedBuffer = await readFileAsync(tempOutputPath);
      logger.info('Video rotated successfully');
      return rotatedBuffer;
    } catch (error: any) {
      logger.error('Failed to rotate video:', error);
      throw new Error(`Video rotation failed: ${error.message}`);
    } finally {
      if (tempInputPath) await unlinkAsync(tempInputPath).catch(() => {});
      if (tempOutputPath) await unlinkAsync(tempOutputPath).catch(() => {});
    }
  }
}

export default new VideoProcessingService();
