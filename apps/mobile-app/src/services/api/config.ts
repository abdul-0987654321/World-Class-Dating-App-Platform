/**
 * API Configuration for ConnectSphere Mobile App
 * Centralized configuration for all backend service endpoints
 */

export const API_CONFIG = {
  // Base URLs for microservices
  BASE_URL: process.env.API_BASE_URL || 'https://api.connectsphere.com',

  // AI Services
  AI_SERVICES: {
    FRAUD_DETECTION: process.env.FRAUD_DETECTION_URL || 'https://ai.connectsphere.com/fraud',
    NLP_SERVICE: process.env.NLP_SERVICE_URL || 'https://ai.connectsphere.com/nlp',
    PHOTO_ANALYSIS: process.env.PHOTO_ANALYSIS_URL || 'https://ai.connectsphere.com/photos',
    RECOMMENDATION: process.env.RECOMMENDATION_URL || 'https://ai.connectsphere.com/recommendations',
  },

  // Core Services
  CORE_SERVICES: {
    AUTH: '/api/v1/auth',
    USERS: '/api/v1/users',
    PROFILES: '/api/v1/profiles',
    MATCHING: '/api/v1/matching',
    MESSAGING: '/api/v1/messaging',
    PAYMENTS: '/api/v1/payments',
    NOTIFICATIONS: '/api/v1/notifications',
  },

  // Timeouts (ms)
  TIMEOUTS: {
    DEFAULT: 30000,
    UPLOAD: 120000,
    AI_ANALYSIS: 60000,
  },

  // Retry configuration
  RETRY: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    BACKOFF_MULTIPLIER: 2,
  },
};

export const getAuthHeaders = (token: string): Record<string, string> => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
});

export const getMultipartHeaders = (token: string): Record<string, string> => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'multipart/form-data',
});
