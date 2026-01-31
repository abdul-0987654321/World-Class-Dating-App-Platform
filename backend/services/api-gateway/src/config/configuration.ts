// Security: Validate required secrets in production
const validateSecrets = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const requiredSecrets = [
    'JWT_SECRET',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'INTERNAL_SERVICE_KEY',
  ];

  if (isProduction) {
    const missing = requiredSecrets.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`CRITICAL: Missing required secrets in production: ${missing.join(', ')}`);
    }
  }
};

validateSecrets();

export default () => ({
  port: parseInt(process.env.PORT, 10) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // JWT Configuration - SECURITY: No fallbacks in production
  jwt: {
    secret:
      process.env.JWT_SECRET ||
      (process.env.NODE_ENV === 'production'
        ? (() => {
            throw new Error('JWT_SECRET required');
          })()
        : 'dev-jwt-secret-min-32-chars-long!!'),
    accessSecret:
      process.env.JWT_ACCESS_SECRET ||
      (process.env.NODE_ENV === 'production'
        ? (() => {
            throw new Error('JWT_ACCESS_SECRET required');
          })()
        : 'dev-access-secret-min-32-chars!!'),
    refreshSecret:
      process.env.JWT_REFRESH_SECRET ||
      (process.env.NODE_ENV === 'production'
        ? (() => {
            throw new Error('JWT_REFRESH_SECRET required');
          })()
        : 'dev-refresh-secret-min-32-chars!'),
    accessTokenExpiry: process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d',
  },

  // Service URLs - Updated with correct port allocations matching railway.json
  // Services use Railway internal domains in production
  // Missing services will be logged as warnings, not fatal errors
  services: {
    authService: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    userService: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    profileService: process.env.PROFILE_SERVICE_URL || 'http://localhost:3003',
    matchingService: process.env.MATCHING_SERVICE_URL || 'http://localhost:3004',
    messagingService: process.env.MESSAGING_SERVICE_URL || 'http://localhost:3005',
    notificationService: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3006',
    paymentService: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3007',
    subscriptionService: process.env.SUBSCRIPTION_SERVICE_URL || 'http://localhost:3008',
    mediaService: process.env.MEDIA_SERVICE_URL || 'http://localhost:3009',
    moderationService: process.env.MODERATION_SERVICE_URL || 'http://localhost:3010',
    analyticsService: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3011',
    recommendationService: process.env.RECOMMENDATION_SERVICE_URL || 'http://localhost:3012',
    searchService: process.env.SEARCH_SERVICE_URL || 'http://localhost:3013',
    locationService: process.env.LOCATION_SERVICE_URL || 'http://localhost:3014',
    verificationService: process.env.VERIFICATION_SERVICE_URL || 'http://localhost:3015',
    adminService: process.env.ADMIN_SERVICE_URL || 'http://localhost:3017',
    realtimeService: process.env.REALTIME_SERVICE_URL || 'http://localhost:3022',
    advertisingService: process.env.ADVERTISING_SERVICE_URL || 'http://localhost:3025',
    aiService: process.env.AI_SERVICE_URL || 'http://localhost:8000',
    // New services
    wellnessService: process.env.WELLNESS_SERVICE_URL || 'http://localhost:3031',
    conversationIntelligenceService:
      process.env.CONVERSATION_INTELLIGENCE_SERVICE_URL || 'http://localhost:3032',
    relationshipProgressionService:
      process.env.RELATIONSHIP_PROGRESSION_SERVICE_URL || 'http://localhost:3033',
    trustService: process.env.TRUST_SERVICE_URL || 'http://localhost:3034',
  },

  // Internal service communication key - SECURITY: No fallback in production
  internalServiceKey:
    process.env.INTERNAL_SERVICE_KEY ||
    (process.env.NODE_ENV === 'production'
      ? (() => {
          throw new Error('INTERNAL_SERVICE_KEY required');
        })()
      : 'dev-internal-service-key-32chars!'),

  // Database Pool Configuration
  database: {
    pool: {
      min: parseInt(process.env.DB_POOL_MIN, 10) || 2,
      max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,
    },
  },

  // Redis Configuration - Uses Railway Redis service
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB, 10) || 0,
    url: process.env.REDIS_URL,
  },

  // Rate limiting
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL, 10) || 60000, // 1 minute
    limit: parseInt(process.env.THROTTLE_LIMIT, 10) || 100, // 100 requests per minute
  },

  // Advanced rate limiting
  rateLimit: {
    // Per user limits
    user: {
      points: parseInt(process.env.RATE_LIMIT_USER_POINTS, 10) || 1000, // 1000 requests
      duration: parseInt(process.env.RATE_LIMIT_USER_DURATION, 10) || 900, // per 15 minutes
      blockDuration: parseInt(process.env.RATE_LIMIT_USER_BLOCK, 10) || 300, // block for 5 minutes
    },
    // Per IP limits
    ip: {
      points: parseInt(process.env.RATE_LIMIT_IP_POINTS, 10) || 500, // 500 requests
      duration: parseInt(process.env.RATE_LIMIT_IP_DURATION, 10) || 900, // per 15 minutes
      blockDuration: parseInt(process.env.RATE_LIMIT_IP_BLOCK, 10) || 600, // block for 10 minutes
    },
    // Auth endpoints (stricter)
    auth: {
      points: parseInt(process.env.RATE_LIMIT_AUTH_POINTS, 10) || 5, // 5 requests
      duration: parseInt(process.env.RATE_LIMIT_AUTH_DURATION, 10) || 900, // per 15 minutes
      blockDuration: parseInt(process.env.RATE_LIMIT_AUTH_BLOCK, 10) || 3600, // block for 1 hour
    },
  },

  // Circuit Breaker Configuration
  circuitBreaker: {
    failureThreshold: parseInt(process.env.CIRCUIT_FAILURE_THRESHOLD, 10) || 5,
    successThreshold: parseInt(process.env.CIRCUIT_SUCCESS_THRESHOLD, 10) || 2,
    timeout: parseInt(process.env.CIRCUIT_TIMEOUT, 10) || 60000, // 1 minute
    resetTimeout: parseInt(process.env.CIRCUIT_RESET_TIMEOUT, 10) || 300000, // 5 minutes
  },

  // Service Timeouts
  serviceTimeouts: {
    default: parseInt(process.env.SERVICE_TIMEOUT_DEFAULT, 10) || 30000, // 30 seconds
    auth: parseInt(process.env.SERVICE_TIMEOUT_AUTH, 10) || 10000, // 10 seconds
    media: parseInt(process.env.SERVICE_TIMEOUT_MEDIA, 10) || 60000, // 60 seconds
    payment: parseInt(process.env.SERVICE_TIMEOUT_PAYMENT, 10) || 45000, // 45 seconds
  },

  // CORS - SECURITY: Always include production domains
  cors: {
    origins:
      process.env.CORS_ORIGINS?.split(',') ||
      (process.env.NODE_ENV === 'production'
        ? [
            'https://flamoral.com',
            'https://www.flamoral.com',
            'https://app.flamoral.com',
            'https://api.flamoral.com',
          ]
        : ['http://localhost:3000', 'http://localhost:5173']),
    credentials: process.env.CORS_CREDENTIALS !== 'false', // Default to true for cookie-based auth
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },

  // Tracing
  tracing: {
    enabled: process.env.TRACING_ENABLED === 'true',
    serviceName: process.env.TRACING_SERVICE_NAME || 'api-gateway',
    jaegerEndpoint: process.env.JAEGER_ENDPOINT,
    samplingRate: parseFloat(process.env.TRACING_SAMPLING_RATE) || 0.1,
  },

  // Metrics
  metrics: {
    enabled: process.env.METRICS_ENABLED === 'true',
    port: parseInt(process.env.METRICS_PORT, 10) || 9090,
  },
});
