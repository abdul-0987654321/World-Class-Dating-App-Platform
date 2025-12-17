import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3004', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Azure Storage
  azure: {
    storageAccountName: process.env.AZURE_STORAGE_ACCOUNT_NAME || '',
    storageAccountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY || '',
    containerName: process.env.AZURE_CONTAINER_NAME || 'media',
    cdnUrl: process.env.AZURE_CDN_URL || '',
  },

  // Azure Computer Vision
  computerVision: {
    endpoint: process.env.AZURE_CV_ENDPOINT || '',
    apiKey: process.env.AZURE_CV_API_KEY || '',
  },

  // Upload limits
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB default
    maxPhotosPerUser: parseInt(process.env.MAX_PHOTOS_PER_USER || '9', 10),
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
    // Video limits
    maxVideoFileSize: parseInt(process.env.MAX_VIDEO_FILE_SIZE || '104857600', 10), // 100MB default
    maxVideosPerUser: parseInt(process.env.MAX_VIDEOS_PER_USER || '3', 10),
    allowedVideoMimeTypes: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
    allowedVideoExtensions: ['.mp4', '.mov', '.avi', '.webm'],
  },

  // Image processing
  imageProcessing: {
    thumbnail: { width: 200, height: 200 },
    standard: { width: 800, height: 800 },
    hd: { width: 1920, height: 1920 },
    quality: 85,
    format: process.env.IMAGE_OUTPUT_FORMAT === 'jpeg' ? ('jpeg' as const) : ('webp' as const),
    webpQuality: 80, // WebP can use lower quality for same visual quality
    jpegQuality: 85,
    enableWebP: process.env.ENABLE_WEBP !== 'false', // Default to true
  },

  // Video processing
  videoProcessing: {
    maxDuration: parseInt(process.env.MAX_VIDEO_DURATION || '60', 10), // 60 seconds default
    minDuration: parseInt(process.env.MIN_VIDEO_DURATION || '3', 10), // 3 seconds minimum
    thumbnail: { width: 640, height: 640, count: 3 }, // Generate 3 thumbnails
    outputFormat: 'mp4' as const,
    videoCodec: 'libx264' as const,
    audioCodec: 'aac' as const,
    videoBitrate: '1000k',
    audioBitrate: '128k',
    frameRate: 30,
    resolution: { width: 1280, height: 720 }, // 720p
    compressionPreset: 'medium' as const, // ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow
  },

  // Redis for Bull queue
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
  },

  // Content moderation thresholds
  moderation: {
    adultContentThreshold: 0.7,
    racyContentThreshold: 0.6,
    violenceContentThreshold: 0.7,
  },
};

export default config;
