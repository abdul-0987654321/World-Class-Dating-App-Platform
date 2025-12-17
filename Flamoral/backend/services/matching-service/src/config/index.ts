export default {
  port: parseInt(process.env.PORT || '3009', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'matching_service_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },

  jwt: {
    secret: process.env.JWT_ACCESS_SECRET || 'dev-secret-key',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
  },

  services: {
    userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3012',
    analyticsServiceUrl: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3007',
  },

  matching: {
    minCompatibilityScore: parseInt(process.env.MIN_COMPATIBILITY_SCORE || '30', 10),
    defaultRecommendationLimit: parseInt(process.env.DEFAULT_RECOMMENDATION_LIMIT || '20', 10),
    maxDistanceKm: parseInt(process.env.MAX_DISTANCE_KM || '100', 10),
    cacheExpirationMinutes: parseInt(process.env.CACHE_EXPIRATION_MINUTES || '60', 10),

    // Algorithm weights (must sum to 1.0)
    weights: {
      distance: parseFloat(process.env.WEIGHT_DISTANCE || '0.30'),
      interests: parseFloat(process.env.WEIGHT_INTERESTS || '0.25'),
      activity: parseFloat(process.env.WEIGHT_ACTIVITY || '0.15'),
      preferences: parseFloat(process.env.WEIGHT_PREFERENCES || '0.30'),
    },

    // Premium features
    premiumBoostMultiplier: parseFloat(process.env.PREMIUM_BOOST_MULTIPLIER || '1.1'),

    // Scoring thresholds
    minDistanceScoreKm: parseInt(process.env.MIN_DISTANCE_SCORE_KM || '5', 10),
    maxDistanceScoreKm: parseInt(process.env.MAX_DISTANCE_SCORE_KM || '100', 10),

    // Interest matching
    minSharedInterests: parseInt(process.env.MIN_SHARED_INTERESTS || '1', 10),
    interestAmplificationFactor: parseFloat(process.env.INTEREST_AMPLIFICATION_FACTOR || '1.5'),
  },
};
