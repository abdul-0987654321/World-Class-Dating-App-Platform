/**
 * Firebase Configuration
 * Environment variables and configuration for Firebase services
 */

export const firebaseConfig = {
  // Firebase Service Account
  serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY,

  // FCM Configuration
  fcm: {
    enabled: process.env.FCM_ENABLED === 'true',
    serverKey: process.env.FCM_SERVER_KEY,
    senderId: process.env.FCM_SENDER_ID,
  },

  // APNs Configuration
  apns: {
    enabled: process.env.APNS_ENABLED === 'true',
    production: process.env.APNS_PRODUCTION === 'true',

    // JWT Authentication (Recommended)
    keyId: process.env.APNS_KEY_ID,
    teamId: process.env.APNS_TEAM_ID,
    keyPath: process.env.APNS_KEY_PATH,
    bundleId: process.env.APNS_BUNDLE_ID,

    // Certificate Authentication (Legacy)
    certPath: process.env.APNS_CERT_PATH,
    certKeyPath: process.env.APNS_CERT_KEY_PATH,
  },

  // Notification Configuration
  notification: {
    defaultLanguage: process.env.DEFAULT_NOTIFICATION_LANGUAGE || 'en',
    maxRetries: parseInt(process.env.NOTIFICATION_MAX_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.NOTIFICATION_RETRY_DELAY || '60000', 10), // ms
    batchSize: parseInt(process.env.NOTIFICATION_BATCH_SIZE || '500', 10),
  },
};

export default firebaseConfig;
