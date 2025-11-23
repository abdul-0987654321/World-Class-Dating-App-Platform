import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createLogger } from '@connectsphere/shared';
import swipeRoutes from './api/routes/swipe.routes';
import matchRoutes from './api/routes/match.routes';
import recommendationRoutes from './api/routes/recommendation.routes';
import config from './config';

// Load environment variables
dotenv.config();

// Initialize logger
const logger = createLogger('matching-service');

// Create Express app
const app: Application = express();
const PORT = config.port;

// Middleware
app.use(helmet());
app.use(cors());
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
    service: 'ConnectSphere Matching Service',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      swipes: '/api/swipes',
      matches: '/api/matches',
      recommendations: '/api/recommendations',
    },
  });
});

// API Routes
app.use('/api/swipes', swipeRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/recommendations', recommendationRoutes);

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
