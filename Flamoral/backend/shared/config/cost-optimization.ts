/**
 * Cost Optimization Configuration
 * Shared configuration for reducing operational costs across all services
 */

export const CostOptimizationConfig = {
  /**
   * API Rate Limiting - Prevent abuse and reduce API costs
   */
  rateLimiting: {
    // Standard rate limits
    standard: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 60, // 60 requests per minute per user
    },
    // Strict rate limits for expensive operations
    expensive: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10, // 10 requests per minute
    },
    // AI/ML service rate limits
    aiServices: {
      windowMs: 60 * 1000,
      maxRequests: 20, // 20 AI requests per minute
    },
    // External API rate limits
    externalApi: {
      windowMs: 60 * 1000,
      maxRequests: 30, // Conservative limit for external APIs
    },
  },

  /**
   * Request Batching - Batch operations to reduce API calls
   */
  batching: {
    // Database query batching
    database: {
      batchSize: 100, // Maximum items per batch
      batchInterval: 50, // ms - wait time before executing batch
      maxWaitTime: 200, // ms - maximum wait time for batch
    },
    // Notification batching
    notifications: {
      batchSize: 500, // Send notifications in batches of 500
      batchInterval: 2000, // 2 seconds
      maxWaitTime: 5000, // 5 seconds max wait
    },
    // Analytics event batching
    analytics: {
      batchSize: 1000, // Batch analytics events
      batchInterval: 5000, // 5 seconds
      maxWaitTime: 10000, // 10 seconds max wait
    },
    // Email batching
    email: {
      batchSize: 100,
      batchInterval: 3000, // 3 seconds
      maxWaitTime: 10000, // 10 seconds
    },
  },

  /**
   * External API Caching - Cache expensive API results
   */
  caching: {
    // Azure Cognitive Services caching
    azureCognitive: {
      faceDetection: {
        ttl: 24 * 60 * 60, // 24 hours (faces don't change often)
        maxSize: 10000, // Cache up to 10k results
      },
      contentModeration: {
        ttl: 7 * 24 * 60 * 60, // 7 days (content doesn't change)
        maxSize: 50000,
      },
      imageAnalysis: {
        ttl: 24 * 60 * 60, // 24 hours
        maxSize: 10000,
      },
    },
    // Stripe API caching
    stripe: {
      customer: {
        ttl: 60 * 60, // 1 hour
        maxSize: 5000,
      },
      subscription: {
        ttl: 5 * 60, // 5 minutes
        maxSize: 5000,
      },
      price: {
        ttl: 24 * 60 * 60, // 24 hours (prices rarely change)
        maxSize: 1000,
      },
      product: {
        ttl: 24 * 60 * 60, // 24 hours
        maxSize: 1000,
      },
    },
    // AWS Rekognition caching
    awsRekognition: {
      moderationLabels: {
        ttl: 7 * 24 * 60 * 60, // 7 days
        maxSize: 50000,
      },
      faceDetection: {
        ttl: 24 * 60 * 60, // 24 hours
        maxSize: 10000,
      },
    },
    // SendGrid/Twilio caching
    messaging: {
      templates: {
        ttl: 60 * 60, // 1 hour
        maxSize: 500,
      },
      deliveryStatus: {
        ttl: 5 * 60, // 5 minutes
        maxSize: 10000,
      },
    },
  },

  /**
   * Circuit Breaker - Prevent retry storms
   */
  circuitBreaker: {
    // General external API circuit breaker
    externalApi: {
      failureThreshold: 5, // Open circuit after 5 failures
      successThreshold: 2, // Close after 2 successes
      timeout: 30000, // 30 seconds timeout
      resetTimeout: 60000, // 1 minute before attempting again
    },
    // Azure services circuit breaker
    azureServices: {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 20000, // 20 seconds
      resetTimeout: 120000, // 2 minutes
    },
    // AWS services circuit breaker
    awsServices: {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 20000,
      resetTimeout: 120000,
    },
    // Payment gateway circuit breaker
    paymentGateway: {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 30000,
      resetTimeout: 180000, // 3 minutes
    },
    // Messaging services circuit breaker
    messagingServices: {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 15000,
      resetTimeout: 60000,
    },
  },

  /**
   * Graceful Degradation - Disable non-essential features under load
   */
  gracefulDegradation: {
    // CPU threshold to trigger degradation (percentage)
    cpuThreshold: 80,
    // Memory threshold to trigger degradation (percentage)
    memoryThreshold: 85,
    // Features to disable under high load (priority order)
    disableFeatures: [
      'analytics-events', // Disable analytics first
      'email-notifications', // Disable non-critical emails
      'push-notifications-non-urgent', // Disable non-urgent push
      'ai-recommendations', // Disable AI features
      'image-optimization', // Disable image processing
      'advanced-search', // Disable expensive queries
    ],
    // Queue non-critical operations
    queueOperations: [
      'profile-views',
      'like-notifications',
      'visit-tracking',
      'analytics-aggregation',
      'cache-warming',
    ],
  },

  /**
   * WebSocket Optimization - Reduce connection costs
   */
  websocket: {
    // Connection pooling
    connectionPool: {
      maxConnections: 10000, // Maximum concurrent connections
      idleTimeout: 5 * 60 * 1000, // 5 minutes idle timeout
      heartbeatInterval: 30 * 1000, // 30 seconds heartbeat
      heartbeatTimeout: 60 * 1000, // 60 seconds timeout
    },
    // Message compression
    compression: {
      enabled: true,
      threshold: 1024, // Compress messages > 1KB
      level: 6, // Compression level (1-9, 6 is balanced)
    },
    // Message batching
    messageBatching: {
      enabled: true,
      batchSize: 10, // Batch up to 10 messages
      batchInterval: 100, // 100ms batch window
    },
    // Presence optimization
    presence: {
      updateThrottle: 30 * 1000, // Update presence every 30s max
      batchUpdates: true,
      batchInterval: 5000, // 5 seconds
    },
  },

  /**
   * Database Connection Pooling - Optimize database costs
   */
  database: {
    // Connection pool configuration
    pool: {
      min: 2, // Minimum connections
      max: 10, // Maximum connections
      acquireTimeoutMillis: 30000, // 30 seconds
      idleTimeoutMillis: 30000, // Close idle connections after 30s
      reapIntervalMillis: 1000, // Check for idle connections every 1s
    },
    // Query optimization
    queryOptimization: {
      enableQueryCache: true,
      queryCacheTTL: 60, // 1 minute
      maxQueryCacheSize: 1000,
      enablePreparedStatements: true,
    },
  },

  /**
   * Media Processing Optimization
   */
  mediaProcessing: {
    // Lazy loading for media processing
    lazyProcessing: {
      enabled: true,
      deferThumbnails: false, // Generate thumbnails immediately
      deferOptimization: true, // Defer full optimization
      deferVariants: true, // Defer variant generation
    },
    // Queue configuration
    queueConcurrency: {
      imageProcessing: 5, // Process 5 images concurrently
      videoProcessing: 2, // Process 2 videos concurrently (expensive)
      thumbnailGeneration: 10, // Fast operation, higher concurrency
    },
    // Cache processed media
    processedMediaCache: {
      ttl: 30 * 24 * 60 * 60, // 30 days
      maxSize: 100000,
    },
  },

  /**
   * Request Deduplication - Prevent duplicate expensive operations
   */
  deduplication: {
    enabled: true,
    // Time window for deduplication (ms)
    window: 1000, // 1 second
    // Keys to use for deduplication
    keys: ['userId', 'action', 'params'],
    // Maximum dedupe cache size
    maxCacheSize: 10000,
  },

  /**
   * Monitoring and Alerting Thresholds
   */
  monitoring: {
    // Cost thresholds for alerting
    costAlerts: {
      dailyThreshold: 100, // Alert if daily cost > $100
      monthlyThreshold: 2000, // Alert if monthly cost > $2000
      apiCallThreshold: 100000, // Alert if API calls > 100k/day
    },
    // Performance degradation alerts
    performanceAlerts: {
      responseTimeThreshold: 1000, // Alert if p95 > 1s
      errorRateThreshold: 0.01, // Alert if error rate > 1%
      circuitBreakerThreshold: 3, // Alert after 3 circuit breaks/hour
    },
  },
};

export default CostOptimizationConfig;
