import 'reflect-metadata';
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createLogger } from '@flamoral/backend-shared';
import { createValidator, commonValidations } from '@flamoral/backend-shared';
import mediaRoutes from './api/routes/media.routes';
import azureStorageService from './infrastructure/storage/azure-storage.service';
import workerManager from './workers/worker-manager';
import config from './config';
import db from './infrastructure/database/connection';

// Load environment variables
dotenv.config();

// Validate environment variables at startup
const validator = createValidator('media-service', [
  commonValidations.nodeEnv,
  commonValidations.port(3005),
  commonValidations.jwtAccessSecret,
  commonValidations.azureStorageAccount,
  commonValidations.azureStorageKey,
  {
    name: 'AZURE_CONTAINER_NAME',
    required: true,
    description: 'Azure Storage container name for media files',
  },
  {
    name: 'AZURE_CV_ENDPOINT',
    required: true,
    description: 'Azure Computer Vision endpoint for content moderation',
    validate: (value: string) => value.startsWith('https://'),
  },
  {
    name: 'AZURE_CV_API_KEY',
    required: true,
    description: 'Azure Computer Vision API key',
    sensitive: true,
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
app.get('/health', async (_req: Request, res: Response) => {
  const checks = {
    database: false,
    azureStorage: false,
  };

  try {
    // Check database connection
    await db.raw('SELECT 1');
    checks.database = true;
  } catch (e) {
    logger.error('Database health check failed', e);
  }

  try {
    // Check Azure Storage - verify service is initialized
    // We don't make an actual call to avoid unnecessary costs
    if (azureStorageService['initialized']) {
      checks.azureStorage = true;
    }
  } catch (e) {
    logger.error('Azure Storage health check failed', e);
  }

  const healthy = Object.values(checks).every(v => v);
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

// Initialize Azure Storage
azureStorageService
  .initialize()
  .then(() => {
    logger.info('Azure Storage initialized successfully');
  })
  .catch((error) => {
    logger.error('Failed to initialize Azure Storage', error);
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
