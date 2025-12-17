import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createLogger } from '@flamoral/shared';
import swipeRoutes from './api/routes/swipe.routes';
import matchRoutes from './api/routes/match.routes';
import recommendationRoutes from './api/routes/recommendation.routes';
import searchRoutes from './api/routes/search.routes';
import internalRoutes from './api/routes/internal.routes';
import boostRoutes from './api/routes/boost.routes';
import superLikeRoutes from './api/routes/super-like.routes';
import insightsRoutes from './api/routes/insights.routes';
import config from './config';
import matchExpirationJob from './jobs/match-expiration.job';
import redisClient from './infrastructure/cache/redis.client';

// Load environment variables
dotenv.config();

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
      swipes: '/api/swipes',
      matches: '/api/matches',
      recommendations: '/api/recommendations',
      search: '/api/search',
    },
  });
});

// API Routes
app.use('/api/swipes', swipeRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/boosts', boostRoutes);
app.use('/api/super-likes', superLikeRoutes);
app.use('/api/insights', insightsRoutes);

// Internal API Routes (service-to-service)
app.use('/api/internal/matches', internalRoutes);

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: any): void => {
  logger.error('Unhandled error', err);

  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// Start server
app.listen(PORT, async () => {
  logger.info(`Matching Service running on port ${PORT}`);
  logger.info(`Environment: ${config.nodeEnv}`);
  logger.info(`Database: ${config.database.host}:${config.database.port}/${config.database.name}`);

  // Initialize Redis cache
  try {
    await redisClient.connect();
    logger.info('Redis cache initialized');
  } catch (error) {
    logger.warn('Redis cache initialization failed, service will run without caching', error);
  }

  // Start match expiration jobs
  matchExpirationJob.startAll();
  logger.info('Match expiration jobs initialized');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  matchExpirationJob.stopAll();
  await redisClient.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  matchExpirationJob.stopAll();
  await redisClient.disconnect();
  process.exit(0);
});

export default app;
