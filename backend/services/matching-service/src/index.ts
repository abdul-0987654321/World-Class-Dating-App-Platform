import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createLogger } from '@flamoral/shared';
import { createValidator, commonValidations } from '../../../shared/utils/env-validator';
import swipeRoutes from './api/routes/swipe.routes';
import matchRoutes from './api/routes/match.routes';
import recommendationRoutes from './api/routes/recommendation.routes';
import searchRoutes from './api/routes/search.routes';
import internalRoutes from './api/routes/internal.routes';
import config from './config';
import matchExpirationJob from './jobs/match-expiration.job';

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

// Create Express app
const app: Application = express();
const PORT = config.port;

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];
app.use(helmet());
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'matching-service',
    timestamp: new Date().toISOString(),
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
      matches: '/api/v1/matches',
      recommendations: '/api/v1/recommendations',
      search: '/api/v1/search',
    },
  });
});

// API Routes
app.use('/api/v1/swipes', swipeRoutes);
app.use('/api/v1/matches', matchRoutes);
app.use('/api/v1/recommendations', recommendationRoutes);
app.use('/api/v1/search', searchRoutes);

// Internal API Routes (service-to-service)
app.use('/api/v1/internal/matches', internalRoutes);

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: any): void => {
  logger.error('Unhandled error', err);

  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Matching Service running on port ${PORT}`);
  logger.info(`Environment: ${config.nodeEnv}`);
  logger.info(`Database: ${config.database.host}:${config.database.port}/${config.database.name}`);

  // Start match expiration jobs
  matchExpirationJob.startAll();
  logger.info('Match expiration jobs initialized');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  matchExpirationJob.stopAll();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  matchExpirationJob.stopAll();
  process.exit(0);
});

export default app;
