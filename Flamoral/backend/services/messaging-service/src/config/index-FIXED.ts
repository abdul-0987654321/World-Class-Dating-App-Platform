/**
 * Configuration for Messaging Service
 * Includes Cosmos DB/MongoDB and Redis configurations
 */

export default {
  port: parseInt(process.env.PORT || '3004', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  jwt: {
    secret: process.env.JWT_ACCESS_SECRET || 'dev-secret-key',
  },

  // Cosmos DB / MongoDB Configuration
  cosmos: {
    endpoint: process.env.COSMOS_ENDPOINT || process.env.MONGODB_URI || '',
    key: process.env.COSMOS_KEY || process.env.MONGODB_PASSWORD || '',
    databaseId: process.env.COSMOS_DATABASE_ID || process.env.MONGODB_DATABASE || 'Flamoral',
    containers: {
      messages: process.env.COSMOS_MESSAGES_CONTAINER || 'Messages',
      conversations: process.env.COSMOS_CONVERSATIONS_CONTAINER || 'Conversations',
      callHistory: process.env.COSMOS_CALL_HISTORY_CONTAINER || 'CallHistory',
      callRecordings: process.env.COSMOS_CALL_RECORDINGS_CONTAINER || 'CallRecordings',
    },
    // Connection settings
    connectionTimeout: parseInt(process.env.COSMOS_CONNECTION_TIMEOUT || '30000', 10),
    requestTimeout: parseInt(process.env.COSMOS_REQUEST_TIMEOUT || '10000', 10),
    maxRetries: parseInt(process.env.COSMOS_MAX_RETRIES || '3', 10),
  },

  // MongoDB-specific settings (if using MongoDB instead of Cosmos DB)
  mongodb: {
    uri: process.env.MONGODB_URI || '',
    database: process.env.MONGODB_DATABASE || 'flamoral_messaging',
    options: {
      maxPoolSize: parseInt(process.env.MONGODB_POOL_SIZE || '10', 10),
      minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE || '2', 10),
      socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT || '45000', 10),
      connectTimeoutMS: parseInt(process.env.MONGODB_CONNECT_TIMEOUT || '30000', 10),
      retryWrites: process.env.MONGODB_RETRY_WRITES !== 'false',
      retryReads: process.env.MONGODB_RETRY_READS !== 'false',
    },
  },

  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    ttl: {
      onlineStatus: parseInt(process.env.REDIS_TTL_ONLINE_STATUS || '300', 10), // 5 minutes
      typingIndicator: parseInt(process.env.REDIS_TTL_TYPING || '10', 10), // 10 seconds
      messageCache: parseInt(process.env.REDIS_TTL_MESSAGE_CACHE || '3600', 10), // 1 hour
    },
    maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
    enableOfflineQueue: process.env.REDIS_ENABLE_OFFLINE_QUEUE !== 'false',
  },

  // Encryption Configuration
  encryption: {
    algorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm',
    key: process.env.ENCRYPTION_KEY || 'dev-encryption-key-32-characters',
    ivLength: parseInt(process.env.ENCRYPTION_IV_LENGTH || '16', 10),
  },

  // Messaging Business Rules
  messaging: {
    maxMessageLength: parseInt(process.env.MAX_MESSAGE_LENGTH || '5000', 10),
    maxMediaSize: parseInt(process.env.MAX_MEDIA_SIZE || '10485760', 10), // 10MB
    typingTimeout: parseInt(process.env.TYPING_TIMEOUT || '10000', 10), // 10 seconds
    messageRetentionDays: parseInt(process.env.MESSAGE_RETENTION_DAYS || '365', 10),
    maxConversationsPerPage: parseInt(process.env.MAX_CONVERSATIONS_PER_PAGE || '50', 10),
    maxMessagesPerPage: parseInt(process.env.MAX_MESSAGES_PER_PAGE || '50', 10),
  },

  // External Service URLs
  services: {
    matchingServiceUrl: process.env.MATCHING_SERVICE_URL || 'http://localhost:3009',
    userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    mediaServiceUrl: process.env.MEDIA_SERVICE_URL || 'http://localhost:3005',
  },

  // CORS Configuration
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: process.env.CORS_CREDENTIALS !== 'false',
  },

  // Realtime service configuration
  realtimeServiceUrl: process.env.REALTIME_SERVICE_URL || 'http://localhost:8081',
  serviceToken: process.env.SERVICE_TOKEN || 'dev-service-token-change-in-production',

  // Storage Configuration (for media/files)
  storage: {
    provider: process.env.STORAGE_PROVIDER || 'azure', // 'azure', 's3', 'local'
    azureStorageConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING || '',
    azureStorageContainer: process.env.AZURE_STORAGE_CONTAINER || 'messaging-media',
    s3Bucket: process.env.S3_BUCKET || '',
    s3Region: process.env.S3_REGION || 'us-east-1',
    localStoragePath: process.env.LOCAL_STORAGE_PATH || './uploads',
  },
};
