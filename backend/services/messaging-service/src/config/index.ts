const isProduction = process.env.NODE_ENV === 'production';

function requireSecret(name: string, devDefault: string): string {
  const value = process.env[name];
  if (value) return value;
  if (isProduction) throw new Error(`${name} environment variable is required in production`);
  return devDefault;
}

function optionalSecret(name: string): string | undefined {
  return process.env[name];
}

export default {
  port: parseInt(process.env.PORT || '3003', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  jwt: {
    secret: requireSecret('JWT_ACCESS_SECRET', 'dev-only-jwt-secret'),
  },

  cosmos: {
    endpoint: process.env.COSMOS_ENDPOINT || '',
    key: process.env.COSMOS_KEY || '',
    databaseId: process.env.COSMOS_DATABASE_ID || 'Flamoral',
    containers: {
      messages: process.env.COSMOS_MESSAGES_CONTAINER || 'Messages',
      conversations: process.env.COSMOS_CONVERSATIONS_CONTAINER || 'Conversations',
    },
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

  // Azure Speech Service configuration for voice transcription
  azureSpeech: {
    subscriptionKey: optionalSecret('AZURE_SPEECH_SUBSCRIPTION_KEY'),
    region: process.env.AZURE_SPEECH_REGION || 'eastus',
    language: process.env.AZURE_SPEECH_LANGUAGE || 'en-US',
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
      enableTranscription: process.env.VOICE_ENABLE_TRANSCRIPTION !== 'false', // Default true if Speech SDK configured
    },
    // FFmpeg path configuration (optional, uses system PATH by default)
    ffmpegPath: process.env.FFMPEG_PATH || undefined,
    ffprobePath: process.env.FFPROBE_PATH || undefined,
  },

  services: {
    matchingServiceUrl: process.env.MATCHING_SERVICE_URL || 'http://localhost:3002',
    userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:3001',
  },

  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  },

  // Realtime service configuration
  realtimeServiceUrl: process.env.REALTIME_SERVICE_URL || 'http://localhost:8081',
  serviceToken: requireSecret('SERVICE_TOKEN', 'dev-only-service-token'),
};
