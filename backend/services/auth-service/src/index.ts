import { createValidator, commonValidations } from '@flamoral/backend-shared';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

import { generalLimiter } from './api/middleware/rate-limit.middleware';
import apiRoutes from './api/routes';
import { config } from './config';
import redisCache from './infrastructure/cache/redis';
import { testConnection, closePool } from './infrastructure/database/pool';
import logger from './utils/logger';

// Load environment variables
dotenv.config();

// Validate environment variables at startup
const validator = createValidator('auth-service', [
  commonValidations.nodeEnv,
  commonValidations.port(3007),
  commonValidations.jwtAccessSecret,
  commonValidations.jwtRefreshSecret,
  commonValidations.dbHost,
  commonValidations.dbPort,
  commonValidations.dbPassword,
  commonValidations.redisHost,
  commonValidations.redisPort,
]);
validator.validateOrThrow();

// Create Express app
const app: Application = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: config.cors.origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Service-Key'],
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint - MUST be before rate limiting for K8s probes
app.get('/health', async (req: Request, res: Response) => {
  const checks = {
    database: false,
    redis: false,
  };

  try {
    // Check database
    await testConnection();
    checks.database = true;
  } catch (e) {
    logger.error('Database health check failed', e);
  }

  try {
    // Check Redis connection
    const redisClient = redisCache['client'];
    if (redisClient && redisCache['isConnected']) {
      await redisClient.ping();
      checks.redis = true;
    }
  } catch (e) {
    logger.error('Redis health check failed', e);
  }

  const healthy = Object.values(checks).every((v) => v);
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    checks,
  });
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'Flamoral Auth Service',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      auth: '/api/v1/auth',
      docs: '/api/v1/docs',
    },
  });
});

// Rate limiting - applied after health check endpoints for K8s probes
app.use(generalLimiter);

// Mount API routes
app.use('/api/v1', apiRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', err);
  res.status(500).json({
    success: false,
    error: config.nodeEnv === 'production' ? 'Internal server error' : err.message,
  });
});

// Initialize and start server
async function startServer(): Promise<void> {
  try {
    // Test database connection
    logger.info('Testing database connection...');
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('Failed to connect to database');
    }

    // Connect to Redis
    logger.info('Connecting to Redis...');
    await redisCache.connect();

    // Start HTTP server
    const server = app.listen(config.port, () => {
      logger.info(`Auth Service running on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
    });

    // Graceful shutdown handlers
    const shutdown = async (signal: string) => {
      logger.info(`${signal} signal received: closing HTTP server`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await redisCache.disconnect();
          await closePool();
          logger.info('All connections closed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown', error);
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;
