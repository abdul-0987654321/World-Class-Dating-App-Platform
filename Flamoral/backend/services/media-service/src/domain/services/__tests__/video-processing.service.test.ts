/// <reference types="jest" />
import videoProcessingService from '../video-processing.service';
import { UploadedFile } from '../../../types';
import * as fs from 'fs';
import * as path from 'path';

// Enable mocks for fluent-ffmpeg and sharp
jest.mock('fluent-ffmpeg');
jest.mock('sharp');

describe('VideoProcessingService', () => {
  describe('FFmpeg Availability', () => {
    it('should check if ffmpeg is available', async () => {
      const isAvailable = await videoProcessingService.isFFmpegAvailable();
      // This test will pass/fail based on whether FFmpeg is installed
      expect(typeof isAvailable).toBe('boolean');
    });

    it('should check if ffprobe is available', async () => {
      const isAvailable = await videoProcessingService.isFFProbeAvailable();
      expect(typeof isAvailable).toBe('boolean');
    });

    it('should get capabilities', async () => {
      const capabilities = await videoProcessingService.getCapabilities();
      expect(capabilities).toHaveProperty('ffmpegAvailable');
      expect(capabilities).toHaveProperty('ffprobeAvailable');
      expect(capabilities).toHaveProperty('supportedFormats');
      expect(capabilities).toHaveProperty('maxFileSize');
      expect(capabilities).toHaveProperty('maxDuration');
      expect(capabilities).toHaveProperty('compressionEnabled');
      expect(Array.isArray(capabilities.supportedFormats)).toBe(true);
    });
  });

  describe('Video Validation', () => {
    it('should validate video MIME type', () => {
      const mockFile: UploadedFile = {
        fieldname: 'video',
        originalname: 'test.mp4',
        encoding: '7bit',
        mimetype: 'video/mp4',
        buffer: Buffer.from(''),
        size: 1024 * 1024, // 1MB
      };

      const result = videoProcessingService.validateVideo(mockFile);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid MIME type', () => {
      const mockFile: UploadedFile = {
        fieldname: 'video',
        originalname: 'test.exe',
        encoding: '7bit',
        mimetype: 'application/x-msdownload',
        buffer: Buffer.from(''),
        size: 1024,
      };

      const result = videoProcessingService.validateVideo(mockFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid video format');
    });

    it('should reject oversized videos', () => {
      const mockFile: UploadedFile = {
        fieldname: 'video',
        originalname: 'test.mp4',
        encoding: '7bit',
        mimetype: 'video/mp4',
        buffer: Buffer.from(''),
        size: 200 * 1024 * 1024, // 200MB (exceeds default 100MB limit)
      };

      const result = videoProcessingService.validateVideo(mockFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds limit');
    });

    it('should validate video duration', () => {
      const mockFile: UploadedFile = {
        fieldname: 'video',
        originalname: 'test.mp4',
        encoding: '7bit',
        mimetype: 'video/mp4',
        buffer: Buffer.from(''),
        size: 1024 * 1024,
      };

      // Test too short
      let result = videoProcessingService.validateVideo(mockFile, { duration: 1 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be at least');

      // Test too long
      result = videoProcessingService.validateVideo(mockFile, { duration: 120 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must not exceed');

      // Test valid duration
      result = videoProcessingService.validateVideo(mockFile, { duration: 30 });
      expect(result.valid).toBe(true);
    });

    it('should validate video dimensions', () => {
      const mockFile: UploadedFile = {
        fieldname: 'video',
        originalname: 'test.mp4',
        encoding: '7bit',
        mimetype: 'video/mp4',
        buffer: Buffer.from(''),
        size: 1024 * 1024,
      };

      // Test too small
      let result = videoProcessingService.validateVideo(mockFile, {
        width: 100,
        height: 100,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too small');

      // Test too large
      result = videoProcessingService.validateVideo(mockFile, {
        width: 5000,
        height: 5000,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too large');

      // Test valid dimensions
      result = videoProcessingService.validateVideo(mockFile, {
        width: 1920,
        height: 1080,
      });
      expect(result.valid).toBe(true);
    });

    it('should validate aspect ratio', () => {
      const mockFile: UploadedFile = {
        fieldname: 'video',
        originalname: 'test.mp4',
        encoding: '7bit',
        mimetype: 'video/mp4',
        buffer: Buffer.from(''),
        size: 1024 * 1024,
      };

      // Test invalid aspect ratio (too narrow)
      let result = videoProcessingService.validateVideo(mockFile, {
        width: 1000,
        height: 2500,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('aspect ratio');

      // Test invalid aspect ratio (too wide)
      result = videoProcessingService.validateVideo(mockFile, {
        width: 2500,
        height: 500,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('aspect ratio');

      // Test valid aspect ratio (16:9)
      result = videoProcessingService.validateVideo(mockFile, {
        width: 1920,
        height: 1080,
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('Compression Settings', () => {
    it('should get default compression settings', () => {
      const settings = videoProcessingService.getCompressionSettings();
      expect(settings).toHaveProperty('format');
      expect(settings).toHaveProperty('videoCodec');
      expect(settings).toHaveProperty('audioCodec');
      expect(settings).toHaveProperty('videoBitrate');
      expect(settings).toHaveProperty('audioBitrate');
      expect(settings).toHaveProperty('resolution');
      expect(settings).toHaveProperty('frameRate');
      expect(settings).toHaveProperty('preset');
    });

    it('should merge custom compression settings', () => {
      const customSettings = {
        videoBitrate: '2000k',
        resolution: { width: 1920, height: 1080 },
      };

      const settings = videoProcessingService.getCompressionSettings(customSettings);
      expect(settings.videoBitrate).toBe('2000k');
      expect(settings.resolution).toEqual({ width: 1920, height: 1080 });
      expect(settings.videoCodec).toBe('libx264'); // Should keep default
    });
  });

  describe('Bitrate Calculation', () => {
    it('should calculate recommended bitrate for SD', () => {
      const bitrate = videoProcessingService.calculateRecommendedBitrate(640, 480);
      expect(bitrate).toBe('500k');
    });

    it('should calculate recommended bitrate for 720p', () => {
      const bitrate = videoProcessingService.calculateRecommendedBitrate(1280, 720);
      expect(bitrate).toBe('1000k');
    });

    it('should calculate recommended bitrate for 1080p', () => {
      const bitrate = videoProcessingService.calculateRecommendedBitrate(1920, 1080);
      expect(bitrate).toBe('2500k');
    });

    it('should calculate recommended bitrate for 1440p', () => {
      const bitrate = videoProcessingService.calculateRecommendedBitrate(2560, 1440);
      expect(bitrate).toBe('6000k');
    });

    it('should calculate recommended bitrate for 4K', () => {
      const bitrate = videoProcessingService.calculateRecommendedBitrate(3840, 2160);
      expect(bitrate).toBe('10000k');
    });
  });

  describe('Duration Estimation', () => {
    it('should estimate duration from file size', () => {
      const fileSize = 10 * 1024 * 1024; // 10MB
      const bitrate = 2000000; // 2Mbps
      const duration = videoProcessingService.estimateDurationFromSize(fileSize, bitrate);
      expect(duration).toBeGreaterThan(0);
      expect(duration).toBe(Math.round((fileSize * 8) / bitrate));
    });
  });

  describe('Format Validation', () => {
    it('should validate supported video format', () => {
      const result = videoProcessingService.validateVideoFormat('video/mp4');
      expect(result.valid).toBe(true);
    });

    it('should reject unsupported format', () => {
      const result = videoProcessingService.validateVideoFormat('video/x-flv');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unsupported video format');
    });
  });

  describe('Thumbnail Timestamp Calculation', () => {
    it('should calculate thumbnail timestamps', () => {
      const duration = 60; // 60 seconds
      const count = 3;

      // Use type assertion to access private method for testing
      const service = videoProcessingService as any;
      const timestamps = service.calculateThumbnailTimestamps(count, duration);

      expect(timestamps).toHaveLength(count);
      expect(timestamps[0]).toBeGreaterThan(0);
      expect(timestamps[timestamps.length - 1]).toBeLessThan(duration);

      // Check that timestamps are evenly distributed
      const interval = duration / (count + 1);
      timestamps.forEach((timestamp: number, index: number) => {
        const expectedTimestamp = interval * (index + 1);
        expect(timestamp).toBeCloseTo(expectedTimestamp, 1);
      });
    });

    it('should handle unknown duration', () => {
      const count = 3;
      const service = videoProcessingService as any;
      const timestamps = service.calculateThumbnailTimestamps(count);

      expect(timestamps).toHaveLength(count);
      expect(timestamps[0]).toBeGreaterThan(0);
    });
  });

  // Video processing tests with proper mocking
  describe('Video Processing with Mocked FFmpeg', () => {
    // Mock data
    const mockVideoBuffer = Buffer.from('mock-video-data');
    const mockThumbnailBuffer = Buffer.from('mock-thumbnail-jpeg-data');
    const mockCompressedBuffer = Buffer.from('mock-compressed-video-data');

    // Mock ffprobe metadata response
    const mockFFProbeMetadata = {
      streams: [
        {
          codec_type: 'video',
          codec_name: 'h264',
          width: 1920,
          height: 1080,
          r_frame_rate: '30/1',
        },
      ],
      format: {
        duration: 30.5,
        bit_rate: '2500000',
      },
    };

    beforeEach(() => {
      // Reset all mocks before each test
      jest.clearAllMocks();
    });

    describe('getVideoMetadata', () => {
      it('should extract video metadata', async () => {
        // Mock fs methods
        const writeFileSpy = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue();
        const unlinkSpy = jest.spyOn(fs.promises, 'unlink').mockResolvedValue();

        const metadata = await videoProcessingService.getVideoMetadata(mockVideoBuffer, 'video/mp4');

        // Verify metadata extraction
        expect(metadata).toHaveProperty('duration');
        expect(metadata).toHaveProperty('width');
        expect(metadata).toHaveProperty('height');
        expect(metadata).toHaveProperty('codec');
        expect(metadata).toHaveProperty('bitrate');
        expect(metadata).toHaveProperty('frameRate');

        // Verify values (from mock)
        expect(metadata.duration).toBe(30.5);
        expect(metadata.width).toBe(1920);
        expect(metadata.height).toBe(1080);
        expect(metadata.codec).toBe('h264');
        expect(metadata.bitrate).toBe(2500000);
        expect(metadata.frameRate).toBeCloseTo(30, 1);
        expect(metadata.size).toBe(mockVideoBuffer.length);
        expect(metadata.mimetype).toBe('video/mp4');

        // Verify file operations occurred
        expect(writeFileSpy).toHaveBeenCalled();
        expect(unlinkSpy).toHaveBeenCalled();

        // Cleanup
        writeFileSpy.mockRestore();
        unlinkSpy.mockRestore();
      });

      it('should handle metadata extraction errors', async () => {
        // Mock fs methods
        const writeFileSpy = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue();
        const unlinkSpy = jest.spyOn(fs.promises, 'unlink').mockResolvedValue();

        // Mock ffmpeg.ffprobe to return error
        const ffmpegModule = require('fluent-ffmpeg');
        const originalFfprobe = ffmpegModule.ffprobe;
        ffmpegModule.ffprobe = jest.fn((filePath: string, callback: Function) => {
          callback(new Error('FFprobe failed'));
        });

        await expect(
          videoProcessingService.getVideoMetadata(mockVideoBuffer, 'video/mp4')
        ).rejects.toThrow('Failed to extract video metadata');

        // Verify cleanup still happens
        expect(unlinkSpy).toHaveBeenCalled();

        // Restore ffprobe
        ffmpegModule.ffprobe = originalFfprobe;

        // Cleanup
        writeFileSpy.mockRestore();
        unlinkSpy.mockRestore();
      });
    });

    describe('generateThumbnail', () => {
      it('should generate thumbnail', async () => {
        // Mock fs methods
        const writeFileSpy = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue();
        const readFileSpy = jest.spyOn(fs.promises, 'readFile').mockResolvedValue(mockThumbnailBuffer);
        const unlinkSpy = jest.spyOn(fs.promises, 'unlink').mockResolvedValue();

        const thumbnail = await videoProcessingService.generateThumbnail(
          mockVideoBuffer,
          { width: 320, height: 320, count: 1 },
          5
        );

        // Verify thumbnail generation
        expect(Buffer.isBuffer(thumbnail)).toBe(true);
        expect(thumbnail.length).toBeGreaterThan(0);

        // Verify file operations
        expect(writeFileSpy).toHaveBeenCalled();
        expect(readFileSpy).toHaveBeenCalled();
        expect(unlinkSpy).toHaveBeenCalled(); // At least once for cleanup

        // Cleanup
        writeFileSpy.mockRestore();
        readFileSpy.mockRestore();
        unlinkSpy.mockRestore();
      });

      it('should handle thumbnail generation errors', async () => {
        // Mock fs methods
        const writeFileSpy = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue();
        const unlinkSpy = jest.spyOn(fs.promises, 'unlink').mockResolvedValue();

        // Make ffmpeg fail
        const ffmpegModule = require('fluent-ffmpeg');
        ffmpegModule._setShouldSucceed(false);

        await expect(
          videoProcessingService.generateThumbnail(
            mockVideoBuffer,
            { width: 320, height: 320, count: 1 },
            0
          )
        ).rejects.toThrow('Thumbnail generation failed');

        // Reset
        ffmpegModule._setShouldSucceed(true);

        // Cleanup
        writeFileSpy.mockRestore();
        unlinkSpy.mockRestore();
      });
    });

    describe('compressVideo', () => {
      it('should compress video', async () => {
        // Mock fs methods
        const writeFileSpy = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue();
        const readFileSpy = jest.spyOn(fs.promises, 'readFile').mockResolvedValue(mockCompressedBuffer);
        const unlinkSpy = jest.spyOn(fs.promises, 'unlink').mockResolvedValue();

        const result = await videoProcessingService.compressVideo(mockVideoBuffer);

        // Verify compression result
        expect(Buffer.isBuffer(result.compressed)).toBe(true);
        expect(result.compressed).toEqual(mockCompressedBuffer);
        expect(typeof result.compressionRatio).toBe('number');
        expect(result.compressionRatio).toBeGreaterThanOrEqual(0);
        expect(result.compressionRatio).toBeLessThanOrEqual(1);

        // Verify file operations
        expect(writeFileSpy).toHaveBeenCalled();
        expect(readFileSpy).toHaveBeenCalled();
        expect(unlinkSpy).toHaveBeenCalled(); // At least once for cleanup

        // Cleanup
        writeFileSpy.mockRestore();
        readFileSpy.mockRestore();
        unlinkSpy.mockRestore();
      });

      it('should handle compression errors', async () => {
        // Mock fs methods
        const writeFileSpy = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue();
        const unlinkSpy = jest.spyOn(fs.promises, 'unlink').mockResolvedValue();

        // Make ffmpeg fail
        const ffmpegModule = require('fluent-ffmpeg');
        ffmpegModule._setShouldSucceed(false);

        await expect(
          videoProcessingService.compressVideo(mockVideoBuffer)
        ).rejects.toThrow('Video compression failed');

        // Reset
        ffmpegModule._setShouldSucceed(true);

        // Cleanup
        writeFileSpy.mockRestore();
        unlinkSpy.mockRestore();
      });

      it('should use custom compression settings', async () => {
        // Mock fs methods
        const writeFileSpy = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue();
        const readFileSpy = jest.spyOn(fs.promises, 'readFile').mockResolvedValue(mockCompressedBuffer);
        const unlinkSpy = jest.spyOn(fs.promises, 'unlink').mockResolvedValue();

        const customOptions = {
          videoBitrate: '1000k',
          resolution: { width: 1280, height: 720 },
        };

        const result = await videoProcessingService.compressVideo(mockVideoBuffer, customOptions);

        // Verify result
        expect(Buffer.isBuffer(result.compressed)).toBe(true);
        expect(typeof result.compressionRatio).toBe('number');

        // Cleanup
        writeFileSpy.mockRestore();
        readFileSpy.mockRestore();
        unlinkSpy.mockRestore();
      });
    });
  });
});
