/**
 * Configuration Validation
 * Validates environment variables and configuration on service startup
 */

import logger from '../utils/logger';
import { config } from './index';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate all configuration
 */
export function validateConfiguration(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate required environment variables
  validateRequiredEnvVars(errors);

  // Validate database configuration
  validateDatabaseConfig(errors, warnings);

  // Validate Redis configuration
  validateRedisConfig(errors, warnings);

  // Validate email configuration
  validateEmailConfig(warnings);

  // Validate SMS configuration
  validateSMSConfig(warnings);

  // Validate push notification configuration
  validatePushConfig(warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate required environment variables
 */
function validateRequiredEnvVars(errors: string[]): void {
  const required = [
    'NODE_ENV',
    'PORT',
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'REDIS_HOST',
    'REDIS_PORT',
  ];

  for (const envVar of required) {
    if (!process.env[envVar]) {
      errors.push(`Missing required environment variable: ${envVar}`);
    }
  }
}

/**
 * Validate database configuration
 */
function validateDatabaseConfig(errors: string[], warnings: string[]): void {
  // Check database port is valid
  const dbPort = parseInt(process.env.DB_PORT || '0');
  if (dbPort < 1 || dbPort > 65535) {
    errors.push(`Invalid DB_PORT: ${process.env.DB_PORT}. Must be between 1 and 65535.`);
  }

  // Warn about default passwords in production
  if (config.nodeEnv === 'production' && config.database.password === 'postgres') {
    warnings.push('Using default database password "postgres" in production is not recommended');
  }

  // Check SSL configuration in production
  if (config.nodeEnv === 'production' && process.env.DB_SSL !== 'true') {
    warnings.push('DB_SSL is not enabled in production environment');
  }
}

/**
 * Validate Redis configuration
 */
function validateRedisConfig(errors: string[], warnings: string[]): void {
  // Check Redis port is valid
  const redisPort = parseInt(process.env.REDIS_PORT || '0');
  if (redisPort < 1 || redisPort > 65535) {
    errors.push(`Invalid REDIS_PORT: ${process.env.REDIS_PORT}. Must be between 1 and 65535.`);
  }

  // Warn if Redis password is not set in production
  if (config.nodeEnv === 'production' && !process.env.REDIS_PASSWORD) {
    warnings.push('REDIS_PASSWORD is not set in production environment');
  }
}

/**
 * Validate email configuration
 */
function validateEmailConfig(warnings: string[]): void {
  const hasSSendGrid = config.sendgrid.apiKey && config.sendgrid.apiKey.length > 0;
  const hasSES = process.env.AWS_SES_REGION && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;
  const hasSMTP = process.env.SMTP_HOST;

  if (!hasSendGrid && !hasSES && !hasSMTP) {
    warnings.push('No email provider configured. Email notifications will use default SMTP localhost:1025');
  }

  // Validate email addresses
  if (!isValidEmail(config.sendgrid.fromEmail)) {
    warnings.push(`EMAIL_FROM appears to be invalid: ${config.sendgrid.fromEmail}`);
  }

  // Check web app URL
  if (!process.env.WEB_APP_URL) {
    warnings.push('WEB_APP_URL is not set. Unsubscribe links will not work correctly.');
  }
}

/**
 * Validate SMS configuration
 */
function validateSMSConfig(warnings: string[]): void {
  const hasTwilio = config.twilio.accountSid && config.twilio.authToken && config.twilio.fromNumber;

  if (!hasTwilio) {
    warnings.push('Twilio is not configured. SMS notifications will be disabled. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER');
  } else {
    // Validate Twilio from number format
    if (!config.twilio.fromNumber.startsWith('+')) {
      warnings.push('TWILIO_FROM_NUMBER should be in E.164 format (e.g., +1234567890)');
    }
  }
}

/**
 * Validate push notification configuration
 */
function validatePushConfig(warnings: string[]): void {
  const hasFirebase =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);

  if (!hasFirebase) {
    warnings.push('Firebase is not configured. Android/Web push notifications will be disabled. Set FIREBASE_SERVICE_ACCOUNT_PATH, FIREBASE_SERVICE_ACCOUNT, or individual Firebase environment variables');
  }

  const hasAPNs =
    (process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID && process.env.APNS_KEY_PATH) ||
    (process.env.APNS_CERT_PATH && process.env.APNS_CERT_KEY_PATH);

  if (!hasAPNs) {
    warnings.push('APNs is not configured. iOS push notifications will be disabled. Set APNS_KEY_ID, APNS_TEAM_ID, APNS_KEY_PATH (JWT) or APNS_CERT_PATH, APNS_CERT_KEY_PATH (Certificate)');
  }

  // Check APNs bundle ID
  if (hasAPNs && !process.env.APNS_BUNDLE_ID) {
    warnings.push('APNS_BUNDLE_ID is not set. This is required for APNs with JWT authentication.');
  }
}

/**
 * Validate email address format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Log validation results
 */
export function logValidationResults(result: ValidationResult): void {
  if (result.valid) {
    logger.info('Configuration validation passed', {
      warnings: result.warnings.length,
    });
  } else {
    logger.error('Configuration validation failed', {
      errors: result.errors.length,
      warnings: result.warnings.length,
    });
  }

  // Log all errors
  result.errors.forEach(error => {
    logger.error(`[CONFIG ERROR] ${error}`);
  });

  // Log all warnings
  result.warnings.forEach(warning => {
    logger.warn(`[CONFIG WARNING] ${warning}`);
  });
}

/**
 * Print configuration summary (with sensitive data masked)
 */
export function printConfigurationSummary(): void {
  logger.info('Notification Service Configuration Summary:');
  logger.info(`  Environment: ${config.nodeEnv}`);
  logger.info(`  Port: ${config.port}`);
  logger.info(`  Database: ${config.database.host}:${config.database.port}/${config.database.database}`);
  logger.info(`  Redis: ${config.redis.host}:${config.redis.port}/${config.redis.db}`);
  logger.info(`  Email Provider: ${getEmailProvider()}`);
  logger.info(`  SMS Provider: ${getSMSProvider()}`);
  logger.info(`  Push Providers: ${getPushProviders()}`);
  logger.info(`  Queue Settings: Max retries=${config.notification.maxRetries}, Batch size=${config.notification.batchSize}`);
}

function getEmailProvider(): string {
  if (config.sendgrid.apiKey && config.sendgrid.apiKey.length > 0) {
    return 'SendGrid';
  }
  if (process.env.AWS_SES_REGION) {
    return 'AWS SES';
  }
  return `SMTP (${process.env.SMTP_HOST || 'localhost'}:${process.env.SMTP_PORT || 1025})`;
}

function getSMSProvider(): string {
  if (config.twilio.accountSid && config.twilio.authToken) {
    return `Twilio (${config.twilio.fromNumber})`;
  }
  return 'Not configured';
}

function getPushProviders(): string {
  const providers: string[] = [];

  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_PROJECT_ID) {
    providers.push('Firebase (Android/Web)');
  }

  if (process.env.APNS_KEY_ID || process.env.APNS_CERT_PATH) {
    providers.push('APNs (iOS)');
  }

  return providers.length > 0 ? providers.join(', ') : 'None configured';
}
