/**
 * Wellness Service - Main Entry Point
 * Dating wellness tracking, mental health monitoring, and relationship readiness assessment
 */

import 'reflect-metadata';
import { createValidator, commonValidations, createLogger } from '@flamoral/backend-shared';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';

import wellnessRoutes from './api/routes/wellness.routes';
import config from './config';
import { dbClient } from './infrastructure/database/db-client';

const logger = createLogger('wellness-service');

// Load environment variables
dotenv.config();

// Validate environment variables at startup
const validator = createValidator('wellness-service', [
  commonValidations.nodeEnv,
  commonValidations.port(3031),
  commonValidations.jwtAccessSecret,
  commonValidations.jwtRefreshSecret,
  commonValidations.databaseUrl,
  commonValidations.dbHost,
  commonValidations.dbPort,
  {
    name: 'DB_NAME',
    required: true,
    description: 'PostgreSQL database name for wellness data',
  },
  {
    name: 'DB_USER',
    required: true,
    description: 'PostgreSQL database user',
  },
  commonValidations.dbPassword,
  {
    name: 'SERVICE_API_KEY',
    required: true,
    description: 'Internal service API key for service-to-service authentication',
    minLength: 32,
    sensitive: true,
  },
]);
validator.validateOrThrow();

// Ensure either DATABASE_URL or DB_HOST+DB_PASSWORD is set
if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
  throw new Error('[wellness-service] Either DATABASE_URL or DB_HOST + DB_PASSWORD must be set');
}

// Create Express app
const app: Application = express();
const PORT = config.port;

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigins,
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
    ],
    maxAge: 86400,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  try {
    const dbHealthy = await dbClient.healthCheck();
    const poolStats = dbClient.getPoolStats();

    res.status(200).json({
      status: dbHealthy ? 'healthy' : 'unhealthy',
      service: 'wellness-service',
      timestamp: new Date().toISOString(),
      database: {
        connected: dbHealthy,
        pool: poolStats,
      },
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'wellness-service',
      error: error.message,
    });
  }
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'Flamoral Wellness Service',
    version: '1.0.0',
    status: 'running',
    description:
      'Dating wellness tracking, mental health monitoring, and relationship readiness assessment',
    endpoints: {
      health: '/health',
      wellness: {
        metrics: 'GET/POST /api/v1/wellness/metrics',
        trend: 'GET /api/v1/wellness/trend',
        mood: 'POST /api/v1/wellness/mood',
        dashboard: 'GET /api/v1/wellness/dashboard',
        dismissAlert: 'POST /api/v1/wellness/alerts/:alertId/dismiss',
      },
      readiness: {
        start: 'POST /api/v1/wellness/readiness/start',
        submit: 'POST /api/v1/wellness/readiness/submit',
        latest: 'GET /api/v1/wellness/readiness/latest',
        history: 'GET /api/v1/wellness/readiness/history',
      },
    },
  });
});

// Register routes
app.use('/api/v1/wellness', wellnessRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
  });
});

// Error handler
app.use((error: any, req: Request, res: Response, next: any) => {
  logger.error('Error:', error);
  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Internal server error',
  });
});

// Initialize and start server
async function startServer() {
  try {
    logger.info('Starting Wellness Service...');
    logger.info(`Environment: ${config.nodeEnv}`);

    // Initialize database connection
    logger.info('Initializing database connection...');
    await dbClient.initialize();
    logger.info('Database connection established');

    // Run migrations
    await dbClient.runMigrations();

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`Wellness Service running on port ${PORT}`);
      logger.info(
        `Database: ${config.database.host}:${config.database.port}/${config.database.name}`
      );
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error: any) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  await dbClient.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  await dbClient.close();
  process.exit(0);
});

export default app;
