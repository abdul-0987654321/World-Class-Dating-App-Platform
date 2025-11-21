/**
 * Express App Configuration
 * REST API setup with middleware and routes
 */

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { logger, httpLogger } from './utils/logger';
import { errorHandler } from './middleware/error.middleware';
import { notFoundHandler } from './middleware/notFound.middleware';

// Security middleware
import {
  sqlInjectionPrevention,
  xssProtection,
  noSQLInjectionPrevention,
  requestSizeLimiter,
  secureHeaders,
  ipBlacklist,
  sessionSecurity,
  validateContentType,
  requestId,
  securityAuditLogger,
} from './middleware/security.middleware';

import { CSRFProtection } from './middleware/csrf.middleware';

// API Routes
import authRoutes from './api/rest/auth.routes';
import userRoutes from './api/rest/user.routes';
import profileRoutes from './api/rest/profile.routes';
import matchingRoutes from './api/rest/matching.routes';
import messagingRoutes from './api/rest/messaging.routes';
import mediaRoutes from './api/rest/media.routes';
import paymentRoutes from './api/rest/payment.routes';
import analyticsRoutes from './api/rest/analytics.routes';
import healthRoutes from './api/rest/health.routes';

// Swagger documentation
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { swaggerOptions } from './config/swagger.config';

export function createApp(): Application {
  const app = express();

  // 1. Request tracking & early logging
  app.use(requestId);
  app.use(securityAuditLogger);

  // 2. Secure headers & helmet
  app.use(secureHeaders);
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // 3. IP filtering & request size limiting
  app.use(ipBlacklist);
  app.use(requestSizeLimiter);

  // 4. Rate limiting
  const limiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        message: 'Too many requests, please try again later',
        code: 'RATE_LIMIT_EXCEEDED',
      },
    },
  });
  app.use(limiter);

  // 5. CORS configuration
  const corsOptions = {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: process.env.CORS_CREDENTIALS === 'true',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'CSRF-Token'],
    exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page', 'X-Request-ID'],
    maxAge: 86400, // 24 hours
  };
  app.use(cors(corsOptions));

  // 6. Content type validation
  app.use(validateContentType);

  // 7. Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 8. Input sanitization & injection prevention
  app.use(sqlInjectionPrevention);
  app.use(xssProtection);
  app.use(noSQLInjectionPrevention);

  // 9. Session security
  app.use(sessionSecurity);

  // 10. HTTP request logging
  app.use(httpLogger);

  // API Documentation
  const swaggerSpec = swaggerJsdoc(swaggerOptions);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Health check endpoint (no auth required)
  app.use('/health', healthRoutes);

  // CSRF token endpoint (requires auth)
  // Usage: GET /api/csrf-token with Authorization header
  // Returns: { success: true, data: { csrfToken: "..." } }
  app.get('/api/csrf-token', CSRFProtection.getTokenEndpoint);

  // API Routes
  // Note: Individual routes should apply AuthMiddleware.verifyToken and CSRFProtection.protect() as needed
  // Example in route file:
  //   router.post('/profile', AuthMiddleware.verifyToken, CSRFProtection.protect(), controller.update)
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/profiles', profileRoutes);
  app.use('/api/matching', matchingRoutes);
  app.use('/api/messages', messagingRoutes);
  app.use('/api/media', mediaRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/analytics', analyticsRoutes);

  // 404 handler
  app.use(notFoundHandler);

  // Error handling middleware (must be last)
  app.use(errorHandler);

  logger.info('Express app configured successfully');

  return app;
}
