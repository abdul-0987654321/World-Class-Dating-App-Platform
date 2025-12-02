import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import moderationRoutes from './routes/moderation.routes';
import internalRoutes from './routes/internal.routes';
import config from './config';
import { createLogger } from '@flamoral/shared';

// Load environment variables
dotenv.config();

// Initialize logger
const logger = createLogger('moderation-service');

// Create Express app
const app: Application = express();
const PORT = config.port;

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: config.cors.origins,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'moderation-service',
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'Flamoral Content Moderation Service',
    version: '1.0.0',
    status: 'running',
    features: [
      'AI-powered image moderation (AWS Rekognition)',
      'Text content moderation (Azure Content Moderator)',
      'Auto-flag/reject inappropriate content',
      'User violation tracking',
      'Auto-suspension/ban system',
      'Moderation queue for manual review',
    ],
  });
});

// API Routes
app.use('/api/moderation', moderationRoutes);

// Internal API Routes (service-to-service)
app.use('/api/internal/moderation', internalRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: any) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: config.nodeEnv === 'development' ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Moderation Service running on port ${PORT}`);
  logger.info(`Environment: ${config.nodeEnv}`);
  logger.info('AWS Rekognition: ' + (config.aws.accessKeyId ? 'Configured' : 'Not configured'));
  logger.info(
    'Azure Content Moderator: ' +
      (config.azure.contentModerator.apiKey ? 'Configured' : 'Not configured')
  );
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
