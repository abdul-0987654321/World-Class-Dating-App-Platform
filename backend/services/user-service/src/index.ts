import { createServer } from 'http';

import { createValidator, commonValidations } from '@flamoral/backend-shared';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { v4 as uuidv4 } from 'uuid';

import { generalLimiter } from './api/middleware/rate-limit.middleware';
import achievementsRoutes from './api/routes/achievements.routes';
import authRoutes from './api/routes/auth.routes';
import backgroundCheckRoutes from './api/routes/background-check.routes';
import blockRoutes from './api/routes/block.routes';
import boostRoutes from './api/routes/boost.routes';
import challengeRoutes from './api/routes/challenge.routes';
import coinRoutes from './api/routes/coin.routes';
import communityRoutes from './api/routes/community.routes';
import dailyRewardRoutes from './api/routes/dailyReward.routes';
import datePlanningRoutes from './api/routes/date-planning.routes';
import discoveryRoutes from './api/routes/discovery.routes';
import documentVerificationRoutes from './api/routes/document-verification.routes';
import eliteRoutes from './api/routes/elite.routes';
import gamificationRoutes from './api/routes/gamification.routes';
import gemRoutes from './api/routes/gem.routes';
import idVerificationRoutes from './api/routes/id-verification.routes';
import badgeRoutes from './api/routes/interestIntentionBadge.routes';
import internalRoutes from './api/routes/internal.routes';
import matchRoutes from './api/routes/match.routes';
import messagingRoutes from './api/routes/messaging.routes';
import passwordResetRoutes from './api/routes/password-reset.routes';
import phoneVerificationRoutes from './api/routes/phone-verification.routes';
import photoRoutes from './api/routes/photo.routes';
import privacyRoutes from './api/routes/privacy.routes';
import profileRoutes from './api/routes/profile.routes';
import promptRoutes from './api/routes/prompt.routes';
import referralRoutes from './api/routes/referral.routes';
import reportRoutes from './api/routes/report.routes';
import safetyRoutes from './api/routes/safety.routes';
import subscriptionRoutes from './api/routes/subscription.routes';
import swipeRoutes from './api/routes/swipe.routes';
import usageLimitRoutes from './api/routes/usage-limit.routes';
import verificationRoutes from './api/routes/verification.routes';
import swaggerSpec from './config/swagger.config';
import db from './infrastructure/database/connection';
import { uploadService } from './infrastructure/storage/upload.service';
import { initializeSocket } from './infrastructure/websocket/socket.config';
import { initializeEncryptionKey } from './utils/encryption';
import logger from './utils/logger';

// Load environment variables
dotenv.config();

// Validate environment variables at startup
const validator = createValidator('user-service', [
  commonValidations.nodeEnv,
  commonValidations.port(3001),
  commonValidations.jwtAccessSecret,
  commonValidations.jwtRefreshSecret,
  commonValidations.databaseUrl,
  commonValidations.dbHost,
  commonValidations.dbPort,
  commonValidations.dbPassword,
  commonValidations.redisUrl,
  commonValidations.redisHost,
  {
    name: 'TOTP_ENCRYPTION_MASTER_KEY',
    required: true,
    description: '2FA/TOTP encryption master key (minimum 32 characters)',
    minLength: 32,
    sensitive: true,
  },
  {
    name: 'TOTP_ENCRYPTION_KEY_SALT',
    required: true,
    description: '2FA/TOTP encryption key salt',
    minLength: 16,
    sensitive: true,
  },
]);
validator.validateOrThrow();

// Ensure either DATABASE_URL or DB_HOST+DB_PASSWORD is set
if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
  throw new Error('[user-service] Either DATABASE_URL or DB_HOST + DB_PASSWORD must be set');
}

// Initialize encryption key for TOTP/2FA
try {
  initializeEncryptionKey();
  logger.info('TOTP encryption key initialized');
} catch (error) {
  logger.error('Failed to initialize TOTP encryption key:', error);
  logger.error(
    'TOTP/2FA functionality will not work. Please set TOTP_ENCRYPTION_MASTER_KEY and TOTP_ENCRYPTION_KEY_SALT in environment variables.'
  );
}

// Create Express app
const app: Application = express();
const PORT = process.env.PORT || 3001;

// CORS allowed origins - production domains required
const corsOrigins = process.env.CORS_ORIGINS?.split(',') || (
  process.env.NODE_ENV === 'production'
    ? ['https://flamoral.com', 'https://www.flamoral.com', 'https://app.flamoral.com']
    : ['http://localhost:3000', 'http://localhost:5173']
);

// Correlation ID middleware - add to every request for distributed tracing
app.use((req: Request, res: Response, next: NextFunction) => {
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
  (req as any).correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  next();
});

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Service-Key',
      'X-Requested-With',
      'X-Request-ID',
      'X-Correlation-ID',
      'X-CSRF-Token',
      'x-csrf-token',
    ],
    exposedHeaders: [
      'X-Request-ID',
      'X-Correlation-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'X-CSRF-Token',
    ],
    maxAge: 86400, // 24 hours - cache preflight
  })
);
app.use(express.json({ limit: '5mb' })); // Allow larger payloads for profile data
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Rate limiting
app.use(generalLimiter);

// Health check endpoint
app.get('/health', async (_req: Request, res: Response) => {
  const checks = {
    database: false,
  };

  try {
    // Check database connection
    await db.raw('SELECT 1');
    checks.database = true;
  } catch (e) {
    logger.error('Database health check failed:', e);
  }

  const healthy = Object.values(checks).every((v) => v);
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    service: 'user-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
  });
});

// Swagger Documentation
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Flamoral User Service API Documentation',
  })
);

// Swagger JSON endpoint
app.get('/api-docs.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'Flamoral User Service',
    version: '1.0.0',
    status: 'running',
    documentation: '/api-docs',
    endpoints: {
      health: '/health',
      docs: '/api-docs',
      docsJson: '/api-docs.json',
      auth: '/api/v1/auth',
      profile: '/api/v1/profile',
      verification: '/api/v1/verification',
      idVerification: '/api/v1/verification/id',
      documentVerification: '/api/v1/verification/document',
      backgroundCheck: '/api/v1/verification/background',
      phone: '/api/v1/phone',
      passwordReset: '/api/v1/password-reset',
      photos: '/api/v1/photos',
      prompts: '/api/v1/prompts',
      swipes: '/api/v1/swipes',
      matches: '/api/v1/matches',
      discovery: '/api/v1/discovery',
      messages: '/api/v1/messages',
      subscriptions: '/api/v1/subscriptions',
      coins: '/api/v1/coins',
      boosts: '/api/v1/boosts',
      privacy: '/api/v1/privacy',
      blocks: '/api/v1/blocks',
      reports: '/api/v1/reports',
      safety: '/api/v1/safety',
      usageLimits: '/api/v1/usage-limits',
      internal: '/api/v1/internal',
      badges: '/api/v1/badges',
      achievements: '/api/v1/achievements',
      gems: '/api/v1/gems',
      communities: '/api/v1/communities',
      tenants: '/api/v1/tenants',
      referrals: '/api/v1/referrals',
      challenges: '/api/v1/challenges',
      dates: '/api/v1/dates',
      elite: '/api/v1/elite',
      dailyRewards: '/api/v1/daily-rewards',
      gamification: '/api/v1/gamification',
    },
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/verification', verificationRoutes);
app.use('/api/v1/verification/id', idVerificationRoutes);
app.use('/api/v1/verification/document', documentVerificationRoutes);
app.use('/api/v1/verification/background', backgroundCheckRoutes);
app.use('/api/v1/phone', phoneVerificationRoutes);
app.use('/api/v1/password-reset', passwordResetRoutes);
app.use('/api/v1/photos', photoRoutes);
app.use('/api/v1/prompts', promptRoutes);
app.use('/api/v1/swipes', swipeRoutes);
app.use('/api/v1/matches', matchRoutes);
app.use('/api/v1/discovery', discoveryRoutes);
app.use('/api/v1/messages', messagingRoutes);

// Phase 1 monetization & safety routes
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/coins', coinRoutes);
app.use('/api/v1/boosts', boostRoutes);
app.use('/api/v1/privacy', privacyRoutes);
app.use('/api/v1/blocks', blockRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/safety', safetyRoutes);
app.use('/api/v1/usage-limits', usageLimitRoutes);

app.use('/api/v1/badges', badgeRoutes);
// Gamification routes
app.use('/api/v1/achievements', achievementsRoutes);
app.use('/api/v1/challenges', challengeRoutes);
app.use('/api/v1/gems', gemRoutes);
app.use('/api/v1/communities', communityRoutes);
// Tenant alias for /communities (OpenAPI compatibility)
app.use('/api/v1/tenants', communityRoutes);
app.use('/api/v1/referrals', referralRoutes);

// Date planning routes
app.use('/api/v1/dates', datePlanningRoutes);

// Elite tier routes (VIP Events, Dating Coach, Concierge)
app.use('/api/v1/elite', eliteRoutes);

// Daily rewards and gamification routes
app.use('/api/v1/daily-rewards', dailyRewardRoutes);
app.use('/api/v1/gamification', gamificationRoutes);

// Internal service-to-service routes (no rate limiting)
app.use('/api/v1/internal', internalRoutes);

// 404 handler - returns standardized error response
app.use((req: Request, res: Response) => {
  const correlationId = (req as any).correlationId || uuidv4();
  res.setHeader('X-Correlation-ID', correlationId);
  res.status(404).json({
    success: false,
    error: {
      code: 'RESOURCE_NOT_FOUND',
      message: `Cannot ${req.method} ${req.path}`,
      correlationId,
      timestamp: new Date().toISOString(),
    },
  });
});

// Global error handler - returns standardized error response
app.use((err: Error & { status?: number; statusCode?: number; code?: string }, req: Request, res: Response, _next: NextFunction) => {
  const correlationId = (req as any).correlationId || uuidv4();
  const statusCode = err.status || err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Determine error code
  let errorCode = err.code || 'INTERNAL_ERROR';
  if (!err.code) {
    if (statusCode === 400) errorCode = 'VALIDATION_FAILED';
    else if (statusCode === 401) errorCode = 'AUTH_TOKEN_INVALID';
    else if (statusCode === 403) errorCode = 'PERM_DENIED';
    else if (statusCode === 404) errorCode = 'RESOURCE_NOT_FOUND';
    else if (statusCode === 429) errorCode = 'RATE_LIMIT_EXCEEDED';
  }

  // Log server errors with full details
  if (statusCode >= 500) {
    logger.error('Server error:', {
      error: err.message,
      stack: err.stack,
      correlationId,
      path: req.path,
      method: req.method,
      userId: (req as any).user?.userId,
    });
  } else {
    logger.warn('Client error:', {
      error: err.message,
      correlationId,
      path: req.path,
      method: req.method,
    });
  }

  // Sanitize message for production
  const message = isProduction && statusCode >= 500
    ? 'An unexpected error occurred. Please try again.'
    : err.message || 'Internal server error';

  res.setHeader('X-Correlation-ID', correlationId);
  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      correlationId,
      timestamp: new Date().toISOString(),
    },
  });
});

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO
initializeSocket(httpServer);

// Start server
httpServer.listen(PORT, async () => {
  logger.info(`User Service running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`API endpoints available at http://localhost:${PORT}/api/v1`);
  logger.info(`WebSocket server initialized for real-time messaging`);

  // Initialize upload service (AWS S3)
  try {
    await uploadService.initialize();
    logger.info('Upload service initialized successfully');
  } catch (error) {
    logger.warn('Upload service initialization failed - photo uploads may not work');
    logger.warn('Make sure AWS credentials are configured in .env');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

export default app;
