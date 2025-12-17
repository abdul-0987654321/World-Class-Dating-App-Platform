/// <reference types="vite/client" />

interface ImportMetaEnv {
  // API Configuration
  readonly VITE_API_URL: string;
  readonly VITE_SOCKET_URL: string;
  readonly VITE_WS_URL: string;
  readonly VITE_GRAPHQL_URL: string;

  // App Configuration
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_TITLE: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_APP_ENV: string;
  readonly VITE_APP_DOMAIN: string;

  // External Services
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string;
  readonly VITE_GOOGLE_MAPS_API_KEY: string;
  readonly VITE_AGORA_APP_ID: string;
  readonly VITE_TENOR_API_KEY: string;

  // Firebase
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID: string;
  readonly VITE_VAPID_PUBLIC_KEY: string;

  // Social Login
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_FACEBOOK_APP_ID: string;
  readonly VITE_APPLE_CLIENT_ID: string;
  readonly VITE_APPLE_REDIRECT_URI: string;

  // Analytics & Monitoring
  readonly VITE_GA_MEASUREMENT_ID: string;
  readonly VITE_SENTRY_DSN: string;
  readonly VITE_SENTRY_ENVIRONMENT: string;
  readonly VITE_MIXPANEL_TOKEN: string;
  readonly VITE_LOGROCKET_APP_ID: string;

  // AI Services
  readonly VITE_FRAUD_DETECTION_URL: string;
  readonly VITE_NLP_SERVICE_URL: string;
  readonly VITE_PHOTO_ANALYSIS_URL: string;
  readonly VITE_RECOMMENDATION_URL: string;
  readonly VITE_MODERATION_SERVICE_URL: string;
  readonly VITE_USER_SERVICE_URL: string;

  // Feature Flags
  readonly VITE_ENABLE_VIDEO_CALLS: string;
  readonly VITE_ENABLE_VOICE_CALLS: string;
  readonly VITE_ENABLE_EVENTS: string;
  readonly VITE_ENABLE_AI_FEATURES: string;
  readonly VITE_ENABLE_STORIES: string;
  readonly VITE_ENABLE_TRAVEL_MODE: string;
  readonly VITE_ENABLE_PREMIUM_SUBSCRIPTIONS: string;
  readonly VITE_ENABLE_BOOSTS: string;
  readonly VITE_ENABLE_SUPER_LIKES: string;
  readonly VITE_ENABLE_VIRTUAL_GIFTS: string;
  readonly VITE_ENABLE_PHOTO_VERIFICATION: string;
  readonly VITE_ENABLE_ID_VERIFICATION: string;
  readonly VITE_ENABLE_GAMIFICATION: string;
  readonly VITE_ENABLE_AI_COACH: string;
  readonly VITE_ENABLE_MOCK_API: string;
  readonly VITE_ENABLE_DEBUG: string;
  readonly VITE_ENABLE_REDUX_DEVTOOLS: string;
  readonly VITE_ENABLE_LAZY_LOADING: string;

  // Performance
  readonly VITE_API_TIMEOUT: string;
  readonly VITE_UPLOAD_TIMEOUT: string;
  readonly VITE_IMAGE_QUALITY: string;
  readonly VITE_IMAGE_MAX_SIZE: string;
  readonly VITE_LOG_LEVEL: string;

  // Security
  readonly VITE_CSP_ENABLED: string;
  readonly VITE_CSRF_ENABLED: string;
  readonly VITE_RATE_LIMIT_ENABLED: string;

  // CDN
  readonly VITE_CDN_URL: string;
  readonly VITE_MEDIA_CDN_URL: string;

  // Localization
  readonly VITE_DEFAULT_LANGUAGE: string;
  readonly VITE_SUPPORTED_LANGUAGES: string;

  // Legal URLs
  readonly VITE_TERMS_URL: string;
  readonly VITE_PRIVACY_URL: string;
  readonly VITE_COOKIE_POLICY_URL: string;
  readonly VITE_COMMUNITY_GUIDELINES_URL: string;
  readonly VITE_SUPPORT_EMAIL: string;
  readonly VITE_CONTACT_URL: string;

  // Vite built-in
  readonly MODE: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly SSR: boolean;
  readonly BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
