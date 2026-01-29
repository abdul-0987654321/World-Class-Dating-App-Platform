import 'reflect-metadata';
import {
  createLogger,
  createValidator,
  commonValidations,
  correlationIdMiddleware,
  errorHandlerMiddleware,
  notFoundHandler,
  initializeGlobalErrorHandlers,
} from '@flamoral/backend-shared';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';

import chemistryRoutes from './api/routes/chemistry.routes';
import curatedPicksRoutes from './api/routes/curated-picks.routes';
import internalRoutes from './api/routes/internal.routes';
import matchRoutes from './api/routes/match.routes';
import passportRoutes from './api/routes/passport.routes';
import recommendationRoutes from './api/routes/recommendation.routes';
import rewindRoutes from './api/routes/rewind.routes';
import searchRoutes from './api/routes/search.routes';
import speedDatingRoutes from './api/routes/speed-dating.routes';
import swipeRoutes from './api/routes/swipe.routes';
import config from './config';
import db from './infrastructure/database/connection';
import matchExpirationJob from './jobs/match-expiration.job';
import speedDatingJob from './jobs/speed-dating.job';

// Load environment variables
dotenv.config();

// Validate environment variables at startup
const validator = createValidator('matching-service', [
  commonValidations.nodeEnv,
  commonValidations.port(3002),
  commonValidations.jwtAccessSecret,
  commonValidations.databaseUrl,
  commonValidations.dbHost,
  commonValidations.dbPort,
  {
    name: 'DB_NAME',
    required: true,
    description: 'PostgreSQL database name for matching service',
  },
  {
    name: 'DB_USER',
    required: true,
    description: 'PostgreSQL database user',
  },
  commonValidations.dbPassword,
  commonValidations.redisUrl,
  commonValidations.redisHost,
  commonValidations.redisPort,
]);
validator.validateOrThrow();

// Ensure either DATABASE_URL or DB_HOST+DB_PASSWORD is set
if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
  throw new Error('[matching-service] Either DATABASE_URL or DB_HOST + DB_PASSWORD must be set');
}

// Initialize logger
const logger = createLogger('matching-service');

// Initialize global error handlers for uncaught exceptions
initializeGlobalErrorHandlers();

// Create Express app
const app: Application = express();
const PORT = config.port;

// CORS allowed origins - production domains required
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || (
  isProduction
    ? ['https://flamoral.com', 'https://www.flamoral.com', 'https://app.flamoral.com']
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000']
);

// Core middleware
app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins,
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
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Correlation ID middleware - must be early in the chain
app.use(correlationIdMiddleware);

// Health check endpoint (before auth)
app.get('/health', async (_req: Request, res: Response) => {
  const checks = {
    database: false,
  };

  try {
    // Check database connection
    await db.raw('SELECT 1');
    checks.database = true;
  } catch (e) {
    logger.error('Database health check failed', e);
  }

  const healthy = Object.values(checks).every((v) => v);
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    service: 'matching-service',
    timestamp: new Date().toISOString(),
    checks,
  });
});

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'Flamoral Matching Service',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      swipes: '/api/v1/swipes',
      rewind: '/api/v1/swipes/rewind',
      matches: '/api/v1/matches',
      recommendations: '/api/v1/recommendations',
      search: '/api/v1/search',
      speedDating: '/api/v1/speed-dating',
      curatedPicks: '/api/v1/discovery/curated-picks',
      passport: '/api/v1/discovery/passport',
      chemistry: '/api/v1/matching/chemistry',
    },
  });
});

// API Routes
app.use('/api/v1/swipes', swipeRoutes);
app.use('/api/v1/swipes/rewind', rewindRoutes);
app.use('/api/v1/matches', matchRoutes);
app.use('/api/v1/recommendations', recommendationRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/speed-dating', speedDatingRoutes);
app.use('/api/v1/discovery/curated-picks', curatedPicksRoutes);
app.use('/api/v1/discovery/passport', passportRoutes);
app.use('/api/v1/matching/chemistry', chemistryRoutes);

// Internal API Routes (service-to-service)
app.use('/api/v1/internal/matches', internalRoutes);

// 404 handler for unmatched routes
app.use(notFoundHandler);

// Global error handling middleware - MUST be last
app.use(errorHandlerMiddleware);

// Start server
app.listen(PORT, () => {
  logger.info(`Matching Service running on port ${PORT}`);
  logger.info(`Environment: ${config.nodeEnv}`);
  logger.info(`Database: ${config.database.host}:${config.database.port}/${config.database.name}`);

  // Start match expiration jobs
  matchExpirationJob.startAll();
  logger.info('Match expiration jobs initialized');

  // Start speed dating jobs
  speedDatingJob.startAll();
  logger.info('Speed dating jobs initialized');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  matchExpirationJob.stopAll();
  speedDatingJob.stopAll();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  matchExpirationJob.stopAll();
  speedDatingJob.stopAll();
  process.exit(0);
});

export default app;
