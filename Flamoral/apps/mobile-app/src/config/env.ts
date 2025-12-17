/**
 * Environment Configuration
 * Handles environment variables for the mobile app
 * Note: In React Native, environment variables are baked in at build time
 * This uses react-native-dotenv for environment variable loading
 */

// Import environment variables from @env (configured via babel-plugin-module-resolver)
declare module '@env' {
  export const API_BASE_URL: string;
  export const WEBSOCKET_URL: string;
  export const GRAPHQL_URL: string;
  export const FRAUD_DETECTION_URL: string;
  export const NLP_SERVICE_URL: string;
  export const PHOTO_ANALYSIS_URL: string;
  export const RECOMMENDATION_URL: string;
  export const EXPO_PUBLIC_MESSAGING_SERVICE_URL: string;
  export const APP_NAME: string;
  export const APP_VERSION: string;
  export const APP_ENV: string;
  export const BUNDLE_ID: string;
  export const IOS_BUNDLE_ID: string;
  export const ANDROID_PACKAGE: string;
  export const DEEP_LINK_SCHEME: string;
  export const UNIVERSAL_LINK_DOMAIN: string;
  export const ENABLE_VIDEO_CALLS: string;
  export const ENABLE_VOICE_CALLS: string;
  export const ENABLE_EVENTS: string;
  export const ENABLE_AI_FEATURES: string;
  export const ENABLE_STORIES: string;
  export const ENABLE_TRAVEL_MODE: string;
  export const ENABLE_PREMIUM_SUBSCRIPTIONS: string;
  export const ENABLE_BOOSTS: string;
  export const ENABLE_SUPER_LIKES: string;
  export const ENABLE_VIRTUAL_GIFTS: string;
  export const ENABLE_PHOTO_VERIFICATION: string;
  export const ENABLE_ID_VERIFICATION: string;
  export const ENABLE_BACKGROUND_CHECKS: string;
  export const ENABLE_ENCRYPTION: string;
  export const ENABLE_BIOMETRIC_AUTH: string;
  export const ENABLE_PUSH_NOTIFICATIONS: string;
  export const ENABLE_LOCATION_SERVICES: string;
  export const ENABLE_GAMIFICATION: string;
  export const ENABLE_AI_COACH: string;
  export const ENABLE_AR_FEATURES: string;
  export const ENABLE_BLOCKCHAIN_VERIFICATION: string;
  export const DEBUG_MODE: string;
  export const LOG_LEVEL: string;
  export const ENABLE_DEBUG_MENU: string;
  export const ENABLE_FLIPPER: string;
  export const API_TIMEOUT: string;
  export const UPLOAD_TIMEOUT: string;
  export const AI_ANALYSIS_TIMEOUT: string;
  export const MAX_RETRIES: string;
  export const RETRY_DELAY: string;
  export const BACKOFF_MULTIPLIER: string;
  export const IMAGE_QUALITY: string;
  export const IMAGE_MAX_SIZE: string;
  export const ENABLE_IMAGE_COMPRESSION: string;
  export const ENCRYPTION_KEY_ALIAS: string;
  export const USE_KEYCHAIN: string;
  export const USE_KEYSTORE: string;
  export const ENABLE_SSL_PINNING: string;
  export const SSL_PINNING_MODE: string;
  export const ENABLE_ROOT_DETECTION: string;
  export const ENABLE_JAILBREAK_DETECTION: string;
  export const DEFAULT_LANGUAGE: string;
  export const SUPPORTED_LANGUAGES: string;
  export const DATE_FORMAT: string;
  export const TIME_FORMAT: string;
  export const CDN_URL: string;
  export const MEDIA_CDN_URL: string;
  export const ENABLE_OFFLINE_MODE: string;
  export const OFFLINE_CACHE_SIZE: string;
  export const OFFLINE_CACHE_DURATION: string;
  export const TERMS_URL: string;
  export const PRIVACY_URL: string;
  export const COOKIE_POLICY_URL: string;
  export const COMMUNITY_GUIDELINES_URL: string;
  export const SUPPORT_EMAIL: string;
  export const SUPPORT_URL: string;
  export const HELP_CENTER_URL: string;
}

// Helper function to get environment variable
const getEnvVar = (key: string, defaultValue: string = ''): string => {
  try {
    // @ts-ignore - dynamic import from @env
    const envModule = require('@env');
    return envModule[key] || defaultValue;
  } catch (error) {
    return defaultValue;
  }
};

const getBooleanEnvVar = (key: string, defaultValue: boolean = false): boolean => {
  const value = getEnvVar(key, String(defaultValue));
  return value === 'true' || value === '1' || value === 'yes';
};

const getNumberEnvVar = (key: string, defaultValue: number = 0): number => {
  const value = getEnvVar(key, String(defaultValue));
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

export const ENV = {
  // API Configuration
  API_BASE_URL: getEnvVar('API_BASE_URL', 'https://api.flamoral.com'),
  WEBSOCKET_URL: getEnvVar('WEBSOCKET_URL', 'wss://api.flamoral.com'),
  GRAPHQL_URL: getEnvVar('GRAPHQL_URL', 'https://api.flamoral.com/graphql'),

  // AI Services
  FRAUD_DETECTION_URL: getEnvVar('FRAUD_DETECTION_URL', 'https://api.flamoral.com/ai/fraud'),
  NLP_SERVICE_URL: getEnvVar('NLP_SERVICE_URL', 'https://api.flamoral.com/ai/nlp'),
  PHOTO_ANALYSIS_URL: getEnvVar('PHOTO_ANALYSIS_URL', 'https://api.flamoral.com/ai/photos'),
  RECOMMENDATION_URL: getEnvVar('RECOMMENDATION_URL', 'https://api.flamoral.com/ai/recommendations'),

  // Messaging Service
  MESSAGING_SERVICE_URL: getEnvVar('EXPO_PUBLIC_MESSAGING_SERVICE_URL', 'https://api.flamoral.com/messaging'),

  // App Configuration
  APP_NAME: getEnvVar('APP_NAME', 'Flamoral'),
  APP_VERSION: getEnvVar('APP_VERSION', '1.0.0'),
  APP_ENV: getEnvVar('APP_ENV', 'production'),

  // Bundle Identifiers
  BUNDLE_ID: getEnvVar('BUNDLE_ID', 'com.flamoral'),
  IOS_BUNDLE_ID: getEnvVar('IOS_BUNDLE_ID', 'com.flamoral'),
  ANDROID_PACKAGE: getEnvVar('ANDROID_PACKAGE', 'com.flamoral'),

  // Deep Linking
  DEEP_LINK_SCHEME: getEnvVar('DEEP_LINK_SCHEME', 'flamoral'),
  UNIVERSAL_LINK_DOMAIN: getEnvVar('UNIVERSAL_LINK_DOMAIN', 'flamoral.com'),

  // Feature Flags
  ENABLE_VIDEO_CALLS: getBooleanEnvVar('ENABLE_VIDEO_CALLS', true),
  ENABLE_VOICE_CALLS: getBooleanEnvVar('ENABLE_VOICE_CALLS', true),
  ENABLE_EVENTS: getBooleanEnvVar('ENABLE_EVENTS', true),
  ENABLE_AI_FEATURES: getBooleanEnvVar('ENABLE_AI_FEATURES', true),
  ENABLE_STORIES: getBooleanEnvVar('ENABLE_STORIES', true),
  ENABLE_TRAVEL_MODE: getBooleanEnvVar('ENABLE_TRAVEL_MODE', true),

  // Premium Features
  ENABLE_PREMIUM_SUBSCRIPTIONS: getBooleanEnvVar('ENABLE_PREMIUM_SUBSCRIPTIONS', true),
  ENABLE_BOOSTS: getBooleanEnvVar('ENABLE_BOOSTS', true),
  ENABLE_SUPER_LIKES: getBooleanEnvVar('ENABLE_SUPER_LIKES', true),
  ENABLE_VIRTUAL_GIFTS: getBooleanEnvVar('ENABLE_VIRTUAL_GIFTS', true),

  // Safety Features
  ENABLE_PHOTO_VERIFICATION: getBooleanEnvVar('ENABLE_PHOTO_VERIFICATION', true),
  ENABLE_ID_VERIFICATION: getBooleanEnvVar('ENABLE_ID_VERIFICATION', true),
  ENABLE_BACKGROUND_CHECKS: getBooleanEnvVar('ENABLE_BACKGROUND_CHECKS', true),
  ENABLE_ENCRYPTION: getBooleanEnvVar('ENABLE_ENCRYPTION', true),

  // Native Features
  ENABLE_BIOMETRIC_AUTH: getBooleanEnvVar('ENABLE_BIOMETRIC_AUTH', true),
  ENABLE_PUSH_NOTIFICATIONS: getBooleanEnvVar('ENABLE_PUSH_NOTIFICATIONS', true),
  ENABLE_LOCATION_SERVICES: getBooleanEnvVar('ENABLE_LOCATION_SERVICES', true),

  // Experimental Features
  ENABLE_GAMIFICATION: getBooleanEnvVar('ENABLE_GAMIFICATION', true),
  ENABLE_AI_COACH: getBooleanEnvVar('ENABLE_AI_COACH', true),
  ENABLE_AR_FEATURES: getBooleanEnvVar('ENABLE_AR_FEATURES', false),
  ENABLE_BLOCKCHAIN_VERIFICATION: getBooleanEnvVar('ENABLE_BLOCKCHAIN_VERIFICATION', false),

  // Debug & Development
  DEBUG_MODE: getBooleanEnvVar('DEBUG_MODE', false),
  LOG_LEVEL: getEnvVar('LOG_LEVEL', 'error'),
  ENABLE_DEBUG_MENU: getBooleanEnvVar('ENABLE_DEBUG_MENU', false),
  ENABLE_FLIPPER: getBooleanEnvVar('ENABLE_FLIPPER', false),

  // Performance Configuration
  API_TIMEOUT: getNumberEnvVar('API_TIMEOUT', 30000),
  UPLOAD_TIMEOUT: getNumberEnvVar('UPLOAD_TIMEOUT', 120000),
  AI_ANALYSIS_TIMEOUT: getNumberEnvVar('AI_ANALYSIS_TIMEOUT', 60000),

  // Retry Configuration
  MAX_RETRIES: getNumberEnvVar('MAX_RETRIES', 3),
  RETRY_DELAY: getNumberEnvVar('RETRY_DELAY', 1000),
  BACKOFF_MULTIPLIER: getNumberEnvVar('BACKOFF_MULTIPLIER', 2),

  // Image Optimization
  IMAGE_QUALITY: getNumberEnvVar('IMAGE_QUALITY', 80),
  IMAGE_MAX_SIZE: getNumberEnvVar('IMAGE_MAX_SIZE', 5242880),
  ENABLE_IMAGE_COMPRESSION: getBooleanEnvVar('ENABLE_IMAGE_COMPRESSION', true),

  // Security Configuration
  ENCRYPTION_KEY_ALIAS: getEnvVar('ENCRYPTION_KEY_ALIAS', 'flamoral_encryption_key'),
  USE_KEYCHAIN: getBooleanEnvVar('USE_KEYCHAIN', true),
  USE_KEYSTORE: getBooleanEnvVar('USE_KEYSTORE', true),
  ENABLE_SSL_PINNING: getBooleanEnvVar('ENABLE_SSL_PINNING', true),
  SSL_PINNING_MODE: getEnvVar('SSL_PINNING_MODE', 'strict'),
  ENABLE_ROOT_DETECTION: getBooleanEnvVar('ENABLE_ROOT_DETECTION', true),
  ENABLE_JAILBREAK_DETECTION: getBooleanEnvVar('ENABLE_JAILBREAK_DETECTION', true),

  // Localization
  DEFAULT_LANGUAGE: getEnvVar('DEFAULT_LANGUAGE', 'en'),
  SUPPORTED_LANGUAGES: getEnvVar('SUPPORTED_LANGUAGES', 'en,es,fr,de,it,pt,ja,ko,zh'),
  DATE_FORMAT: getEnvVar('DATE_FORMAT', 'MM/DD/YYYY'),
  TIME_FORMAT: getEnvVar('TIME_FORMAT', '12h'),

  // CDN Configuration
  CDN_URL: getEnvVar('CDN_URL', 'https://cdn.flamoral.com'),
  MEDIA_CDN_URL: getEnvVar('MEDIA_CDN_URL', 'https://media.flamoral.com'),

  // Offline Mode
  ENABLE_OFFLINE_MODE: getBooleanEnvVar('ENABLE_OFFLINE_MODE', true),
  OFFLINE_CACHE_SIZE: getNumberEnvVar('OFFLINE_CACHE_SIZE', 52428800),
  OFFLINE_CACHE_DURATION: getNumberEnvVar('OFFLINE_CACHE_DURATION', 86400000),

  // Legal & Compliance
  TERMS_URL: getEnvVar('TERMS_URL', 'https://flamoral.com/terms'),
  PRIVACY_URL: getEnvVar('PRIVACY_URL', 'https://flamoral.com/privacy'),
  COOKIE_POLICY_URL: getEnvVar('COOKIE_POLICY_URL', 'https://flamoral.com/cookies'),
  COMMUNITY_GUIDELINES_URL: getEnvVar('COMMUNITY_GUIDELINES_URL', 'https://flamoral.com/guidelines'),

  // Contact & Support
  SUPPORT_EMAIL: getEnvVar('SUPPORT_EMAIL', 'support@flamoral.com'),
  SUPPORT_URL: getEnvVar('SUPPORT_URL', 'https://flamoral.com/support'),
  HELP_CENTER_URL: getEnvVar('HELP_CENTER_URL', 'https://help.flamoral.com'),
};

export default ENV;
