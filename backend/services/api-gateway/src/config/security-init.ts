import cors from 'cors';
import express, { Application } from 'express';
import mongoSanitize from 'express-mongo-sanitize';
import helmet from 'helmet';
import hpp from 'hpp';

import { apiVersioning } from '../middleware/api-versioning.middleware';
import {
  errorHandler,
  notFoundHandler,
  initializeErrorHandlers,
} from '../middleware/error-handler.middleware';
import { protectAgainstOpenRedirect } from '../middleware/redirect-protection.middleware';
import logger from '../utils/logger';

import { getSecurityConfig } from './security.config';

/**
 * Initialize all security measures for the application
 */
export const initializeSecurity = (app: Application): void => {
  const config = getSecurityConfig();

  logger.info('Initializing security measures...');

  // 1. Trust proxy (important for rate limiting and IP detection)
  app.set('trust proxy', 1);

  // 2. Helmet - Security headers
  if (config.helmet.enabled) {
    app.use(
      helmet({
        contentSecurityPolicy: config.helmet.contentSecurityPolicy.enabled
          ? {
              directives: config.helmet.contentSecurityPolicy.directives,
            }
          : false,
        hsts: config.helmet.hsts.enabled
          ? {
              maxAge: config.helmet.hsts.maxAge,
              includeSubDomains: config.helmet.hsts.includeSubDomains,
              preload: config.helmet.hsts.preload,
            }
          : false,
        xssFilter: config.helmet.xssFilter,
        noSniff: config.helmet.noSniff,
        frameguard: config.helmet.frameguard.enabled
          ? {
              action: config.helmet.frameguard.action,
            }
          : false,
        referrerPolicy: {
          policy: 'strict-origin-when-cross-origin',
        },
        permittedCrossDomainPolicies: {
          permittedPolicies: 'none',
        },
      })
    );
    logger.info('Helmet security headers configured');
  }

  // 3. CORS configuration
  if (config.cors.enabled) {
    app.use(
      cors({
        origin: config.cors.origin,
        credentials: config.cors.credentials,
        methods: config.cors.methods,
        allowedHeaders: config.cors.allowedHeaders,
        exposedHeaders: config.cors.exposedHeaders,
        maxAge: config.cors.maxAge,
      })
    );
    logger.info('CORS configured', { origins: config.cors.origin });
  }

  // 4. Body parser with size limits
  app.use(express.json({ limit: config.api.maxBodySize }));
  app.use(express.urlencoded({ extended: true, limit: config.api.maxBodySize }));
  logger.info('Body parser configured', { maxSize: config.api.maxBodySize });

  // 5. HTTP Parameter Pollution protection
  app.use(hpp());
  logger.info('HTTP Parameter Pollution protection enabled');

  // 6. NoSQL injection protection
  app.use(mongoSanitize());
  logger.info('NoSQL injection protection enabled');

  // 7. API versioning
  if (config.api.versioning) {
    app.use(apiVersioning);
    logger.info('API versioning enabled', { currentVersion: config.api.currentVersion });
  }

  // 8. Open redirect protection
  app.use(protectAgainstOpenRedirect);
  logger.info('Open redirect protection enabled');

  // 9. Security headers for all responses
  app.use((req, res, next) => {
    // Remove X-Powered-By header
    res.removeHeader('X-Powered-By');

    // Add custom security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    next();
  });
  logger.info('Custom security headers configured');

  // 10. Initialize error handlers
  initializeErrorHandlers();
  logger.info('Global error handlers initialized');

  logger.info('Security initialization complete');
};

/**
 * Apply error handling middleware (must be last)
 */
export const applyErrorHandling = (app: Application): void => {
  // 404 handler
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use(errorHandler);

  logger.info('Error handling middleware applied');
};

/**
 * Security health check
 */
export const performSecurityHealthCheck = (): {
  healthy: boolean;
  checks: { [key: string]: boolean };
  warnings: string[];
} => {
  const config = getSecurityConfig();
  const checks: { [key: string]: boolean } = {};
  const warnings: string[] = [];

  // Check critical security features
  checks.helmet = config.helmet.enabled;
  checks.cors = config.cors.enabled;
  checks.rateLimit = config.rateLimit.enabled;
  checks.passwordBreachCheck = config.password.checkBreaches;
  checks.emailVerification = config.auth.requireEmailVerification;
  checks.tokenRotation = config.session.rotateTokens;
  checks.securityLogging = config.monitoring.logSecurityEvents;

  // Collect warnings
  if (!config.helmet.enabled) {
    warnings.push('Helmet security headers are disabled');
  }

  if (config.cors.origin === '*') {
    warnings.push('CORS is configured to allow all origins (development mode?)');
  }

  if (!config.password.checkBreaches) {
    warnings.push('Password breach checking is disabled');
  }

  if (!config.auth.requireEmailVerification) {
    warnings.push('Email verification is not required');
  }

  if (config.password.minLength < 8) {
    warnings.push('Password minimum length is less than 8 characters');
  }

  if (!config.session.rotateTokens) {
    warnings.push('Token rotation is disabled');
  }

  if (!config.monitoring.logSecurityEvents) {
    warnings.push('Security event logging is disabled');
  }

  if (process.env.NODE_ENV === 'production' && warnings.length > 0) {
    warnings.push('WARNING: Production environment has security configuration issues');
  }

  const healthy = Object.values(checks).every((check) => check === true) && warnings.length === 0;

  return {
    healthy,
    checks,
    warnings,
  };
};

/**
 * Get security configuration summary
 */
export const getSecuritySummary = (): any => {
  const config = getSecurityConfig();

  return {
    environment: process.env.NODE_ENV || 'development',
    authentication: {
      accessTokenExpiry: config.auth.accessTokenExpiry,
      refreshTokenExpiry: config.auth.refreshTokenExpiry,
      maxLoginAttempts: config.auth.maxLoginAttempts,
      lockoutDuration: `${config.auth.lockoutDuration / 60} minutes`,
      requireEmailVerification: config.auth.requireEmailVerification,
      require2FA: config.auth.require2FA,
    },
    passwordPolicy: {
      minLength: config.password.minLength,
      complexity: {
        uppercase: config.password.requireUppercase,
        lowercase: config.password.requireLowercase,
        numbers: config.password.requireNumbers,
        specialChars: config.password.requireSpecialChars,
      },
      breachCheck: config.password.checkBreaches,
      expiryDays: config.password.expiryDays,
    },
    rateLimit: {
      enabled: config.rateLimit.enabled,
      window: `${config.rateLimit.windowMs / 1000 / 60} minutes`,
      maxRequests: config.rateLimit.maxRequests,
    },
    security: {
      helmet: config.helmet.enabled,
      cors: config.cors.enabled,
      tokenRotation: config.session.rotateTokens,
      tokenReuseDetection: config.session.detectTokenReuse,
      apiVersioning: config.api.versioning,
    },
    fileUpload: {
      maxFileSize: `${config.fileUpload.maxFileSize / 1024 / 1024} MB`,
      maxFiles: config.fileUpload.maxFiles,
      virusScan: config.fileUpload.virusScanEnabled,
      magicNumberCheck: config.fileUpload.magicNumberCheck,
    },
    monitoring: {
      securityEvents: config.monitoring.logSecurityEvents,
      suspiciousActivity: config.monitoring.alertOnSuspiciousActivity,
      metrics: config.monitoring.metricsEnabled,
    },
  };
};

export default {
  initializeSecurity,
  applyErrorHandling,
  performSecurityHealthCheck,
  getSecuritySummary,
};
