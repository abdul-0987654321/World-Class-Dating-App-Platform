import dotenv from 'dotenv';

dotenv.config();

// Validate required environment variables
const validateRequiredEnvVars = () => {
  const required = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

  const missing = required.filter((key) => !process.env[key]);

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
    accessSecret:
      process.env.JWT_ACCESS_SECRET ||
      (() => {
        throw new Error('JWT_ACCESS_SECRET is required. Set it in environment variables.');
      })(),
    refreshSecret:
      process.env.JWT_REFRESH_SECRET ||
      (() => {
        throw new Error('JWT_REFRESH_SECRET is required. Set it in environment variables.');
      })(),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m', // Reduced from 24h to 15m
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d', // Reduced from 30d to 7d
    algorithm: 'HS256' as const, // Explicit algorithm specification
    issuer: process.env.JWT_ISSUER || 'flamoral-auth-service',
    audience: process.env.JWT_AUDIENCE || 'flamoral-platform',
  },

  // Database - Support both DATABASE_URL and individual variables
  database: (() => {
    if (process.env.DATABASE_URL) {
      // Parse DATABASE_URL: postgresql://user:pass@host:port/database
      const url = new URL(process.env.DATABASE_URL);
      return {
        host: url.hostname,
        port: parseInt(url.port || '5432', 10),
        name: url.pathname.slice(1), // Remove leading /
        user: url.username,
        password: decodeURIComponent(url.password),
        ssl: process.env.DB_SSL !== 'false', // Default to true for DATABASE_URL
      };
    }
    return {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      name: process.env.DB_NAME || 'flamoral',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      ssl: process.env.DB_SSL === 'true',
    };
  })(),

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // Email - Azure Communication Services
  email: {
    azureConnectionString: process.env.AZURE_COMMUNICATION_CONNECTION_STRING || '',
    from: process.env.EMAIL_FROM || 'DoNotReply@64af122c-9bbb-4259-8051-a5cf7f3111d4.azurecomm.net',
  },

  // CORS
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:5173',
    ],
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

  // Frontend URLs
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
};

export default config;
