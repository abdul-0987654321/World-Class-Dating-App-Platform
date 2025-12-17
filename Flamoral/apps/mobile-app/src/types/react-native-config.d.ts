/**
 * Type declarations for react-native-config
 * This provides TypeScript support for environment variables
 */

declare module 'react-native-config' {
  export interface NativeConfig {
    // API Configuration
    API_BASE_URL?: string;
    WEBSOCKET_URL?: string;
    GRAPHQL_URL?: string;

    // AI Services
    FRAUD_DETECTION_URL?: string;
    NLP_SERVICE_URL?: string;
    PHOTO_ANALYSIS_URL?: string;
    RECOMMENDATION_URL?: string;

    // Messaging Service
    EXPO_PUBLIC_MESSAGING_SERVICE_URL?: string;

    // App Configuration
    APP_NAME?: string;
    APP_VERSION?: string;
    APP_ENV?: string;

    // Bundle Identifiers
    BUNDLE_ID?: string;
    IOS_BUNDLE_ID?: string;
    ANDROID_PACKAGE?: string;

    // Deep Linking
    DEEP_LINK_SCHEME?: string;
    UNIVERSAL_LINK_DOMAIN?: string;

    // Feature Flags (boolean strings: 'true' or 'false')
    ENABLE_VIDEO_CALLS?: string;
    ENABLE_VOICE_CALLS?: string;
    ENABLE_EVENTS?: string;
    ENABLE_AI_FEATURES?: string;
    ENABLE_STORIES?: string;
    ENABLE_TRAVEL_MODE?: string;
    ENABLE_PREMIUM_SUBSCRIPTIONS?: string;
    ENABLE_BOOSTS?: string;
    ENABLE_SUPER_LIKES?: string;
    ENABLE_VIRTUAL_GIFTS?: string;
    ENABLE_PHOTO_VERIFICATION?: string;
    ENABLE_ID_VERIFICATION?: string;
    ENABLE_BACKGROUND_CHECKS?: string;
    ENABLE_ENCRYPTION?: string;
    ENABLE_BIOMETRIC_AUTH?: string;
    ENABLE_PUSH_NOTIFICATIONS?: string;
    ENABLE_LOCATION_SERVICES?: string;
    ENABLE_GAMIFICATION?: string;
    ENABLE_AI_COACH?: string;
    ENABLE_AR_FEATURES?: string;
    ENABLE_BLOCKCHAIN_VERIFICATION?: string;

    // Debug & Development
    DEBUG_MODE?: string;
    LOG_LEVEL?: string;
    ENABLE_DEBUG_MENU?: string;
    ENABLE_FLIPPER?: string;

    // Performance Configuration (number strings)
    API_TIMEOUT?: string;
    UPLOAD_TIMEOUT?: string;
    AI_ANALYSIS_TIMEOUT?: string;
    MAX_RETRIES?: string;
    RETRY_DELAY?: string;
    BACKOFF_MULTIPLIER?: string;

    // Image Optimization
    IMAGE_QUALITY?: string;
    IMAGE_MAX_SIZE?: string;
    ENABLE_IMAGE_COMPRESSION?: string;

    // Security Configuration
    ENCRYPTION_KEY_ALIAS?: string;
    USE_KEYCHAIN?: string;
    USE_KEYSTORE?: string;
    ENABLE_SSL_PINNING?: string;
    SSL_PINNING_MODE?: string;
    ENABLE_ROOT_DETECTION?: string;
    ENABLE_JAILBREAK_DETECTION?: string;

    // Localization
    DEFAULT_LANGUAGE?: string;
    SUPPORTED_LANGUAGES?: string;
    DATE_FORMAT?: string;
    TIME_FORMAT?: string;

    // CDN Configuration
    CDN_URL?: string;
    MEDIA_CDN_URL?: string;

    // Offline Mode
    ENABLE_OFFLINE_MODE?: string;
    OFFLINE_CACHE_SIZE?: string;
    OFFLINE_CACHE_DURATION?: string;

    // Legal & Compliance
    TERMS_URL?: string;
    PRIVACY_URL?: string;
    COOKIE_POLICY_URL?: string;
    COMMUNITY_GUIDELINES_URL?: string;

    // Contact & Support
    SUPPORT_EMAIL?: string;
    SUPPORT_URL?: string;
    HELP_CENTER_URL?: string;

    // Allow any other string keys for flexibility
    [key: string]: string | undefined;
  }

  export const Config: NativeConfig;
  export default Config;
}
