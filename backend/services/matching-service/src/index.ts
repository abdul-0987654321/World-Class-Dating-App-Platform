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
  commonValidations.redisHost,
  commonValidations.redisPort,
]);
validator.validateOrThrow();

// Initialize logger
const logger = createLogger('matching-service');

// Initialize global error handlers for uncaught exceptions
initializeGlobalErrorHandlers();

// Create Express app
const app: Application = express();
const PORT = config.port;

// Core middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
];
app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID', 'X-Request-ID'],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
