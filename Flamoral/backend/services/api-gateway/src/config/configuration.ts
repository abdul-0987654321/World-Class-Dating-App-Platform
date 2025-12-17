// Security: Validate required secrets in production
const validateSecrets = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const requiredSecrets = ['JWT_SECRET', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'INTERNAL_SERVICE_KEY'];

  if (isProduction) {
    const missing = requiredSecrets.filter(key => !process.env[key]);
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
    secret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? (() => { throw new Error('JWT_SECRET required'); })() : 'dev-jwt-secret-min-32-chars-long!!'),
    accessSecret: process.env.JWT_ACCESS_SECRET || (process.env.NODE_ENV === 'production' ? (() => { throw new Error('JWT_ACCESS_SECRET required'); })() : 'dev-access-secret-min-32-chars!!'),
    refreshSecret: process.env.JWT_REFRESH_SECRET || (process.env.NODE_ENV === 'production' ? (() => { throw new Error('JWT_REFRESH_SECRET required'); })() : 'dev-refresh-secret-min-32-chars!'),
    accessTokenExpiry: process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d',
    algorithm: 'HS256', // Explicit algorithm to prevent algorithm confusion attacks
    issuer: process.env.JWT_ISSUER || 'flamoral-auth-service',
    audience: process.env.JWT_AUDIENCE || 'flamoral-platform',
  },

  // Service URLs - Updated with correct port allocations
  services: {
    authService: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    userService: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    profileService: process.env.PROFILE_SERVICE_URL || 'http://localhost:3002', // Same as user service
    messagingService: process.env.MESSAGING_SERVICE_URL || 'http://localhost:3003',
    mediaService: process.env.MEDIA_SERVICE_URL || 'http://localhost:3004',
    moderationService: process.env.MODERATION_SERVICE_URL || 'http://localhost:3005',
    paymentService: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3006',
    analyticsService: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3007',
    notificationService: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3008',
    matchingService: process.env.MATCHING_SERVICE_URL || 'http://localhost:3009',
    advertisingService: process.env.ADVERTISING_SERVICE_URL || 'http://localhost:3010',
    aiService: process.env.AI_SERVICE_URL || 'http://localhost:8000',
    adminService: process.env.ADMIN_SERVICE_URL || 'http://localhost:3011',
  },

  // Internal service communication key - SECURITY: No fallback in production
  internalServiceKey: process.env.INTERNAL_SERVICE_KEY || (process.env.NODE_ENV === 'production' ? (() => { throw new Error('INTERNAL_SERVICE_KEY required'); })() : 'dev-internal-service-key-32chars!'),

  // Redis Configuration
  redis: {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
    tls: process.env.REDIS_TLS === 'true' ? {
      servername: process.env.REDIS_HOST,
      rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== 'false',
    } : undefined,
    retryStrategy: (times: number) => {
      const maxRetries = parseInt(process.env.REDIS_MAX_RETRIES, 10) || 3;
      if (times > maxRetries) return null;
      return Math.min(times * 50, 2000);
    },
    connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT, 10) || 10000,
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

  // Circuit Breaker Configuration - Production-hardened settings
  // These settings control when the circuit breaker opens/closes to protect downstream services
  circuitBreaker: {
    // Failure thresholds - trigger circuit opening when exceeded
    failureThreshold: parseInt(process.env.CIRCUIT_FAILURE_THRESHOLD, 10) || 5, // Open after 5 failures (faster response)
    failureRateThreshold: parseInt(process.env.CIRCUIT_FAILURE_RATE_THRESHOLD, 10) || 50, // Or when 50% of requests fail

    // Recovery settings - control how the circuit recovers
    successThreshold: parseInt(process.env.CIRCUIT_SUCCESS_THRESHOLD, 10) || 5, // Need 5 consecutive successes to close in HALF_OPEN
    timeout: parseInt(process.env.CIRCUIT_TIMEOUT, 10) || 15000, // Wait 15s before attempting HALF_OPEN (faster recovery)
    resetTimeout: parseInt(process.env.CIRCUIT_RESET_TIMEOUT, 10) || 60000, // Reset failure count after 60s of success

    // Minimum request volume - prevents circuit opening on low traffic
    minimumRequests: parseInt(process.env.CIRCUIT_MINIMUM_REQUESTS, 10) || 5, // Evaluate after just 5 requests (faster response)

    // Slow call detection - treat slow calls as potential failures
    slowCallThreshold: parseInt(process.env.CIRCUIT_SLOW_CALL_THRESHOLD, 10) || 5000, // Calls taking >5s are "slow"
    slowCallRateThreshold: parseInt(process.env.CIRCUIT_SLOW_CALL_RATE_THRESHOLD, 10) || 80, // Open if 80% of calls are slow

    // Half-open state - gradual recovery testing
    halfOpenMaxCalls: parseInt(process.env.CIRCUIT_HALF_OPEN_MAX_CALLS, 10) || 10, // Allow 10 concurrent test calls in HALF_OPEN

    // Sliding window - for calculating failure/success rates
    slidingWindowSize: parseInt(process.env.CIRCUIT_SLIDING_WINDOW_SIZE, 10) || 100, // Track last 100 requests for metrics
  },

  // Service Timeouts - Hierarchical: NGINX > Gateway > Service > DB
  serviceTimeouts: {
    default: parseInt(process.env.SERVICE_TIMEOUT_DEFAULT, 10) || 15000, // 15 seconds
    auth: parseInt(process.env.SERVICE_TIMEOUT_AUTH, 10) || 5000, // 5 seconds (fast)
    user: parseInt(process.env.SERVICE_TIMEOUT_USER, 10) || 10000, // 10 seconds
    messaging: parseInt(process.env.SERVICE_TIMEOUT_MESSAGING, 10) || 15000, // 15 seconds
    media: parseInt(process.env.SERVICE_TIMEOUT_MEDIA, 10) || 45000, // 45 seconds (uploads)
    moderation: parseInt(process.env.SERVICE_TIMEOUT_MODERATION, 10) || 20000, // 20 seconds (AI)
    payment: parseInt(process.env.SERVICE_TIMEOUT_PAYMENT, 10) || 30000, // 30 seconds
    matching: parseInt(process.env.SERVICE_TIMEOUT_MATCHING, 10) || 15000, // 15 seconds
    ai: parseInt(process.env.SERVICE_TIMEOUT_AI, 10) || 30000, // 30 seconds (inference)
    admin: parseInt(process.env.SERVICE_TIMEOUT_ADMIN, 10) || 15000, // 15 seconds
  },

  // Retry Configuration
  retry: {
    maxRetries: parseInt(process.env.PROXY_MAX_RETRIES, 10) || 1, // Max 1 retry for faster failure response
    retryDelay: parseInt(process.env.PROXY_RETRY_DELAY, 10) || 500, // 500ms initial delay
    retryableStatusCodes: [502, 503, 504], // Only gateway errors
  },

  // CORS
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'https://flamoral.com',
      'https://www.flamoral.com',
      'https://admin.flamoral.com',
      'https://app.flamoral.com',
      'https://*.flamoral.com',
    ],
    credentials: process.env.CORS_CREDENTIALS !== 'false', // Default to true
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
