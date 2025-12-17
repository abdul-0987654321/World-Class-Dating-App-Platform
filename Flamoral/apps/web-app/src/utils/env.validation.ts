/**
 * Environment Variables Validation Utility
 * Validates that all required environment variables are properly set
 * Should be called during app initialization
 */

interface EnvValidationResult {
  isValid: boolean;
  missing: string[];
  warnings: string[];
}

/**
 * Required environment variables for production
 */
const REQUIRED_PRODUCTION_ENV_VARS = [
  'VITE_API_URL',
  'VITE_SOCKET_URL',
  'VITE_APP_NAME',
  'VITE_APP_ENV',
  'VITE_APP_DOMAIN',
] as const;

/**
 * Optional but recommended environment variables
 */
const RECOMMENDED_ENV_VARS = [
  'VITE_SENTRY_DSN',
  'VITE_GA_MEASUREMENT_ID',
  'VITE_STRIPE_PUBLISHABLE_KEY',
] as const;

/**
 * Environment variables that should NOT have placeholder values
 */
const PLACEHOLDER_VALUES = [
  'STORED_IN_AZURE_KEY_VAULT',
  'your_key_here',
  'pk_test_',
  'G-XXXXXXXXXX',
] as const;

/**
 * Validates that all required environment variables are set
 */
export function validateEnvironmentVariables(): EnvValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];
  const env = import.meta.env;

  // Check required variables
  for (const varName of REQUIRED_PRODUCTION_ENV_VARS) {
    const value = env[varName];

    if (!value || value.trim() === '') {
      missing.push(varName);
    } else if (PLACEHOLDER_VALUES.some(placeholder => value.includes(placeholder))) {
      warnings.push(`${varName} contains placeholder value: ${value}`);
    }
  }

  // Check recommended variables (warnings only)
  if (env.VITE_APP_ENV === 'production') {
    for (const varName of RECOMMENDED_ENV_VARS) {
      const value = env[varName];

      if (!value || value.trim() === '') {
        warnings.push(`Recommended variable ${varName} is not set`);
      } else if (PLACEHOLDER_VALUES.some(placeholder => value.includes(placeholder))) {
        warnings.push(`${varName} contains placeholder value: ${value}`);
      }
    }
  }

  // Validate URL formats
  const urlVars = ['VITE_API_URL', 'VITE_SOCKET_URL', 'VITE_APP_DOMAIN'] as const;
  for (const varName of urlVars) {
    const value = env[varName];
    if (value) {
      try {
        new URL(value);

        // Ensure production URLs use HTTPS
        if (env.VITE_APP_ENV === 'production' && !value.startsWith('https://') && !value.startsWith('wss://')) {
          warnings.push(`${varName} should use HTTPS/WSS in production: ${value}`);
        }
      } catch (error) {
        warnings.push(`${varName} is not a valid URL: ${value}`);
      }
    }
  }

  return {
    isValid: missing.length === 0,
    missing,
    warnings,
  };
}

/**
 * Gets environment variable with type safety and fallback
 */
export function getEnvVar(key: keyof ImportMetaEnv, fallback?: string): string {
  const value = import.meta.env[key];

  if (!value || value.trim() === '') {
    if (fallback !== undefined) {
      return fallback;
    }
    console.warn(`Environment variable ${key} is not set and no fallback provided`);
    return '';
  }

  return value;
}

/**
 * Gets environment variable as boolean
 */
export function getEnvBoolean(key: keyof ImportMetaEnv, fallback = false): boolean {
  const value = getEnvVar(key, String(fallback));
  return value.toLowerCase() === 'true';
}

/**
 * Gets environment variable as number
 */
export function getEnvNumber(key: keyof ImportMetaEnv, fallback?: number): number {
  const value = getEnvVar(key, fallback !== undefined ? String(fallback) : undefined);
  const num = parseInt(value, 10);

  if (isNaN(num)) {
    console.warn(`Environment variable ${key} is not a valid number: ${value}`);
    return fallback ?? 0;
  }

  return num;
}

/**
 * Checks if running in production mode
 */
export function isProduction(): boolean {
  return import.meta.env.VITE_APP_ENV === 'production' || import.meta.env.PROD;
}

/**
 * Checks if running in development mode
 */
export function isDevelopment(): boolean {
  return import.meta.env.VITE_APP_ENV === 'development' || import.meta.env.DEV;
}

/**
 * Checks if running in staging mode
 */
export function isStaging(): boolean {
  return import.meta.env.VITE_APP_ENV === 'staging';
}

/**
 * Gets the current environment name
 */
export function getEnvironment(): 'production' | 'staging' | 'development' | 'test' {
  return (import.meta.env.VITE_APP_ENV as any) || (import.meta.env.MODE as any) || 'development';
}

/**
 * Logs environment validation results
 * Should be called during app initialization
 */
export function logEnvironmentValidation(): void {
  const result = validateEnvironmentVariables();

  console.group('🔧 Environment Configuration');
  console.log('Environment:', getEnvironment());
  console.log('Mode:', import.meta.env.MODE);
  console.log('Production:', isProduction());
  console.log('Development:', isDevelopment());

  if (result.missing.length > 0) {
    console.error('❌ Missing required environment variables:', result.missing);
  }

  if (result.warnings.length > 0) {
    console.warn('⚠️ Environment warnings:', result.warnings);
  }

  if (result.isValid && result.warnings.length === 0) {
    console.log('✅ All environment variables are properly configured');
  }

  console.groupEnd();

  // In production, throw error if validation fails
  if (isProduction() && !result.isValid) {
    throw new Error(`Missing required environment variables: ${result.missing.join(', ')}`);
  }
}

/**
 * Export commonly used environment variables
 */
export const env = {
  // API Configuration
  apiUrl: () => getEnvVar('VITE_API_URL', 'http://localhost:4000/api/v1'),
  socketUrl: () => getEnvVar('VITE_SOCKET_URL', 'http://localhost:4000'),
  wsUrl: () => getEnvVar('VITE_WS_URL', 'ws://localhost:4000'),
  graphqlUrl: () => getEnvVar('VITE_GRAPHQL_URL', 'http://localhost:4000/graphql'),

  // App Configuration
  appName: () => getEnvVar('VITE_APP_NAME', 'Flamoral'),
  appVersion: () => getEnvVar('VITE_APP_VERSION', '1.0.0'),
  appEnv: () => getEnvironment(),
  appDomain: () => getEnvVar('VITE_APP_DOMAIN', 'http://localhost:5173'),

  // Feature Flags
  features: {
    videoCalls: () => getEnvBoolean('VITE_ENABLE_VIDEO_CALLS', true),
    voiceCalls: () => getEnvBoolean('VITE_ENABLE_VOICE_CALLS', true),
    events: () => getEnvBoolean('VITE_ENABLE_EVENTS', true),
    aiFeatures: () => getEnvBoolean('VITE_ENABLE_AI_FEATURES', true),
    stories: () => getEnvBoolean('VITE_ENABLE_STORIES', true),
    travelMode: () => getEnvBoolean('VITE_ENABLE_TRAVEL_MODE', true),
    premiumSubscriptions: () => getEnvBoolean('VITE_ENABLE_PREMIUM_SUBSCRIPTIONS', true),
    boosts: () => getEnvBoolean('VITE_ENABLE_BOOSTS', true),
    superLikes: () => getEnvBoolean('VITE_ENABLE_SUPER_LIKES', true),
    virtualGifts: () => getEnvBoolean('VITE_ENABLE_VIRTUAL_GIFTS', true),
    photoVerification: () => getEnvBoolean('VITE_ENABLE_PHOTO_VERIFICATION', true),
    idVerification: () => getEnvBoolean('VITE_ENABLE_ID_VERIFICATION', true),
    gamification: () => getEnvBoolean('VITE_ENABLE_GAMIFICATION', true),
    aiCoach: () => getEnvBoolean('VITE_ENABLE_AI_COACH', true),
    mockApi: () => getEnvBoolean('VITE_ENABLE_MOCK_API', false),
    debug: () => getEnvBoolean('VITE_ENABLE_DEBUG', false),
    reduxDevtools: () => getEnvBoolean('VITE_ENABLE_REDUX_DEVTOOLS', false),
    lazyLoading: () => getEnvBoolean('VITE_ENABLE_LAZY_LOADING', true),
  },

  // Performance
  performance: {
    apiTimeout: () => getEnvNumber('VITE_API_TIMEOUT', 30000),
    uploadTimeout: () => getEnvNumber('VITE_UPLOAD_TIMEOUT', 120000),
    imageQuality: () => getEnvNumber('VITE_IMAGE_QUALITY', 80),
    imageMaxSize: () => getEnvNumber('VITE_IMAGE_MAX_SIZE', 5242880),
  },

  // Security
  security: {
    cspEnabled: () => getEnvBoolean('VITE_CSP_ENABLED', true),
    csrfEnabled: () => getEnvBoolean('VITE_CSRF_ENABLED', true),
    rateLimitEnabled: () => getEnvBoolean('VITE_RATE_LIMIT_ENABLED', true),
  },

  // External Services
  stripe: {
    publishableKey: () => getEnvVar('VITE_STRIPE_PUBLISHABLE_KEY', ''),
  },
  google: {
    mapsApiKey: () => getEnvVar('VITE_GOOGLE_MAPS_API_KEY', ''),
    clientId: () => getEnvVar('VITE_GOOGLE_CLIENT_ID', ''),
  },
  agora: {
    appId: () => getEnvVar('VITE_AGORA_APP_ID', ''),
  },

  // Analytics
  analytics: {
    sentryDsn: () => getEnvVar('VITE_SENTRY_DSN', ''),
    sentryEnvironment: () => getEnvVar('VITE_SENTRY_ENVIRONMENT', getEnvironment()),
    gaMeasurementId: () => getEnvVar('VITE_GA_MEASUREMENT_ID', ''),
    mixpanelToken: () => getEnvVar('VITE_MIXPANEL_TOKEN', ''),
  },

  // Utility functions
  isProduction,
  isDevelopment,
  isStaging,
  getEnvironment,
};
