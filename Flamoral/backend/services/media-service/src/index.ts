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
const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://localhost:4000',
  'https://flamoral.com',
  'https://www.flamoral.com',
  'https://admin.flamoral.com'
];

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
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

// Detailed health check with Azure Storage status
app.get('/health/detailed', (_req: Request, res: Response) => {
  const storageHealth = azureStorageService.getHealthStatus();

  res.status(storageHealth.healthy ? 200 : 503).json({
    status: storageHealth.healthy ? 'healthy' : 'degraded',
    service: 'media-service',
    timestamp: new Date().toISOString(),
    storage: {
      healthy: storageHealth.healthy,
      initialized: storageHealth.initialized,
      error: storageHealth.error,
    },
    uptime: process.uptime(),
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
    const status = azureStorageService.getHealthStatus();
    if (status.healthy) {
      logger.info('Azure Storage initialized successfully');
    } else {
      logger.warn('Azure Storage initialized in degraded mode:', status.error);
      logger.warn('Uploads will fail until Azure Storage credentials are configured');
    }
  })
  .catch((error) => {
    logger.error('Failed to initialize Azure Storage', error);
    logger.warn('Media service running without Azure Storage - uploads will fail');
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
