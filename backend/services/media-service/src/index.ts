import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createLogger } from '@flamoral/shared';
import mediaRoutes from './api/routes/media.routes';
import azureStorageService from './infrastructure/storage/azure-storage.service';
import workerManager from './workers/worker-manager';
import config from './config';

// Load environment variables
dotenv.config();

// Initialize logger
const logger = createLogger('media-service');

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
    service: 'media-service',
    timestamp: new Date().toISOString(),
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
app.use('/api/media', mediaRoutes);

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
