/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SOCKET_URL: string;
  readonly VITE_APP_TITLE: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string;
  readonly VITE_GOOGLE_MAPS_API_KEY: string;
  readonly VITE_AGORA_APP_ID: string;
  readonly VITE_SENTRY_DSN: string;
  readonly VITE_APP_ENV: string;
  readonly VITE_FRAUD_DETECTION_URL: string;
  readonly VITE_NLP_SERVICE_URL: string;
  readonly VITE_PHOTO_ANALYSIS_URL: string;
  readonly VITE_RECOMMENDATION_URL: string;
  readonly VITE_MODERATION_SERVICE_URL: string;
  readonly VITE_USER_SERVICE_URL: string;
  readonly VITE_VAPID_PUBLIC_KEY: string;
  readonly VITE_FACEBOOK_APP_ID: string;
  readonly VITE_APPLE_CLIENT_ID: string;
  readonly VITE_APPLE_REDIRECT_URI: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly MODE: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
