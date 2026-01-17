const isProduction = process.env.NODE_ENV === 'production';

function requireSecret(name: string, devDefault: string): string {
  const value = process.env[name];
  if (value) return value;
  if (isProduction) throw new Error(`${name} environment variable is required in production`);
  return devDefault;
}

export default {
  port: parseInt(process.env.PORT || '3003', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  jwt: {
    secret: requireSecret('JWT_ACCESS_SECRET', 'dev-only-jwt-secret'),
  },

  // PostgreSQL Database
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    user: process.env.POSTGRES_USER || 'flamoral',
    password: process.env.POSTGRES_PASSWORD || '',
    database: process.env.POSTGRES_DATABASE || 'flamoral_messaging',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    ttl: {
      onlineStatus: 300, // 5 minutes
      typingIndicator: 10, // 10 seconds
      messageCache: 3600, // 1 hour
    },
  },

  encryption: {
    algorithm: 'aes-256-cbc',
    key: requireSecret('ENCRYPTION_KEY', 'dev-encryption-key-32-characters'),
    ivLength: 16,
  },

  messaging: {
    maxMessageLength: 5000,
    maxMediaSize: 10 * 1024 * 1024, // 10MB
    typingTimeout: 10000, // 10 seconds
    messageRetentionDays: 365,
    maxConversationsPerPage: 50,
    maxMessagesPerPage: 50,
  },

  // AWS Transcribe for voice transcription
  awsTranscribe: {
    region: process.env.AWS_REGION || 'us-east-1',
    language: process.env.TRANSCRIBE_LANGUAGE || 'en-US',
  },

  // Media processing configuration
  mediaProcessing: {
    // Image processing settings
    image: {
      maxFileSize: parseInt(process.env.IMAGE_MAX_FILE_SIZE || '10485760', 10), // 10MB default
      maxWidth: parseInt(process.env.IMAGE_MAX_WIDTH || '1920', 10),
      maxHeight: parseInt(process.env.IMAGE_MAX_HEIGHT || '1080', 10),
      thumbnailWidth: parseInt(process.env.IMAGE_THUMBNAIL_WIDTH || '300', 10),
      thumbnailHeight: parseInt(process.env.IMAGE_THUMBNAIL_HEIGHT || '300', 10),
      compressionQuality: parseInt(process.env.IMAGE_COMPRESSION_QUALITY || '85', 10),
      convertToWebP: process.env.IMAGE_CONVERT_TO_WEBP !== 'false', // Default true
    },
    // Voice/audio processing settings
    voice: {
      maxFileSize: parseInt(process.env.VOICE_MAX_FILE_SIZE || '5242880', 10), // 5MB default
      maxDuration: parseInt(process.env.VOICE_MAX_DURATION || '120', 10), // 2 minutes default
      targetBitrate: parseInt(process.env.VOICE_TARGET_BITRATE || '64000', 10), // 64kbps default
      waveformSamples: parseInt(process.env.VOICE_WAVEFORM_SAMPLES || '50', 10),
      enableTranscription: process.env.VOICE_ENABLE_TRANSCRIPTION !== 'false',
    },
    // FFmpeg path configuration (optional, uses system PATH by default)
    ffmpegPath: process.env.FFMPEG_PATH || undefined,
    ffprobePath: process.env.FFPROBE_PATH || undefined,
  },

  services: {
    matchingServiceUrl: process.env.MATCHING_SERVICE_URL || 'http://localhost:3002',
    userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005',
  },

  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || (
      process.env.NODE_ENV === 'production'
        ? ['https://flamoral.com', 'https://www.flamoral.com', 'https://app.flamoral.com']
        : ['http://localhost:3000', 'http://localhost:5173']
    ),
  },

  // Realtime service configuration
  realtimeServiceUrl: process.env.REALTIME_SERVICE_URL || 'http://localhost:8081',
  serviceToken: requireSecret('SERVICE_TOKEN', 'dev-only-service-token'),
};
