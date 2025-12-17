# Video Processing Implementation Guide

## Overview

This document provides comprehensive documentation for the video processing functionality implemented in the media service. The implementation uses **fluent-ffmpeg** to provide real video thumbnail extraction, compression, and various video manipulation features.

## Prerequisites

### FFmpeg Installation

The video processing service requires FFmpeg and FFprobe to be installed on your system.

#### Windows

```bash
# Using Chocolatey
choco install ffmpeg

# Or download from https://ffmpeg.org/download.html
# Add FFmpeg to your system PATH
```

#### macOS

```bash
# Using Homebrew
brew install ffmpeg
```

#### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install ffmpeg
```

#### Verify Installation

```bash
ffmpeg -version
ffprobe -version
```

### Node.js Dependencies

Install the required npm packages:

```bash
npm install fluent-ffmpeg
npm install --save-dev @types/fluent-ffmpeg
```

These dependencies have already been added to `package.json`.

## Features Implemented

### 1. Video Metadata Extraction

Extracts complete video information using ffprobe:

```typescript
const metadata = await videoProcessingService.getVideoMetadata(videoBuffer, mimetype);
// Returns: { duration, width, height, codec, bitrate, frameRate, size, mimetype }
```

**Features:**
- Accurate duration detection
- Video dimensions (width, height)
- Codec information
- Bitrate detection
- Frame rate calculation

### 2. Thumbnail Generation

Generates high-quality thumbnails from video frames:

```typescript
// Single thumbnail at specific timestamp
const thumbnail = await videoProcessingService.generateThumbnail(
  videoBuffer,
  { width: 640, height: 640, count: 1 },
  5 // timestamp in seconds
);

// Multiple thumbnails at different timestamps
const thumbnails = await videoProcessingService.generateThumbnails(
  videoBuffer,
  { width: 640, height: 640, count: 3 }
);
```

**Features:**
- Extract frames at specific timestamps
- Automatic timestamp distribution for multiple thumbnails
- Customizable dimensions
- High-quality JPEG output (85% quality)
- Sharp post-processing for optimal quality

### 3. Video Compression

Compress videos with configurable settings:

```typescript
const { compressed, compressionRatio } = await videoProcessingService.compressVideo(
  videoBuffer,
  {
    format: 'mp4',
    videoCodec: 'libx264',
    audioCodec: 'aac',
    videoBitrate: '1000k',
    audioBitrate: '128k',
    resolution: { width: 1280, height: 720 },
    frameRate: 30,
    preset: 'medium'
  }
);
```

**Features:**
- Configurable video and audio codecs
- Customizable bitrate for size optimization
- Resolution scaling
- Frame rate adjustment
- Compression presets (ultrafast to veryslow)
- Fast-start optimization for streaming
- YUV420p pixel format for compatibility

**Compression Presets:**
- `ultrafast` - Fastest encoding, largest file size
- `superfast`, `veryfast`, `faster`, `fast` - Balanced options
- `medium` - Default, good balance of speed and compression
- `slow`, `slower`, `veryslow` - Best compression, slowest encoding

### 4. Complete Video Processing Pipeline

Process videos with validation, compression, and thumbnail generation:

```typescript
const result = await videoProcessingService.processVideo(file, metadata);
// Returns: { valid, compressed, thumbnails, metadata, error? }
```

**Pipeline Steps:**
1. Extract metadata using ffprobe
2. Validate video (format, size, duration, dimensions)
3. Compress video with optimal settings
4. Generate multiple thumbnails
5. Return processed assets and metadata

### 5. Additional Utility Functions

#### Mobile Version Creation

Create optimized version for mobile devices:

```typescript
const mobileVideo = await videoProcessingService.createMobileVersion(videoBuffer);
```

Settings:
- Resolution: 640x640
- Video bitrate: 500k
- Audio bitrate: 96k
- Frame rate: 24fps
- Preset: fast

#### Audio Extraction

Extract audio track from video:

```typescript
const audioBuffer = await videoProcessingService.extractAudio(videoBuffer);
// Returns MP3 audio at 128kbps
```

#### GIF Preview Generation

Create animated GIF preview:

```typescript
const gifPreview = await videoProcessingService.generateGifPreview(
  videoBuffer,
  { width: 320, height: 320, duration: 3, fps: 10 }
);
```

#### Video Rotation

Rotate video by 90, 180, or 270 degrees:

```typescript
const rotatedVideo = await videoProcessingService.rotateVideo(videoBuffer, 90);
```

#### Video Integrity Validation

Check if video file is corrupted:

```typescript
const { valid, error } = await videoProcessingService.validateVideoIntegrity(videoBuffer);
```

#### Detailed Video Information

Get complete video information for debugging:

```typescript
const info = await videoProcessingService.getDetailedVideoInfo(videoBuffer);
// Returns: { format, streams, chapters }
```

## Configuration

Video processing settings are configured in `src/config/index.ts`:

```typescript
videoProcessing: {
  maxDuration: 60,              // Maximum video duration in seconds
  minDuration: 3,               // Minimum video duration in seconds
  thumbnail: {
    width: 640,
    height: 640,
    count: 3                    // Number of thumbnails to generate
  },
  outputFormat: 'mp4',
  videoCodec: 'libx264',
  audioCodec: 'aac',
  videoBitrate: '1000k',
  audioBitrate: '128k',
  frameRate: 30,
  resolution: {
    width: 1280,
    height: 720                 // 720p default
  },
  compressionPreset: 'medium'
}
```

## Error Handling

The implementation includes comprehensive error handling:

1. **FFmpeg Availability Checks**
   - Verifies FFmpeg and FFprobe are installed
   - Graceful degradation if tools are unavailable

2. **Temporary File Cleanup**
   - All temporary files are cleaned up in finally blocks
   - Prevents disk space issues

3. **Detailed Error Logging**
   - All errors are logged with context
   - FFmpeg stderr is captured for debugging

4. **Validation Errors**
   - Clear error messages for invalid inputs
   - Format, size, duration, and dimension validation

5. **Fallback Mechanisms**
   - Falls back to basic validation if metadata extraction fails
   - Continues processing with available data

## Usage Examples

### Example 1: Process Uploaded Video

```typescript
import videoProcessingService from './domain/services/video-processing.service';

async function handleVideoUpload(file: UploadedFile) {
  try {
    // Process video
    const result = await videoProcessingService.processVideo(file);

    if (!result.valid) {
      console.error('Video validation failed:', result.error);
      return;
    }

    // Upload compressed video and thumbnails to storage
    await storageService.upload(result.compressed, 'compressed.mp4');

    for (let i = 0; i < result.thumbnails.length; i++) {
      await storageService.upload(result.thumbnails[i], `thumbnail-${i}.jpg`);
    }

    console.log('Video processed successfully:', result.metadata);
  } catch (error) {
    console.error('Video processing error:', error);
  }
}
```

### Example 2: Custom Compression

```typescript
async function compressForStreaming(videoBuffer: Buffer) {
  const options = {
    videoBitrate: '2500k',
    audioBitrate: '192k',
    resolution: { width: 1920, height: 1080 },
    frameRate: 30,
    preset: 'slow' // Better compression for streaming
  };

  const { compressed, compressionRatio } = await videoProcessingService.compressVideo(
    videoBuffer,
    options
  );

  console.log(`Compressed by ${(compressionRatio * 100).toFixed(2)}%`);
  return compressed;
}
```

### Example 3: Generate Multiple Thumbnails

```typescript
async function createVideoPreview(videoBuffer: Buffer, duration: number) {
  // Generate thumbnails at 25%, 50%, and 75% of video duration
  const timestamps = [
    duration * 0.25,
    duration * 0.5,
    duration * 0.75
  ];

  const options = {
    width: 320,
    height: 320,
    count: 3,
    timestamps
  };

  const thumbnails = await videoProcessingService.generateThumbnails(
    videoBuffer,
    options,
    duration
  );

  return thumbnails;
}
```

## Performance Considerations

### 1. Temporary File Management

- All operations use temporary files for FFmpeg processing
- Files are automatically cleaned up after processing
- Consider implementing a cleanup job for orphaned temp files

### 2. Processing Time

Typical processing times (approximate):

- Metadata extraction: < 1 second
- Thumbnail generation: 1-2 seconds per thumbnail
- Video compression: Varies by video size and preset
  - 100MB video with 'fast' preset: ~30-60 seconds
  - 100MB video with 'medium' preset: ~60-120 seconds
  - 100MB video with 'slow' preset: ~120-240 seconds

### 3. Memory Usage

- Videos are loaded into memory as Buffers
- Consider streaming for very large files
- Monitor memory usage for concurrent processing

### 4. Recommended Optimizations

```typescript
// For production, process videos in background jobs
import Queue from 'bull';

const videoQueue = new Queue('video-processing', {
  redis: config.redis
});

videoQueue.process(async (job) => {
  const { videoBuffer } = job.data;
  return await videoProcessingService.processVideo(videoBuffer);
});
```

## Testing

### Check FFmpeg Availability

```typescript
const capabilities = await videoProcessingService.getCapabilities();
console.log('FFmpeg available:', capabilities.ffmpegAvailable);
console.log('FFprobe available:', capabilities.ffprobeAvailable);
```

### Validate Video Integrity

```typescript
const { valid, error } = await videoProcessingService.validateVideoIntegrity(videoBuffer);
if (!valid) {
  console.error('Corrupted video:', error);
}
```

## Troubleshooting

### FFmpeg Not Found

**Error:** `FFmpeg/FFprobe is not available`

**Solution:**
1. Install FFmpeg on your system
2. Ensure FFmpeg is in your system PATH
3. Restart your application after installation
4. Verify with: `ffmpeg -version`

### Compression Fails

**Error:** `Video compression failed`

**Solutions:**
1. Check video codec compatibility
2. Verify video file is not corrupted
3. Check available disk space for temporary files
4. Review FFmpeg error logs for details

### Thumbnail Generation Fails

**Error:** `Thumbnail generation failed`

**Solutions:**
1. Verify video has valid frames at requested timestamp
2. Check if timestamp is within video duration
3. Ensure FFmpeg can decode the video format

### Memory Issues

**Error:** `JavaScript heap out of memory`

**Solutions:**
1. Process videos in chunks
2. Use streaming where possible
3. Increase Node.js memory limit: `node --max-old-space-size=4096`
4. Process videos in background jobs

## Security Considerations

1. **File Validation**
   - Always validate MIME types
   - Check file extensions
   - Verify file integrity before processing

2. **Size Limits**
   - Enforce maximum file size limits
   - Prevent DoS through large file uploads

3. **Temporary Files**
   - Use unique identifiers for temp files
   - Clean up temp files promptly
   - Implement temp file age limits

4. **Resource Limits**
   - Limit concurrent video processing
   - Implement processing timeouts
   - Monitor system resources

## Migration from Placeholder Implementation

The previous implementation used placeholder SVG thumbnails. To migrate:

1. Install FFmpeg on all deployment environments
2. Update environment variables if needed
3. Test video processing pipeline
4. Monitor for errors in production
5. Implement background job processing for better performance

## API Reference

### VideoProcessingService Methods

- `validateVideo(file, metadata?)` - Validate video file
- `getVideoMetadata(buffer, mimetype)` - Extract metadata
- `generateThumbnail(buffer, options, timestamp)` - Generate single thumbnail
- `generateThumbnails(buffer, options, duration?)` - Generate multiple thumbnails
- `compressVideo(buffer, options?)` - Compress video
- `processVideo(file, metadata?)` - Complete processing pipeline
- `createMobileVersion(buffer)` - Create mobile-optimized version
- `extractAudio(buffer)` - Extract audio track
- `generateGifPreview(buffer, options?)` - Generate GIF preview
- `rotateVideo(buffer, degrees)` - Rotate video
- `validateVideoIntegrity(buffer)` - Check video integrity
- `getDetailedVideoInfo(buffer)` - Get detailed information
- `isFFmpegAvailable()` - Check FFmpeg availability
- `isFFProbeAvailable()` - Check FFprobe availability
- `getCapabilities()` - Get service capabilities

## Support

For issues or questions:
1. Check FFmpeg documentation: https://ffmpeg.org/documentation.html
2. Review fluent-ffmpeg docs: https://github.com/fluent-ffmpeg/node-fluent-ffmpeg
3. Check service logs for detailed error messages
4. Verify FFmpeg installation and PATH configuration
