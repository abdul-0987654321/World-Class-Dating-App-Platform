/**
 * API Configuration for Flamoral Mobile App
 * Centralized configuration for all backend service endpoints
 * FIXED VERSION - Uses ENV from config instead of process.env
 */

import { ENV } from '@config/env';

export const API_CONFIG = {
  // Base URLs for microservices
  BASE_URL: ENV.API_BASE_URL,

  // AI Services
  AI_SERVICES: {
    FRAUD_DETECTION: ENV.FRAUD_DETECTION_URL,
    NLP_SERVICE: ENV.NLP_SERVICE_URL,
    PHOTO_ANALYSIS: ENV.PHOTO_ANALYSIS_URL,
    RECOMMENDATION: ENV.RECOMMENDATION_URL,
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
    DEFAULT: ENV.API_TIMEOUT,
    UPLOAD: ENV.UPLOAD_TIMEOUT,
    AI_ANALYSIS: ENV.AI_ANALYSIS_TIMEOUT,
  },

  // Retry configuration
  RETRY: {
    MAX_RETRIES: ENV.MAX_RETRIES,
    RETRY_DELAY: ENV.RETRY_DELAY,
    BACKOFF_MULTIPLIER: ENV.BACKOFF_MULTIPLIER,
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
