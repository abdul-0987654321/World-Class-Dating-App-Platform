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

  // Redis - Support both REDIS_URL and individual variables
  redis: (() => {
    // If REDIS_URL is provided, use it directly
    if (process.env.REDIS_URL) {
      return {
        url: process.env.REDIS_URL,
        host: undefined,
        port: undefined,
        password: undefined,
      };
    }

    // Otherwise, construct URL from individual variables
    const host = process.env.REDIS_HOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);
    const password = process.env.REDIS_PASSWORD;

    // Build Redis URL from components
    const auth = password ? `:${encodeURIComponent(password)}@` : '';
    const url = `redis://${auth}${host}:${port}`;

    return {
      url,
      host,
      port,
      password,
    };
  })(),

  // Email - AWS SES
  email: {
    from: process.env.EMAIL_FROM || 'noreply@flamoral.com',
  },

  // Security - Email Verification
  // SECURITY: Email verification is REQUIRED by default in production
  // Only disable in development/testing with explicit opt-out
  requireEmailVerification: (() => {
    const envValue = process.env.REQUIRE_EMAIL_VERIFICATION;
    const isProduction = process.env.NODE_ENV === 'production';

    // In production, default to true unless explicitly disabled
    if (isProduction) {
      if (envValue === 'false') {
        console.warn('WARNING: Email verification is disabled in production. This is a security risk.');
      }
      return envValue !== 'false'; // Default true in production
    }

    // In development/test, default to false but allow enabling
    return envValue === 'true';
  })(),

  // AWS Configuration
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },

  // CORS - SECURITY: Always include production domains
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || (
      process.env.NODE_ENV === 'production'
        ? ['https://flamoral.com', 'https://www.flamoral.com', 'https://app.flamoral.com']
        : ['http://localhost:3000', 'http://localhost:5173']
    ),
  },

  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  // Internal service key for service-to-service communication
  internalServiceKey: (() => {
    const key = process.env.INTERNAL_SERVICE_KEY;
    if (!key || key === 'internal-service-key') {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('INTERNAL_SERVICE_KEY must be set to a secure value in production');
      }
      console.warn('WARNING: Using default INTERNAL_SERVICE_KEY. Set a secure value in INTERNAL_SERVICE_KEY environment variable.');
      return 'dev-internal-service-key-not-for-production';
    }
    return key;
  })(),

  // Frontend URLs
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // AI Assistant Configuration
  ai: {
    provider: (process.env.AI_PROVIDER || 'openai') as 'openai' | 'anthropic',
    openaiApiKey: process.env.OPENAI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.AI_MODEL || 'gpt-4-turbo-preview',
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || '1000', 10),
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
    // Rate limits per tier (requests per day)
    rateLimits: {
      free: parseInt(process.env.AI_RATE_LIMIT_FREE || '20', 10),
      gold: parseInt(process.env.AI_RATE_LIMIT_GOLD || '100', 10),
      platinum: parseInt(process.env.AI_RATE_LIMIT_PLATINUM || '250', 10),
      diamond: parseInt(process.env.AI_RATE_LIMIT_DIAMOND || '500', 10),
      elite: -1, // unlimited
    },
  },
};

export default config;
