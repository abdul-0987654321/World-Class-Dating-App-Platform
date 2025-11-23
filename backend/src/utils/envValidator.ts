/**
 * Environment Variables Validator
 * Validates all required environment variables at startup
 */

import { logger } from './logger';

interface EnvConfig {
  [key: string]: {
    required: boolean;
    type: 'string' | 'number' | 'boolean' | 'url' | 'email';
    default?: any;
    validate?: (value: string) => boolean;
    sensitive?: boolean;
  };
}

const envConfig: EnvConfig = {
  // Application
  NODE_ENV: { required: true, type: 'string' },
  PORT: { required: true, type: 'number', default: 3000 },
  GRAPHQL_PORT: { required: true, type: 'number', default: 4000 },
  WS_PORT: { required: true, type: 'number', default: 5000 },

  // Database - PostgreSQL
  DB_HOST: { required: true, type: 'string' },
  DB_PORT: { required: true, type: 'number', default: 5432 },
  DB_NAME: { required: true, type: 'string' },
  DB_USER: { required: true, type: 'string' },
  DB_PASSWORD: { required: true, type: 'string', sensitive: true },

  // MongoDB
  MONGODB_URI: { required: true, type: 'string', sensitive: true },

  // Redis
  REDIS_HOST: { required: true, type: 'string' },
  REDIS_PORT: { required: true, type: 'number', default: 6379 },
  REDIS_PASSWORD: { required: false, type: 'string', sensitive: true },

  // RabbitMQ
  RABBITMQ_URL: { required: true, type: 'string', sensitive: true },

  // JWT
  JWT_ACCESS_SECRET: {
    required: true,
    type: 'string',
    sensitive: true,
    validate: (val) => val.length >= 32,
  },
  JWT_REFRESH_SECRET: {
    required: true,
    type: 'string',
    sensitive: true,
    validate: (val) => val.length >= 32,
  },
  JWT_ACCESS_EXPIRES_IN: { required: false, type: 'string', default: '15m' },
  JWT_REFRESH_EXPIRES_IN: { required: false, type: 'string', default: '7d' },

  // Azure
  AZURE_STORAGE_ACCOUNT: { required: false, type: 'string' },
  AZURE_STORAGE_KEY: { required: false, type: 'string', sensitive: true },
  AZURE_FACE_API_KEY: { required: false, type: 'string', sensitive: true },

  // Stripe
  STRIPE_SECRET_KEY: { required: false, type: 'string', sensitive: true },
  STRIPE_WEBHOOK_SECRET: { required: false, type: 'string', sensitive: true },

  // Twilio
  TWILIO_ACCOUNT_SID: { required: false, type: 'string', sensitive: true },
  TWILIO_AUTH_TOKEN: { required: false, type: 'string', sensitive: true },

  // SendGrid
  SENDGRID_API_KEY: { required: false, type: 'string', sensitive: true },

  // Sentry
  SENTRY_DSN: { required: false, type: 'url' },

  // CORS
  CORS_ORIGIN: { required: true, type: 'string', default: 'http://localhost' },

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: { required: false, type: 'number', default: 900000 },
  RATE_LIMIT_MAX_REQUESTS: { required: false, type: 'number', default: 100 },
};

export class EnvValidator {
  private static errors: string[] = [];
  private static warnings: string[] = [];

  /**
   * Validate all environment variables
   */
  static validate(): { valid: boolean; errors: string[]; warnings: string[] } {
    this.errors = [];
    this.warnings = [];

    for (const [key, config] of Object.entries(envConfig)) {
      const value = process.env[key];

      // Check if required variable is missing
      if (config.required && !value) {
        if (config.default !== undefined) {
          process.env[key] = String(config.default);
          this.warnings.push(`${key} not set, using default: ${config.default}`);
        } else {
          this.errors.push(`${key} is required but not set`);
        }
        continue;
      }

      // Skip validation if not required and not set
      if (!value) continue;

      // Validate type
      switch (config.type) {
        case 'number':
          if (isNaN(Number(value))) {
            this.errors.push(`${key} must be a number, got: ${value}`);
          }
          break;

        case 'boolean':
          if (!['true', 'false', '1', '0'].includes(value.toLowerCase())) {
            this.errors.push(`${key} must be a boolean, got: ${value}`);
          }
          break;

        case 'url':
          try {
            new URL(value);
          } catch {
            this.errors.push(`${key} must be a valid URL, got: ${value}`);
          }
          break;

        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            this.errors.push(`${key} must be a valid email, got: ${value}`);
          }
          break;
      }

      // Custom validation
      if (config.validate && !config.validate(value)) {
        this.errors.push(`${key} failed custom validation`);
      }

      // Security checks
      if (config.sensitive) {
        // Check for weak secrets
        if (value.length < 16) {
          this.warnings.push(`${key} is too short (less than 16 characters)`);
        }

        // Check for default/example values
        const insecureValues = ['password', 'secret', 'changeme', 'admin', 'your_', 'example'];
        if (insecureValues.some((insecure) => value.toLowerCase().includes(insecure))) {
          this.errors.push(`${key} appears to be a default/example value`);
        }
      }
    }

    // Production-specific checks
    if (process.env.NODE_ENV === 'production') {
      this.validateProduction();
    }

    const valid = this.errors.length === 0;

    // Log results
    if (valid) {
      logger.info('Environment validation passed', {
        warnings: this.warnings.length,
      });
    } else {
      logger.error('Environment validation failed', {
        errors: this.errors,
        warnings: this.warnings,
      });
    }

    return {
      valid,
      errors: this.errors,
      warnings: this.warnings,
    };
  }

  /**
   * Additional validation for production environment
   */
  private static validateProduction() {
    // Ensure NODE_ENV is explicitly production
    if (process.env.NODE_ENV !== 'production') {
      this.errors.push('NODE_ENV must be explicitly set to "production" in production');
    }

    // Ensure debug mode is off
    if (process.env.DEBUG === 'true') {
      this.errors.push('DEBUG mode must be disabled in production');
    }

    // Ensure secure secrets
    const criticalSecrets = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'DB_PASSWORD'];
    for (const secret of criticalSecrets) {
      const value = process.env[secret];
      if (value && value.length < 32) {
        this.errors.push(`${secret} must be at least 32 characters in production`);
      }
    }

    // Warn about missing external services
    const optionalServices = [
      'AZURE_STORAGE_KEY',
      'STRIPE_SECRET_KEY',
      'TWILIO_AUTH_TOKEN',
      'SENDGRID_API_KEY',
    ];

    for (const service of optionalServices) {
      if (!process.env[service]) {
        this.warnings.push(`${service} not configured - feature may not work`);
      }
    }

    // Check CORS is not too permissive
    if (process.env.CORS_ORIGIN === '*') {
      this.errors.push('CORS_ORIGIN must not be "*" in production');
    }
  }

  /**
   * Print environment report (safe for logging)
   */
  static printReport() {
    console.log('\n======================================');
    console.log('Environment Configuration Report');
    console.log('======================================\n');

    console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`Validation: ${this.errors.length === 0 ? '✓ PASSED' : '✗ FAILED'}`);

    if (this.errors.length > 0) {
      console.log('\nErrors:');
      this.errors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
    }

    if (this.warnings.length > 0) {
      console.log('\nWarnings:');
      this.warnings.forEach((warning, i) => {
        console.log(`  ${i + 1}. ${warning}`);
      });
    }

    console.log('\nConfigured Services:');
    const services = {
      PostgreSQL: !!process.env.DB_PASSWORD,
      MongoDB: !!process.env.MONGODB_URI,
      Redis: !!process.env.REDIS_HOST,
      RabbitMQ: !!process.env.RABBITMQ_URL,
      Azure: !!process.env.AZURE_STORAGE_KEY,
      Stripe: !!process.env.STRIPE_SECRET_KEY,
      Twilio: !!process.env.TWILIO_AUTH_TOKEN,
      SendGrid: !!process.env.SENDGRID_API_KEY,
      Sentry: !!process.env.SENTRY_DSN,
    };

    Object.entries(services).forEach(([service, configured]) => {
      console.log(`  ${service}: ${configured ? '✓' : '✗'}`);
    });

    console.log('\n======================================\n');
  }

  /**
   * Validate and set defaults
   */
  static validateAndSetDefaults(): boolean {
    const result = this.validate();
    this.printReport();

    if (!result.valid) {
      logger.error('Environment validation failed. Application cannot start.');
      return false;
    }

    return true;
  }
}
