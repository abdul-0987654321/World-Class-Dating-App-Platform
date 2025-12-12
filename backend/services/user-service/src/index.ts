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
import usageLimitRoutes from './api/routes/usage-limit.routes';
import internalRoutes from './api/routes/internal.routes';
import achievementsRoutes from './api/routes/achievements.routes';
import badgeRoutes from './api/routes/interestIntentionBadge.routes';
import { generalLimiter } from './api/middleware/rate-limit.middleware';
import swaggerSpec from './config/swagger.config';
import { uploadService } from './infrastructure/storage/upload.service';
import { initializeSocket } from './infrastructure/websocket/socket.config';
import { initializeEncryptionKey } from './utils/encryption';

// Load environment variables
dotenv.config();

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
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'user-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
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
      auth: '/api/auth',
      profile: '/api/profile',
      verification: '/api/verification',
      phone: '/api/phone',
      passwordReset: '/api/password-reset',
      photos: '/api/photos',
      prompts: '/api/prompts',
      swipes: '/api/swipes',
      matches: '/api/matches',
      discovery: '/api/discovery',
      messages: '/api/messages',
      subscriptions: '/api/subscriptions',
      coins: '/api/coins',
      boosts: '/api/boosts',
      privacy: '/api/privacy',
      blocks: '/api/blocks',
      reports: '/api/reports',
      usageLimits: '/api/usage-limits',
      internal: '/api/internal',
      badges: '/api/badges',
      achievements: '/api/achievements',
    },
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/phone', phoneVerificationRoutes);
app.use('/api/password-reset', passwordResetRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/prompts', promptRoutes);
app.use('/api/swipes', swipeRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/discovery', discoveryRoutes);
app.use('/api/messages', messagingRoutes);

// Phase 1 monetization & safety routes
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/coins', coinRoutes);
app.use('/api/boosts', boostRoutes);
app.use('/api/privacy', privacyRoutes);
app.use('/api/blocks', blockRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/usage-limits', usageLimitRoutes);

app.use('/api/badges', badgeRoutes);
// Gamification routes
app.use('/api/achievements', achievementsRoutes);

// Internal service-to-service routes (no rate limiting)
app.use('/api/internal', internalRoutes);

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
  logger.info(`API endpoints available at http://localhost:${PORT}/api`);
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
