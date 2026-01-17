import 'reflect-metadata';
import { createLogger, createValidator, commonValidations } from '@flamoral/backend-shared';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';

import mediaRoutes from './api/routes/media.routes';
import config from './config';
import db from './infrastructure/database/connection';
import s3StorageService from './infrastructure/storage/s3-storage.service';
import workerManager from './workers/worker-manager';

// Load environment variables
dotenv.config();

// Validate environment variables at startup
const validator = createValidator('media-service', [
  commonValidations.nodeEnv,
  commonValidations.port(3005),
  commonValidations.jwtAccessSecret,
  {
    name: 'AWS_REGION',
    required: false,
    description: 'AWS region for S3 storage',
    defaultValue: 'us-east-1',
  },
  {
    name: 'AWS_S3_BUCKET_MEDIA',
    required: false,
    description: 'AWS S3 bucket for media files',
    defaultValue: 'flamoral-media',
  },
  commonValidations.redisHost,
  commonValidations.redisPort,
]);
validator.validateOrThrow();

// Initialize logger
const logger = createLogger('media-service');

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

// Middleware
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
    maxAge: 86400,
  })
);
app.use(express.json({ limit: '10mb' })); // Media service needs larger limit for base64 encoded images
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', async (_req: Request, res: Response) => {
  const checks = {
    database: false,
    s3Storage: true, // S3 uses IAM roles, no explicit initialization needed
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
    service: 'media-service',
    timestamp: new Date().toISOString(),
    checks,
  });
});

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'Flamoral Media Service',
    version: '1.0.0',
    status: 'running',
  });
});

// API Routes
app.use('/api/v1/media', mediaRoutes);

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: any): void => {
  logger.error('Unhandled error', err);

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({
      success: false,
      error: `File size exceeds limit of ${config.upload.maxFileSize / 1024 / 1024}MB`,
    });
    return;
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    res.status(400).json({
      success: false,
      error: 'Unexpected file field',
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// Initialize S3 Storage
s3StorageService
  .initialize()
  .then(() => {
    logger.info('S3 Storage initialized successfully');
  })
  .catch((error) => {
    logger.error('Failed to initialize S3 Storage', error);
  });

// Start background workers
try {
  workerManager.startAll();
  logger.info('Background workers started successfully');
} catch (error) {
  logger.error('Failed to start background workers', error);
}

// Start server
app.listen(PORT, () => {
  logger.info(`Media Service running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  await workerManager.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  await workerManager.shutdown();
  process.exit(0);
});

export default app;
