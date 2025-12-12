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
  },

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'flamoral_users',
    user: process.env.DB_USER || 'postgres',
    password: getRequiredSecret('DB_PASSWORD', 'postgres_dev_password'),
    ssl: isProduction ? true : process.env.DB_SSL === 'true',
    poolMin: parseInt(process.env.DB_POOL_MIN || '2', 10),
    poolMax: parseInt(process.env.DB_POOL_MAX || '10', 10),
  },

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
};
