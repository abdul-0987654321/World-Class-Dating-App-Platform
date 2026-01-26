/**
 * Wellness Service Configuration
 */

export default {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3031', 10),

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'flamoral_wellness',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || '',
    refreshSecret: process.env.JWT_REFRESH_SECRET || '',
  },

  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173').split(
    ','
  ),

  serviceApiKey: process.env.SERVICE_API_KEY || '',

  // Wellness-specific configuration
  wellness: {
    // Thresholds for wellness scoring
    healthyUsageMinutes: 30, // Healthy daily usage threshold
    maxDailyUsageMinutes: 120, // Warning threshold
    burnoutUsageMinutes: 180, // Critical threshold

    // Break recommendations
    minBreakDays: 2,
    recommendedBreakDays: 7,

    // Readiness assessment weights
    readinessWeights: {
      emotionalAvailability: 0.25,
      timeAvailability: 0.15,
      previousRelationshipRecovery: 0.2,
      communicationReadiness: 0.15,
      intentionalityScore: 0.15,
      selfAwarenessScore: 0.1,
    },
  },
};
