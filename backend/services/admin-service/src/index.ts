import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { testConnection } from './infrastructure/database';
import { redis } from './infrastructure/redis';
import adminRoutes from './routes';
import { createValidator, commonValidations } from '../../../shared/utils/env-validator';

dotenv.config();

// Validate environment variables at startup
const validator = createValidator('admin-service', [
  commonValidations.nodeEnv,
  commonValidations.port(3010),
  commonValidations.jwtAccessSecret,
  commonValidations.dbHost,
  commonValidations.dbPort,
  commonValidations.dbPassword,
  {
    name: 'DB_NAME',
    required: true,
    description: 'PostgreSQL database name',
  },
  {
    name: 'DB_USER',
    required: true,
    description: 'PostgreSQL database user',
  },
  commonValidations.redisHost,
  commonValidations.redisPort,
]);
validator.validateOrThrow();

const app = express();
const PORT = process.env.PORT || 3010;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
  next();
});

// Health check
app.get('/health', async (req, res) => {
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
    // Check Redis
    if (redis['client']) {
      await redis['client'].ping();
      checks.redis = true;
    }
  } catch (e) {
    logger.error('Redis health check failed', e);
  }

  const healthy = Object.values(checks).every(v => v);
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    service: 'admin-service',
    timestamp: new Date().toISOString(),
    checks,
  });
});

// API routes
app.use('/api/v1/admin', adminRoutes);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);

  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Start server
async function start() {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }

    // Connect to Redis
    await redis.connect();

    // Start server
    app.listen(PORT, () => {
      logger.info(`Admin service listening on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await redis.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await redis.disconnect();
  process.exit(0);
});

start();

export default app;
