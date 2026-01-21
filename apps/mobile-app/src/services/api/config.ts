/**
 * API Configuration for Flamoral Mobile App
 * Centralized configuration for all backend service endpoints
 */

export const API_CONFIG = {
  // Base URLs for microservices
  BASE_URL:
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    'https://world-class-dating-app-platform-production.up.railway.app',

  // AI Services (using EXPO_PUBLIC_ prefix for runtime access)
  AI_SERVICES: {
    FRAUD_DETECTION: process.env.EXPO_PUBLIC_FRAUD_DETECTION_URL || 'https://ai.flamoral.com/fraud',
    NLP_SERVICE: process.env.EXPO_PUBLIC_NLP_SERVICE_URL || 'https://ai.flamoral.com/nlp',
    PHOTO_ANALYSIS: process.env.EXPO_PUBLIC_PHOTO_ANALYSIS_URL || 'https://ai.flamoral.com/photos',
    RECOMMENDATION:
      process.env.EXPO_PUBLIC_RECOMMENDATION_URL || 'https://ai.flamoral.com/recommendations',
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
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
});

export const getMultipartHeaders = (token: string): Record<string, string> => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'multipart/form-data',
});

// Export commonly used constants
export const API_BASE_URL = API_CONFIG.BASE_URL;
export const WS_BASE_URL =
  process.env.EXPO_PUBLIC_WS_URL ||
  'wss://world-class-dating-app-platform-production.up.railway.app';
export const MESSAGING_SERVICE_URL =
  process.env.EXPO_PUBLIC_MESSAGING_SERVICE_URL || 'http://localhost:3003';

export default API_CONFIG;
