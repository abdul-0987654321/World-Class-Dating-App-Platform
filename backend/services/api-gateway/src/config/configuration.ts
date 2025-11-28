export default () => ({
  port: parseInt(process.env.PORT, 10) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    accessSecret: process.env.JWT_ACCESS_SECRET || 'your-access-secret-key',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    accessTokenExpiry: process.env.JWT_ACCESS_TOKEN_EXPIRY || '24h',
    refreshTokenExpiry: process.env.JWT_REFRESH_TOKEN_EXPIRY || '30d',
  },

  // Service URLs
  services: {
    authService: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    userService: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    profileService: process.env.PROFILE_SERVICE_URL || 'http://localhost:3002', // Same as user service
    matchingService: process.env.MATCHING_SERVICE_URL || 'http://localhost:3003',
    messagingService: process.env.MESSAGING_SERVICE_URL || 'http://localhost:3004',
    notificationService: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005',
    mediaService: process.env.MEDIA_SERVICE_URL || 'http://localhost:3006',
    paymentService: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3007',
    moderationService: process.env.MODERATION_SERVICE_URL || 'http://localhost:3008',
    aiService: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  },

  // Internal service communication key
  internalServiceKey: process.env.INTERNAL_SERVICE_KEY || 'internal-service-key',

  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
  },

  // Rate limiting
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL, 10) || 60000,
    limit: parseInt(process.env.THROTTLE_LIMIT, 10) || 100,
  },

  // CORS
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  },
});
