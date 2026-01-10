/**
 * API Configuration for Flamoral Web App
 *
 * This file centralizes API configuration and re-exports standardized endpoints
 * from the shared package for use throughout the web application.
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
export const API_CONFIG = {
  // Base URL from environment or default
  BASE_URL: import.meta.env.VITE_API_URL || '',

  // WebSocket URL
  WS_URL: import.meta.env.VITE_WS_URL || '',

  // Request timeouts (milliseconds)
  TIMEOUTS: {
    DEFAULT: 30000,
    UPLOAD: 120000,
    LONG_POLL: 60000,
  },

  // Retry configuration
  RETRY: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    BACKOFF_MULTIPLIER: 2,
  },

  // Feature flags for API behavior
  FEATURES: {
    CSRF_PROTECTION: true,
    AUTO_REFRESH_TOKEN: true,
    OFFLINE_QUEUE: false,
  },
} as const;

/**
 * Build a full API URL with the base URL
 */
export function buildApiUrl(endpoint: string): string {
  const baseUrl = API_CONFIG.BASE_URL;
  if (!baseUrl) return endpoint;
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
