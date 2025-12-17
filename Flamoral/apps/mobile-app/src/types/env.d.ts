/**
 * Type definitions for React Native environment
 */

/// <reference types="react-native" />

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

// Global React Native types
declare global {
  var __DEV__: boolean;
}
