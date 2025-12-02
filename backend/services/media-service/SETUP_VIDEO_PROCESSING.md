# Video Processing Setup Instructions

## Quick Start

Follow these steps to set up video processing functionality in the media service.

## Step 1: Install FFmpeg

FFmpeg is required for video processing. Choose the installation method for your operating system:

### Windows

**Option A: Using Chocolatey (Recommended)**
```bash
choco install ffmpeg
```

**Option B: Manual Installation**
1. Download FFmpeg from https://ffmpeg.org/download.html
2. Extract to a folder (e.g., `C:\ffmpeg`)
3. Add `C:\ffmpeg\bin` to your system PATH:
   - Open System Properties > Environment Variables
   - Edit the `Path` variable
   - Add `C:\ffmpeg\bin`
   - Restart your terminal

### macOS

```bash
# Using Homebrew
brew install ffmpeg
```

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install ffmpeg
```

### Docker

If running in Docker, add to your Dockerfile:

```dockerfile
RUN apt-get update && apt-get install -y ffmpeg
```

## Step 2: Verify FFmpeg Installation

Run these commands to verify FFmpeg is installed correctly:

```bash
ffmpeg -version
ffprobe -version
```

You should see version information for both commands.

## Step 3: Install Node.js Dependencies

Navigate to the media service directory and install dependencies:

```bash
cd backend/services/media-service
npm install
```

The required packages are already in `package.json`:
- `fluent-ffmpeg` - FFmpeg wrapper for Node.js
- `@types/fluent-ffmpeg` - TypeScript definitions

## Step 4: Configuration

The video processing configuration is already set up in `src/config/index.ts`. You can customize these settings via environment variables:

```bash
# .env file
MAX_VIDEO_FILE_SIZE=104857600        # 100MB in bytes
MAX_VIDEO_DURATION=60                # 60 seconds
MIN_VIDEO_DURATION=3                 # 3 seconds
```

Default configuration:
- Max file size: 100MB
- Max duration: 60 seconds
- Min duration: 3 seconds
- Output format: MP4 (H.264 video, AAC audio)
- Default resolution: 720p (1280x720)
- Thumbnails: 3 per video, 640x640px

## Step 5: Test the Implementation

Run the test suite to verify everything is working:

```bash
npm test -- video-processing.service.test.ts
```

Or test manually by checking FFmpeg availability:

```bash
npm run dev
```

Then in your code:

```typescript
import videoProcessingService from './domain/services/video-processing.service';

// Check if FFmpeg is available
const capabilities = await videoProcessingService.getCapabilities();
console.log('FFmpeg available:', capabilities.ffmpegAvailable);
console.log('FFprobe available:', capabilities.ffprobeAvailable);
```

## Step 6: Usage Example

Here's a complete example of processing a video:

```typescript
import express from 'express';
import multer from 'multer';
import videoProcessingService from './domain/services/video-processing.service';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.post('/upload/video', upload.single('video'), async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    // Process video
    const result = await videoProcessingService.processVideo({
      fieldname: file.fieldname,
      originalname: file.originalname,
      encoding: file.encoding,
      mimetype: file.mimetype,
      buffer: file.buffer,
      size: file.size,
    });

    if (!result.valid) {
      return res.status(400).json({ error: result.error });
    }

    // Save compressed video and thumbnails to storage
    // ... your storage logic here

    res.json({
      success: true,
      metadata: result.metadata,
      thumbnailCount: result.thumbnails?.length,
    });
  } catch (error) {
    console.error('Video processing error:', error);
    res.status(500).json({ error: 'Video processing failed' });
  }
});

app.listen(3004, () => {
  console.log('Media service running on port 3004');
});
```

## Troubleshooting

### Problem: "FFmpeg not found" or "FFmpeg is not available"

**Solutions:**
1. Verify FFmpeg is installed: `ffmpeg -version`
2. Check if FFmpeg is in your system PATH
3. Restart your terminal/IDE after installation
4. On Windows, ensure you added FFmpeg to PATH and restarted

### Problem: "ENOENT: no such file or directory" errors

**Solutions:**
1. Check that temporary directory exists and is writable
2. On Windows, verify `os.tmpdir()` is accessible
3. Check disk space

### Problem: Video processing is very slow

**Solutions:**
1. Use faster compression preset (e.g., 'fast' or 'veryfast')
2. Process videos in background jobs using Bull queue
3. Reduce output resolution or bitrate
4. Consider using hardware acceleration (H.264 QSV, NVENC)

### Problem: Memory issues with large videos

**Solutions:**
1. Increase Node.js heap size: `node --max-old-space-size=4096`
2. Process videos in background workers
3. Implement streaming instead of loading entire video into memory
4. Set stricter file size limits

### Problem: Tests are failing

**Solutions:**
1. Ensure FFmpeg is installed and in PATH
2. Check that test fixtures exist (if using sample videos)
3. Run tests with verbose output: `npm test -- --verbose`
4. Skip integration tests if FFmpeg unavailable (they're marked with `.skip`)

## Production Deployment

### Recommended Setup for Production

1. **Background Job Processing**

Use Bull queue for video processing:

```typescript
import Queue from 'bull';
import videoProcessingService from './domain/services/video-processing.service';

const videoQueue = new Queue('video-processing', {
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
  }
});

videoQueue.process(async (job) => {
  const { videoBuffer, userId, fileName } = job.data;

  return await videoProcessingService.processVideo({
    fieldname: 'video',
    originalname: fileName,
    encoding: '7bit',
    mimetype: 'video/mp4',
    buffer: videoBuffer,
    size: videoBuffer.length,
  });
});

// Add video to queue
export async function queueVideoProcessing(videoBuffer: Buffer, userId: string, fileName: string) {
  await videoQueue.add({
    videoBuffer,
    userId,
    fileName,
  }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    timeout: 600000, // 10 minutes
  });
}
```

2. **Docker Configuration**

```dockerfile
FROM node:20-alpine

# Install FFmpeg
RUN apk add --no-cache ffmpeg

# Install dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --production

# Copy application files
COPY . .

# Build TypeScript
RUN npm run build

EXPOSE 3004
CMD ["npm", "start"]
```

3. **Resource Limits**

Set appropriate resource limits:

```yaml
# docker-compose.yml
services:
  media-service:
    image: media-service:latest
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G
```

4. **Monitoring**

Monitor video processing performance:

```typescript
import { performance } from 'perf_hooks';

async function processVideoWithMetrics(videoBuffer: Buffer) {
  const start = performance.now();

  try {
    const result = await videoProcessingService.processVideo(videoBuffer);
    const duration = performance.now() - start;

    logger.info('Video processing metrics', {
      duration: `${duration.toFixed(2)}ms`,
      originalSize: videoBuffer.length,
      compressedSize: result.compressed?.length,
      compressionRatio: result.metadata?.compressionRatio,
    });

    return result;
  } catch (error) {
    const duration = performance.now() - start;
    logger.error('Video processing failed', { duration, error });
    throw error;
  }
}
```

5. **Health Checks**

Add health check endpoint:

```typescript
app.get('/health/video-processing', async (req, res) => {
  const capabilities = await videoProcessingService.getCapabilities();

  res.json({
    status: capabilities.ffmpegAvailable ? 'healthy' : 'degraded',
    ffmpeg: capabilities.ffmpegAvailable,
    ffprobe: capabilities.ffprobeAvailable,
    compressionEnabled: capabilities.compressionEnabled,
  });
});
```

## Environment-Specific Notes

### Development

- Use 'fast' or 'veryfast' preset for faster processing
- Process videos synchronously for easier debugging
- Keep file size limits reasonable for testing

### Staging

- Use same configuration as production
- Test with production-sized videos
- Monitor performance metrics

### Production

- Use 'medium' preset for good balance
- Process videos in background jobs
- Implement rate limiting
- Monitor disk space and memory usage
- Set up alerts for processing failures
- Implement retry logic with exponential backoff

## Additional Resources

- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [fluent-ffmpeg GitHub](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg)
- [Video Processing Guide](./VIDEO_PROCESSING.md)

## Next Steps

1. Review the [VIDEO_PROCESSING.md](./VIDEO_PROCESSING.md) for detailed API documentation
2. Customize compression settings for your use case
3. Implement background job processing for production
4. Set up monitoring and alerts
5. Test with real user videos

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review FFmpeg logs in the application logs
3. Verify FFmpeg installation with `ffmpeg -version`
4. Check that temporary directories are writable
5. Ensure sufficient disk space and memory
