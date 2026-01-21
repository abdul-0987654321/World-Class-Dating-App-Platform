/**
 * API Configuration for Flamoral Mobile App
 *
 * This file centralizes API configuration and re-exports standardized endpoints
 * from the shared package for use throughout the mobile application.
 *
 * All API paths follow the pattern: /api/v1/{service}/{resource}
 */

// Re-export all endpoint constants from shared package
export {
  API_VERSION,
  API_PREFIX,
  AUTH_ENDPOINTS,
  USER_ENDPOINTS,
  PROFILE_ENDPOINTS,
  MATCH_ENDPOINTS,
  MESSAGE_ENDPOINTS,
  NOTIFICATION_ENDPOINTS,
  SUBSCRIPTION_ENDPOINTS,
  COIN_ENDPOINTS,
  DISCOVERY_ENDPOINTS,
  SAFETY_ENDPOINTS,
  BOOST_ENDPOINTS,
  GAMIFICATION_ENDPOINTS,
  COMMUNITY_ENDPOINTS,
  SPEED_DATING_ENDPOINTS,
  VIDEO_CHAT_ENDPOINTS,
  REFERRAL_ENDPOINTS,
  REPORT_ENDPOINTS,
  MODERATION_ENDPOINTS,
  ADMIN_ENDPOINTS,
  ADS_ENDPOINTS,
  POLICY_ENDPOINTS,
  PRIVACY_ENDPOINTS,
  LIMITS_ENDPOINTS,
  ENCRYPTION_ENDPOINTS,
  AI_ENDPOINTS,
  PAYMENT_ENDPOINTS,
  API_ENDPOINTS,
} from '@flamoral/shared/constants';

// Environment-specific configuration
// Note: All environment variables must use EXPO_PUBLIC_ prefix to be accessible at runtime in Expo
export const API_CONFIG = {
  // Base URL from environment or default
  BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.flamoral.com',

  // WebSocket URL
  WS_URL: process.env.EXPO_PUBLIC_WS_URL || 'wss://api.flamoral.com',

  // AI Services URLs (external microservices)
  AI_SERVICES: {
    FRAUD_DETECTION: process.env.EXPO_PUBLIC_FRAUD_DETECTION_URL || 'https://ai.flamoral.com/fraud',
    NLP_SERVICE: process.env.EXPO_PUBLIC_NLP_SERVICE_URL || 'https://ai.flamoral.com/nlp',
    PHOTO_ANALYSIS: process.env.EXPO_PUBLIC_PHOTO_ANALYSIS_URL || 'https://ai.flamoral.com/photos',
    RECOMMENDATION:
      process.env.EXPO_PUBLIC_RECOMMENDATION_URL || 'https://ai.flamoral.com/recommendations',
  },

  // Request timeouts (milliseconds)
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

  // Feature flags for API behavior
  FEATURES: {
    CERTIFICATE_PINNING: true,
    AUTO_REFRESH_TOKEN: true,
    OFFLINE_QUEUE: true,
    ENCRYPTED_STORAGE: true,
  },
} as const;

/**
 * Get authorization headers for API requests
 */
export const getAuthHeaders = (token: string): Record<string, string> => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
});

/**
 * Get multipart headers for file uploads
 */
export const getMultipartHeaders = (token: string): Record<string, string> => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'multipart/form-data',
});

/**
 * Build a full API URL with the base URL
 */
export function buildApiUrl(endpoint: string): string {
  const baseUrl = API_CONFIG.BASE_URL;
  if (!baseUrl || endpoint.startsWith('http')) return endpoint;
  return `${baseUrl}${endpoint}`;
}

/**
 * Build a WebSocket URL
 */
export function buildWsUrl(path: string = ''): string {
  const wsUrl = API_CONFIG.WS_URL;
  if (!wsUrl) return path;
  return `${wsUrl}${path}`;
}

// Type definitions
export type ApiConfig = typeof API_CONFIG;

// Legacy exports for backward compatibility with existing code
// These map to the new standardized service base paths
export const CORE_SERVICES = {
  AUTH: API_CONFIG.BASE_URL ? `${API_CONFIG.BASE_URL}/api/v1/auth` : '/api/v1/auth',
  USERS: API_CONFIG.BASE_URL ? `${API_CONFIG.BASE_URL}/api/v1/users` : '/api/v1/users',
  PROFILES: API_CONFIG.BASE_URL ? `${API_CONFIG.BASE_URL}/api/v1/profiles` : '/api/v1/profiles',
  MATCHING: API_CONFIG.BASE_URL ? `${API_CONFIG.BASE_URL}/api/v1/matches` : '/api/v1/matches',
  MESSAGING: API_CONFIG.BASE_URL ? `${API_CONFIG.BASE_URL}/api/v1/messages` : '/api/v1/messages',
  PAYMENTS: API_CONFIG.BASE_URL ? `${API_CONFIG.BASE_URL}/api/v1/payments` : '/api/v1/payments',
  NOTIFICATIONS: API_CONFIG.BASE_URL
    ? `${API_CONFIG.BASE_URL}/api/v1/notifications`
    : '/api/v1/notifications',
} as const;
