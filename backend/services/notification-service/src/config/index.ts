/**
 * Configuration Management
 */

export const config = {
  port: process.env.PORT || 3006,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  database: (() => {
    if (process.env.DATABASE_URL) {
      const url = new URL(process.env.DATABASE_URL);
      return {
        host: url.hostname,
        port: parseInt(url.port || '5432'),
        database: url.pathname.slice(1),
        user: url.username,
        password: decodeURIComponent(url.password),
        ssl: process.env.DB_SSL !== 'false',
      };
    }
    return {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'flamoral_notifications',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    };
  })(),

  // Redis
  redis: (() => {
    if (process.env.REDIS_URL) {
      const url = new URL(process.env.REDIS_URL);
      return {
        host: url.hostname,
        port: parseInt(url.port || '6379'),
        password: url.password ? decodeURIComponent(url.password) : undefined,
        db: parseInt(process.env.REDIS_DB || '0'),
      };
    }
    return {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
    };
  })(),

  // SendGrid (Email)
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY || '',
    fromEmail: process.env.EMAIL_FROM || 'noreply@flamoral.com',
    fromName: process.env.EMAIL_FROM_NAME || 'Flamoral',
  },

  // Twilio (SMS)
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    fromNumber: process.env.TWILIO_FROM_NUMBER || '',
  },

  // Firebase (Push Notifications - Android/Web)
  firebase: {
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    serviceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT,
  },

  // Apple Push Notification Service (iOS)
  apns: {
    keyId: process.env.APNS_KEY_ID || '',
    teamId: process.env.APNS_TEAM_ID || '',
    keyPath: process.env.APNS_KEY_PATH,
    key: process.env.APNS_KEY, // Base64 encoded or direct key string
    bundleId: process.env.APNS_BUNDLE_ID || 'com.flamoral.app',
    production: process.env.NODE_ENV === 'production',
  },

  // Notification Settings
  notification: {
    maxRetries: parseInt(process.env.NOTIFICATION_MAX_RETRIES || '3'),
    retryDelay: parseInt(process.env.NOTIFICATION_RETRY_DELAY || '60000'), // 1 minute
    batchSize: parseInt(process.env.NOTIFICATION_BATCH_SIZE || '50'),
    cleanupDays: parseInt(process.env.NOTIFICATION_CLEANUP_DAYS || '90'),
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  },

  // Bull Queue
  queue: {
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 100,
      removeOnFail: 200,
    },
  },
};
