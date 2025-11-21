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
  },

  // Image processing
  imageProcessing: {
    thumbnail: { width: 200, height: 200 },
    standard: { width: 800, height: 800 },
    hd: { width: 1920, height: 1920 },
    quality: 85,
    format: 'jpeg' as const,
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
