import { createValidator, commonValidations } from '@flamoral/backend-shared';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

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
  commonValidations.port(3001),
  commonValidations.jwtAccessSecret,
  commonValidations.jwtRefreshSecret,
  commonValidations.databaseUrl,
  commonValidations.dbHost,
  commonValidations.dbPort,
  commonValidations.dbPassword,
  commonValidations.redisUrl,
  commonValidations.redisHost,
  commonValidations.redisPort,
]);
validator.validateOrThrow();

// Ensure either DATABASE_URL or DB_HOST+DB_PASSWORD is set
if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
  throw new Error('[auth-service] Either DATABASE_URL or DB_HOST + DB_PASSWORD must be set');
}

// Create Express app
const app: Application = express();

// Security middleware
app.use(helmet());

// CORS configuration - Enhanced for cookie-based auth and CSRF protection
app.use(
  cors({
    origin: config.cors.origins,
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
      'svix-id', // Clerk webhook signature headers
      'svix-timestamp',
      'svix-signature',
    ],
    exposedHeaders: [
      'X-Request-ID',
      'X-Correlation-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'X-CSRF-Token',
    ],
    maxAge: 86400, // 24 hours - cache preflight
  })
);

// Body parsing
// SECURITY: Capture raw body for webhook signature verification (Svix/Clerk)
// The verify callback stores the raw body buffer on the request before JSON parsing,
// so Svix signature verification works correctly.
app.use(express.json({
  limit: '10mb',
  verify: (req: any, _res, buf) => {
    // Store raw body for webhook routes that need it for signature verification
    if (req.originalUrl && req.originalUrl.includes('/webhooks/')) {
      req.rawBody = buf.toString('utf8');
    }
  },
}));
app.use(express.urlencoded({ extended: true }));

// Cookie parsing (required for httpOnly cookie-based auth)
app.use(cookieParser());

// Correlation ID middleware - add to every request for distributed tracing
app.use((req: Request, res: Response, next: NextFunction) => {
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
  (req as any).correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  next();
});

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

// 404 handler - returns standardized error response
app.use((req: Request, res: Response) => {
  const correlationId = (req as any).correlationId || uuidv4();
  res.setHeader('X-Correlation-ID', correlationId);
  res.status(404).json({
    success: false,
    error: {
      code: 'RESOURCE_NOT_FOUND',
      message: `Cannot ${req.method} ${req.path}`,
      correlationId,
      timestamp: new Date().toISOString(),
    },
  });
});

// Global error handler - returns standardized error response
app.use((err: Error & { statusCode?: number; code?: string }, req: Request, res: Response, _next: NextFunction) => {
  const correlationId = (req as any).correlationId || uuidv4();
  const statusCode = err.statusCode || 500;

  // Determine error code
  let errorCode = err.code || 'INTERNAL_ERROR';
  if (!err.code) {
    if (statusCode === 400) errorCode = 'VALIDATION_FAILED';
    else if (statusCode === 401) errorCode = 'AUTH_TOKEN_INVALID';
    else if (statusCode === 403) errorCode = 'PERM_DENIED';
    else if (statusCode === 404) errorCode = 'RESOURCE_NOT_FOUND';
    else if (statusCode === 429) errorCode = 'RATE_LIMIT_EXCEEDED';
  }

  // Log server errors
  if (statusCode >= 500) {
    logger.error('Server error', {
      error: err.message,
      stack: err.stack,
      correlationId,
      path: req.path,
      method: req.method,
    });
  } else {
    logger.warn('Client error', {
      error: err.message,
      correlationId,
      path: req.path,
      method: req.method,
    });
  }

  // Sanitize message for production
  const message = config.nodeEnv === 'production' && statusCode >= 500
    ? 'An unexpected error occurred. Please try again.'
    : err.message;

  res.setHeader('X-Correlation-ID', correlationId);
  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      correlationId,
      timestamp: new Date().toISOString(),
    },
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
