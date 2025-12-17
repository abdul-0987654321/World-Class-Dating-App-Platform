# Video Processing API - Quick Reference

## Installation

```bash
# 1. Install FFmpeg
# Windows: choco install ffmpeg
# macOS: brew install ffmpeg
# Linux: sudo apt install ffmpeg

# 2. Install dependencies
npm install

# 3. Verify
ffmpeg -version
```

## Basic Usage

```typescript
import videoProcessingService from './domain/services/video-processing.service';
```

## Core Methods

### Process Video (Complete Pipeline)

```typescript
const result = await videoProcessingService.processVideo(file);
// Returns: { valid, compressed, thumbnails, metadata, error? }
```

### Extract Metadata

```typescript
const metadata = await videoProcessingService.getVideoMetadata(buffer, 'video/mp4');
// Returns: { duration, width, height, codec, bitrate, frameRate, size, mimetype }
```

### Generate Thumbnail

```typescript
// Single thumbnail at 5 seconds
const thumb = await videoProcessingService.generateThumbnail(
  buffer,
  { width: 640, height: 640, count: 1 },
  5
);

// Multiple thumbnails (auto-distributed)
const thumbs = await videoProcessingService.generateThumbnails(
  buffer,
  { width: 640, height: 640, count: 3 }
);
```

### Compress Video

```typescript
const { compressed, compressionRatio } = await videoProcessingService.compressVideo(
  buffer,
  {
    videoBitrate: '1000k',
    resolution: { width: 1280, height: 720 },
    preset: 'medium'
  }
);
```

### Validate Video

```typescript
const result = videoProcessingService.validateVideo(file, {
  duration: 30,
  width: 1920,
  height: 1080
});
// Returns: { valid, error?, duration?, dimensions? }
```

## Utility Methods

```typescript
// Mobile version
const mobile = await videoProcessingService.createMobileVersion(buffer);

// Extract audio
const audio = await videoProcessingService.extractAudio(buffer);

// GIF preview
const gif = await videoProcessingService.generateGifPreview(buffer, {
  width: 320,
  duration: 3,
  fps: 10
});

// Rotate video
const rotated = await videoProcessingService.rotateVideo(buffer, 90);

// Check integrity
const { valid } = await videoProcessingService.validateVideoIntegrity(buffer);

// Get capabilities
const caps = await videoProcessingService.getCapabilities();
```

## Compression Presets

```typescript
'ultrafast'  // Fastest, largest file
'fast'       // Good for development
'medium'     // Default, balanced
'slow'       // Better compression
'veryslow'   // Best compression, slowest
```

## Default Configuration

```typescript
{
  maxFileSize: 100MB,
  maxDuration: 60s,
  minDuration: 3s,
  outputFormat: 'mp4',
  videoCodec: 'libx264',
  audioCodec: 'aac',
  videoBitrate: '1000k',
  audioBitrate: '128k',
  resolution: { width: 1280, height: 720 },
  frameRate: 30,
  thumbnails: { width: 640, height: 640, count: 3 }
}
```

## Common Patterns

### Express Upload Handler

```typescript
app.post('/video', upload.single('video'), async (req, res) => {
  const result = await videoProcessingService.processVideo(req.file);

  if (!result.valid) {
    return res.status(400).json({ error: result.error });
  }

  // Save compressed video and thumbnails
  await saveToStorage(result.compressed, result.thumbnails);

  res.json({ success: true, metadata: result.metadata });
});
```

### Background Processing

```typescript
import Queue from 'bull';

const queue = new Queue('video', { redis: config.redis });

queue.process(async (job) => {
  return await videoProcessingService.processVideo(job.data.file);
});

// Add to queue
await queue.add({ file }, {
  attempts: 3,
  timeout: 600000 // 10 min
});
```

### Custom Compression

```typescript
// High quality for desktop
const hq = await videoProcessingService.compressVideo(buffer, {
  videoBitrate: '2500k',
  resolution: { width: 1920, height: 1080 },
  preset: 'slow'
});

// Low quality for mobile
const lq = await videoProcessingService.compressVideo(buffer, {
  videoBitrate: '500k',
  resolution: { width: 640, height: 640 },
  preset: 'fast'
});
```

## Error Handling

```typescript
try {
  const result = await videoProcessingService.processVideo(file);

  if (!result.valid) {
    // Validation error
    console.error(result.error);
  }
} catch (error) {
  // Processing error
  console.error('Failed:', error.message);
}
```

## Validation Rules

| Property | Min | Max | Notes |
|----------|-----|-----|-------|
| File Size | - | 100MB | Configurable |
| Duration | 3s | 60s | Configurable |
| Width | 320px | 4096px | - |
| Height | 320px | 4096px | - |
| Aspect Ratio | 1:2 | 2.5:1 | - |

## Supported Formats

- video/mp4
- video/quicktime
- video/x-msvideo
- video/webm

## Performance Tips

1. Use background jobs for production
2. Choose faster presets for development
3. Set appropriate timeouts (10min recommended)
4. Monitor disk space for temp files
5. Implement rate limiting on uploads

## Troubleshooting

```typescript
// Check FFmpeg availability
const caps = await videoProcessingService.getCapabilities();
console.log('FFmpeg:', caps.ffmpegAvailable);
console.log('FFprobe:', caps.ffprobeAvailable);

// Validate integrity
const { valid, error } = await videoProcessingService.validateVideoIntegrity(buffer);

// Get detailed info
const info = await videoProcessingService.getDetailedVideoInfo(buffer);
console.log(info.format, info.streams);
```

## Links

- [Full Documentation](./VIDEO_PROCESSING.md)
- [Setup Guide](./SETUP_VIDEO_PROCESSING.md)
- [Implementation Details](./IMPLEMENTATION_SUMMARY.md)
