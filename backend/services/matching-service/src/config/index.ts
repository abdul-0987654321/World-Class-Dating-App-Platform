export default {
  port: parseInt(process.env.PORT || '3002', 10),
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
    userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3008',
    analyticsServiceUrl: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3007',
  },

  matching: {
    minCompatibilityScore: parseInt(process.env.MIN_COMPATIBILITY_SCORE || '30', 10),
    defaultRecommendationLimit: parseInt(process.env.DEFAULT_RECOMMENDATION_LIMIT || '20', 10),
    maxDistanceKm: parseInt(process.env.MAX_DISTANCE_KM || '100', 10),
  },
};
