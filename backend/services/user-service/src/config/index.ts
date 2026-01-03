import dotenv from 'dotenv';

dotenv.config();

// Security: Validate required secrets in production
const isProduction = process.env.NODE_ENV === 'production';

const getRequiredSecret = (key: string, devDefault: string): string => {
  const value = process.env[key];
  if (value) return value;
  if (isProduction) {
    throw new Error(`CRITICAL: ${key} is required in production`);
  }
  return devDefault;
};

export default {
  service: {
    name: process.env.SERVICE_NAME || 'user-service',
    port: parseInt(process.env.PORT || '3002', 10),
    env: process.env.NODE_ENV || 'development',
    baseUrl: process.env.SERVICE_BASE_URL || 'http://localhost:3002',
  },

  database: (() => {
    // Support DATABASE_URL format: postgresql://user:pass@host:port/database
    if (process.env.DATABASE_URL) {
      const url = new URL(process.env.DATABASE_URL);
      return {
        host: url.hostname,
        port: parseInt(url.port || '5432', 10),
        name: url.pathname.slice(1),
        user: url.username,
        password: decodeURIComponent(url.password),
        ssl: process.env.DB_SSL !== 'false', // Default true for DATABASE_URL
        poolMin: parseInt(process.env.DB_POOL_MIN || '2', 10),
        poolMax: parseInt(process.env.DB_POOL_MAX || '10', 10),
      };
    }
    return {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      name: process.env.DB_NAME || 'flamoral_users',
      user: process.env.DB_USER || 'postgres',
      password: getRequiredSecret('DB_PASSWORD', 'postgres_dev_password'),
      ssl: isProduction ? true : process.env.DB_SSL === 'true',
      poolMin: parseInt(process.env.DB_POOL_MIN || '2', 10),
      poolMax: parseInt(process.env.DB_POOL_MAX || '10', 10),
    };
  })(),

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },

  jwt: {
    accessSecret: getRequiredSecret('JWT_ACCESS_SECRET', 'dev-access-secret-min-32-chars!!'),
    refreshSecret: getRequiredSecret('JWT_REFRESH_SECRET', 'dev-refresh-secret-min-32-chars!'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },

  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY,
    fromEmail: process.env.FROM_EMAIL || 'noreply@flamoral.com',
    fromName: process.env.FROM_NAME || 'Flamoral',
  },

  azure: {
    storageAccount: process.env.AZURE_STORAGE_ACCOUNT_NAME,
    storageKey: process.env.AZURE_STORAGE_ACCOUNT_KEY,
    blobContainer: process.env.AZURE_BLOB_CONTAINER_NAME || 'profile-photos',
  },

  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001,http://localhost:4000').split(','),
  },

  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    authRateLimitMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '5', 10),
  },

  /**
   * ID Verification Provider Configuration
   * Supports Jumio (primary), Onfido (fallback), and Mock (development)
   */
  verification: {
    // Provider selection: 'jumio' | 'onfido' | 'mock'
    provider: process.env.VERIFICATION_PROVIDER || 'jumio',

    // Jumio Configuration (Primary Provider)
    jumio: {
      apiKey: process.env.JUMIO_API_KEY,
      apiSecret: process.env.JUMIO_API_SECRET,
      baseUrl: process.env.JUMIO_BASE_URL || 'https://api.jumio.com',
      workflowId: process.env.JUMIO_WORKFLOW_ID || '10011',
      callbackUrl: process.env.JUMIO_CALLBACK_URL ||
        `${process.env.SERVICE_BASE_URL || 'http://localhost:3002'}/api/v1/verification/id/webhook/jumio`,
    },

    // Onfido Configuration (Fallback Provider)
    onfido: {
      apiToken: process.env.ONFIDO_API_TOKEN,
      baseUrl: process.env.ONFIDO_BASE_URL || 'https://api.onfido.com',
      webhookToken: process.env.ONFIDO_WEBHOOK_TOKEN,
      workflowId: process.env.ONFIDO_WORKFLOW_ID,
    },

    // Mock Provider Configuration (Development/Testing)
    mock: {
      processingDelayMs: parseInt(process.env.MOCK_VERIFICATION_DELAY_MS || '3000', 10),
      simulateErrors: process.env.MOCK_VERIFICATION_SIMULATE_ERRORS === 'true',
    },

    // Verification Settings
    settings: {
      expirationHours: parseInt(process.env.VERIFICATION_EXPIRATION_HOURS || '72', 10),
      maxRetries: parseInt(process.env.VERIFICATION_MAX_RETRIES || '3', 10),
      requireBiometricConsent: process.env.VERIFICATION_REQUIRE_BIOMETRIC_CONSENT === 'true',
    },
  },

  /**
   * Date Planning / Venue Integration Configuration
   * Google Places API and Yelp Fusion API for venue search
   */
  datePlanning: {
    // Google Places API Configuration
    googlePlaces: {
      apiKey: process.env.GOOGLE_PLACES_API_KEY || '',
      baseUrl: process.env.GOOGLE_PLACES_BASE_URL || 'https://maps.googleapis.com/maps/api/place',
    },

    // Yelp Fusion API Configuration (optional, fallback)
    yelp: {
      apiKey: process.env.YELP_API_KEY || '',
      baseUrl: process.env.YELP_BASE_URL || 'https://api.yelp.com/v3',
    },

    // Search defaults
    defaults: {
      searchRadius: parseInt(process.env.VENUE_SEARCH_RADIUS || '5000', 10), // meters
      maxResults: parseInt(process.env.VENUE_MAX_RESULTS || '20', 10),
    },
  },

  /**
   * AWS Textract Configuration for Document OCR
   * Used for document verification with OCR text extraction
   */
  textract: {
    // AWS Region for Textract
    region: process.env.AWS_TEXTRACT_REGION || process.env.AWS_REGION || 'us-east-1',

    // AWS Credentials (can use IAM roles in production)
    accessKeyId: process.env.AWS_TEXTRACT_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_TEXTRACT_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '',

    // Request configuration
    maxRetries: parseInt(process.env.AWS_TEXTRACT_MAX_RETRIES || '3', 10),
    requestTimeout: parseInt(process.env.AWS_TEXTRACT_TIMEOUT || '30000', 10),

    // Optional S3 bucket for async processing of large documents
    s3Bucket: process.env.AWS_TEXTRACT_S3_BUCKET || '',
  },

  /**
   * Document Verification Configuration
   * OCR-based document verification settings
   */
  documentVerification: {
    // Verification thresholds (0-1 scale)
    thresholds: {
      minimumExtractionConfidence: parseFloat(process.env.DOC_MIN_EXTRACTION_CONFIDENCE || '0.7'),
      minimumFieldConfidence: parseFloat(process.env.DOC_MIN_FIELD_CONFIDENCE || '0.6'),
      minimumProfileMatchScore: parseFloat(process.env.DOC_MIN_PROFILE_MATCH || '0.8'),
      minimumAuthenticityScore: parseFloat(process.env.DOC_MIN_AUTHENTICITY || '0.85'),
      autoApproveThreshold: parseFloat(process.env.DOC_AUTO_APPROVE_THRESHOLD || '0.95'),
      autoRejectThreshold: parseFloat(process.env.DOC_AUTO_REJECT_THRESHOLD || '0.4'),
      manualReviewThreshold: parseFloat(process.env.DOC_MANUAL_REVIEW_THRESHOLD || '0.7'),
    },

    // Data retention settings (GDPR compliance)
    dataRetention: {
      verificationDataDays: parseInt(process.env.DOC_RETENTION_VERIFICATION || '365', 10),
      auditLogDays: parseInt(process.env.DOC_RETENTION_AUDIT || '730', 10),
      sensitiveDataDays: parseInt(process.env.DOC_RETENTION_SENSITIVE || '30', 10),
      failedVerificationDays: parseInt(process.env.DOC_RETENTION_FAILED || '90', 10),
    },

    // Encryption settings
    encryptionKey: process.env.DOCUMENT_ENCRYPTION_KEY || '',

    // Processing settings
    maxFileSizeMB: parseInt(process.env.DOC_MAX_FILE_SIZE_MB || '10', 10),
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],

    // Minimum age requirement
    minimumAge: parseInt(process.env.DOC_MINIMUM_AGE || '18', 10),
  },
};
