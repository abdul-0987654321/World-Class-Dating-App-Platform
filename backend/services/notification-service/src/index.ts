/**
 * Notification Service Main Entry Point
 */
import 'reflect-metadata';
import { createValidator, commonValidations } from '@flamoral/backend-shared';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import { createClient } from 'redis';

import batchRoutes from './api/routes/batch.routes';
import deviceRoutes from './api/routes/device.routes';
import internalRoutes from './api/routes/internal.routes';
import notificationRoutes from './api/routes/notifications.routes';
import { config } from './config';
import { testConnection } from './config/database';
import { notificationQueue, getQueueStats, cleanQueue } from './queues/notification.queue';
import {
  initializeFirebase as initializePushDelivery,
  initializeAPNs,
} from './services/push-notification-delivery.service';
import { initializeFirebase } from './services/push-notification.service';
import logger from './utils/logger';

// Load environment variables
dotenv.config();

// Validate environment variables at startup
const validator = createValidator('notification-service', [
  commonValidations.nodeEnv,
  commonValidations.port(3004),
  commonValidations.jwtAccessSecret,
  commonValidations.dbHost,
  commonValidations.dbPort,
  {
    name: 'DB_NAME',
    required: true,
    description: 'PostgreSQL database name for notification service',
  },
  {
    name: 'DB_USER',
    required: true,
    description: 'PostgreSQL database user',
  },
  commonValidations.dbPassword,
  {
    name: 'SENDGRID_API_KEY',
    required: true,
    description: 'SendGrid API key for sending emails',
    sensitive: true,
  },
  {
    name: 'FIREBASE_SERVICE_ACCOUNT',
    required: false,
    description: 'Firebase service account JSON for push notifications (Android/Web)',
  },
  {
    name: 'APNS_KEY_ID',
    required: false,
    description: 'Apple Push Notification Service key ID for iOS push notifications',
  },
  {
    name: 'APNS_TEAM_ID',
    required: false,
    description: 'Apple Push Notification Service team ID for iOS push notifications',
  },
  commonValidations.redisHost,
  commonValidations.redisPort,
]);
validator.validateOrThrow();

// Create Express app
const app: Application = express();

// Middleware
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
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next) => {
  logger.debug(`${req.method} ${req.path}`, {
    query: req.query,
    ip: req.ip,
  });
  next();
});

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  const checks = {
    database: false,
    redis: false,
  };

  try {
    // Check database
    checks.database = await testConnection();
  } catch (e) {
    logger.error('Database health check failed', e);
  }

  try {
    // Check Redis via Bull queue connection
    const queueClient = await notificationQueue.client;
    if (queueClient) {
      await queueClient.ping();
      checks.redis = true;
    }
  } catch (e) {
    logger.error('Redis health check failed', e);
  }

  const healthy = Object.values(checks).every((v) => v);
  const queueStats = await getQueueStats();

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    service: 'notification-service',
    timestamp: new Date().toISOString(),
    checks,
    queue: {
      stats: queueStats,
    },
  });
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'Flamoral Notification Service',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      notifications: {
        send: 'POST /api/notifications/send',
        list: 'GET /api/notifications',
        markRead: 'PUT /api/notifications/:id/read',
        markAllRead: 'PUT /api/notifications/read-all',
        delete: 'DELETE /api/notifications/:id',
        preferences: 'GET /api/notifications/preferences',
        updatePreferences: 'PUT /api/notifications/preferences',
        unreadCount: 'GET /api/notifications/unread-count',
      },
      devices: {
        register: 'POST /api/devices/register',
        unregister: 'DELETE /api/devices/unregister',
        update: 'PUT /api/devices/update',
        list: 'GET /api/devices',
        stats: 'GET /api/devices/stats',
      },
      batch: {
        send: 'POST /api/batch/send',
        segment: 'POST /api/batch/segment',
        status: 'GET /api/batch/job/:jobId',
        history: 'GET /api/batch/jobs',
        stats: 'GET /api/batch/stats',
      },
    },
  });
});

// API Routes
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/devices', deviceRoutes);
app.use('/api/v1/batch', batchRoutes);

// Internal API Routes (service-to-service)
app.use('/api/v1/internal/notifications', internalRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  logger.error('Unhandled error', {
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    path: req.path,
  });

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// Initialize services
async function initializeServices() {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      logger.error('Failed to connect to database');
      process.exit(1);
    }

    // Initialize Firebase for push notifications (legacy)
    try {
      initializeFirebase();
      logger.info('Firebase (legacy) initialized successfully');
    } catch (error: any) {
      logger.warn('Firebase (legacy) initialization failed.', {
        error: error.message,
      });
    }

    // Initialize enhanced push notification delivery services
    try {
      initializePushDelivery();
      logger.info('Firebase Cloud Messaging initialized successfully');
    } catch (error: any) {
      logger.warn('FCM initialization failed. Android/Web push notifications will be disabled.', {
        error: error.message,
      });
    }

    try {
      initializeAPNs();
      logger.info('Apple Push Notification Service initialized successfully');
    } catch (error: any) {
      logger.warn('APNs initialization failed. iOS push notifications will be disabled.', {
        error: error.message,
      });
    }

    // Set up queue cleanup job (runs every hour)
    setInterval(
      async () => {
        try {
          await cleanQueue();
          logger.info('Queue cleanup completed');
        } catch (error: any) {
          logger.error('Queue cleanup failed', { error: error.message });
        }
      },
      60 * 60 * 1000
    ); // 1 hour

    logger.info('All services initialized successfully');
  } catch (error: any) {
    logger.error('Service initialization failed', { error: error.message });
    process.exit(1);
  }
}

// Start server
async function start() {
  try {
    await initializeServices();

    const server = app.listen(config.port, () => {
      logger.info(`Notification Service running on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Queue workers active`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} signal received: closing server`);

      // Close HTTP server
      server.close(async () => {
        logger.info('HTTP server closed');

        // Close queue
        try {
          await notificationQueue.close();
          logger.info('Notification queue closed');
        } catch (error: any) {
          logger.error('Error closing queue', { error: error.message });
        }

        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error: any) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

// Start the application
start();

export default app;
