import dotenv from 'dotenv';

dotenv.config();

// Validate required environment variables
const validateRequiredEnvVars = () => {
  const required = [
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'JWT secrets must be explicitly set for security. Never use default values in production.'
    );
  }

  // Validate secret strength (minimum 32 characters)
  if (process.env.JWT_ACCESS_SECRET && process.env.JWT_ACCESS_SECRET.length < 32) {
    throw new Error('JWT_ACCESS_SECRET must be at least 32 characters long');
  }

  if (process.env.JWT_REFRESH_SECRET && process.env.JWT_REFRESH_SECRET.length < 32) {
    throw new Error('JWT_REFRESH_SECRET must be at least 32 characters long');
  }
};

// Only validate in production or if explicitly enabled
if (process.env.NODE_ENV === 'production' || process.env.VALIDATE_JWT_SECRETS === 'true') {
  validateRequiredEnvVars();
}

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // JWT - Secure configuration with mandatory secrets
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || (() => {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_ACCESS_SECRET is required in production. Set it in environment variables.');
      }
      console.warn('⚠️  WARNING: Using default JWT_ACCESS_SECRET. This is insecure for production!');
      return 'dev-only-insecure-secret-change-in-production-minimum-32-chars';
    })(),
    refreshSecret: process.env.JWT_REFRESH_SECRET || (() => {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_REFRESH_SECRET is required in production. Set it in environment variables.');
      }
      console.warn('⚠️  WARNING: Using default JWT_REFRESH_SECRET. This is insecure for production!');
      return 'dev-only-insecure-refresh-secret-change-in-production-minimum-32-chars';
    })(),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m', // Short-lived access tokens
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d', // Refresh tokens with rotation
    algorithm: 'HS256' as const, // Explicit algorithm specification - prevents algorithm confusion attacks
    issuer: process.env.JWT_ISSUER || 'flamoral-auth-service',
    audience: process.env.JWT_AUDIENCE || 'flamoral-platform',
    // Token rotation enabled - refresh tokens are rotated on each use
    enableRotation: true,
    // Token reuse detection - invalidate all tokens if reuse detected
    detectReuse: true,
  },

  // Database
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'flamoral',
    user: process.env.DB_USER || 'postgres',
    password: 'DB_PASSWORD' in process.env ? (process.env.DB_PASSWORD || '') : 'postgres',
    ssl: process.env.DB_SSL === 'true',
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    tls: process.env.REDIS_TLS === 'true' ? {
      servername: process.env.REDIS_HOST,
      rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== 'false',
    } : undefined,
  },

  // Email
  email: {
    host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || 'apikey',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.EMAIL_FROM || 'noreply@flamoral.com',
  },

  // CORS - Include production domains in fallback
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || [
      'https://flamoral.com',
      'https://www.flamoral.com',
      'https://admin.flamoral.com',
      'https://app.flamoral.com',
      'https://api.flamoral.com',
      'https://*.flamoral.com', // All subdomains
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
    ],
    credentials: true,
  },

  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  // Azure Key Vault (for production secrets)
  azure: {
    keyVaultUrl: process.env.AZURE_KEY_VAULT_URL || '',
  },

  // Internal service key for service-to-service communication
  internalServiceKey: process.env.INTERNAL_SERVICE_KEY || 'internal-service-key',

  // Frontend URLs - Default to production for password reset links etc.
  frontendUrl: process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://flamoral.com' : 'http://localhost:3000'),
};

export default config;
