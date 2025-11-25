export default {
  port: parseInt(process.env.PORT || '3003', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  jwt: {
    secret: process.env.JWT_ACCESS_SECRET || 'dev-secret-key',
  },

  cosmos: {
    endpoint: process.env.COSMOS_ENDPOINT || '',
    key: process.env.COSMOS_KEY || '',
    databaseId: process.env.COSMOS_DATABASE_ID || 'ConnectSphere',
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
    key: process.env.ENCRYPTION_KEY || 'dev-encryption-key-32-characters',
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

  services: {
    matchingServiceUrl: process.env.MATCHING_SERVICE_URL || 'http://localhost:3002',
    userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:3001',
  },

  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  },
};
