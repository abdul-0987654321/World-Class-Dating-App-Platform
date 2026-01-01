import express, { Application, Request, Response } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import logger from './utils/logger';
import authRoutes from './api/routes/auth.routes';
import profileRoutes from './api/routes/profile.routes';
import verificationRoutes from './api/routes/verification.routes';
import phoneVerificationRoutes from './api/routes/phone-verification.routes';
import passwordResetRoutes from './api/routes/password-reset.routes';
import photoRoutes from './api/routes/photo.routes';
import promptRoutes from './api/routes/prompt.routes';
import swipeRoutes from './api/routes/swipe.routes';
import matchRoutes from './api/routes/match.routes';
import discoveryRoutes from './api/routes/discovery.routes';
import messagingRoutes from './api/routes/messaging.routes';
import subscriptionRoutes from './api/routes/subscription.routes';
import coinRoutes from './api/routes/coin.routes';
import boostRoutes from './api/routes/boost.routes';
import privacyRoutes from './api/routes/privacy.routes';
import blockRoutes from './api/routes/block.routes';
import reportRoutes from './api/routes/report.routes';
import safetyRoutes from './api/routes/safety.routes';
import usageLimitRoutes from './api/routes/usage-limit.routes';
import internalRoutes from './api/routes/internal.routes';
import achievementsRoutes from './api/routes/achievements.routes';
import badgeRoutes from './api/routes/interestIntentionBadge.routes';
import gemRoutes from './api/routes/gem.routes';
import { generalLimiter } from './api/middleware/rate-limit.middleware';
import swaggerSpec from './config/swagger.config';
import { uploadService } from './infrastructure/storage/upload.service';
import { initializeSocket } from './infrastructure/websocket/socket.config';
import { initializeEncryptionKey } from './utils/encryption';
import { createValidator, commonValidations } from '@flamoral/backend-shared';
import db from './infrastructure/database/connection';

// Load environment variables
dotenv.config();

// Validate environment variables at startup
const validator = createValidator('user-service', [
  commonValidations.nodeEnv,
  commonValidations.port(3001),
  commonValidations.jwtAccessSecret,
  commonValidations.jwtRefreshSecret,
  commonValidations.dbHost,
  commonValidations.dbPort,
  commonValidations.dbPassword,
  commonValidations.redisHost,
  commonValidations.azureStorageAccount,
  commonValidations.azureStorageKey,
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

// Initialize encryption key for TOTP/2FA
try {
  initializeEncryptionKey();
  logger.info('TOTP encryption key initialized');
} catch (error) {
  logger.error('Failed to initialize TOTP encryption key:', error);
  logger.error('TOTP/2FA functionality will not work. Please set TOTP_ENCRYPTION_MASTER_KEY and TOTP_ENCRYPTION_KEY_SALT in environment variables.');
}

// Create Express app
const app: Application = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

  const healthy = Object.values(checks).every(v => v);
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    service: 'user-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
  });
});

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Flamoral User Service API Documentation',
}));

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
      usageLimits: '/api/v1/usage-limits',
      internal: '/api/v1/internal',
      badges: '/api/v1/badges',
      achievements: '/api/v1/achievements',
      gems: '/api/v1/gems',
    },
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/verification', verificationRoutes);
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
app.use('/api/v1/gems', gemRoutes);

// Internal service-to-service routes (no rate limiting)
app.use('/api/v1/internal', internalRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
  });
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: any) => {
  logger.error('Unhandled error:', err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
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

  // Initialize upload service (Azure Blob Storage)
  try {
    await uploadService.initialize();
    logger.info('Upload service initialized successfully');
  } catch (error) {
    logger.warn('Upload service initialization failed - photo uploads may not work');
    logger.warn('Make sure Azure Storage credentials are configured in .env');
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
