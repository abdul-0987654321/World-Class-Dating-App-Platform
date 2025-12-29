/**
 * Analytics Service - Main Entry Point
 */

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import config from './config';
import { dbClient } from './infrastructure/database/db-client';
import { createValidator, commonValidations, createLogger } from '@flamoral/backend-shared';

const logger = createLogger('analytics-service');

// Load environment variables
dotenv.config();

// Validate environment variables at startup
const validator = createValidator('analytics-service', [
  commonValidations.nodeEnv,
  commonValidations.port(3008),
  commonValidations.jwtAccessSecret,
  commonValidations.jwtRefreshSecret,
  commonValidations.dbHost,
  commonValidations.dbPort,
  {
    name: 'DB_NAME',
    required: true,
    description: 'PostgreSQL database name for analytics data',
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

// Create Express app
const app: Application = express();
const PORT = config.port;

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
      service: 'analytics-service',
      timestamp: new Date().toISOString(),
      database: {
        connected: dbHealthy,
        pool: poolStats,
      },
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'analytics-service',
      error: error.message,
    });
  }
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'Flamoral Analytics Service',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      tracking: {
        event: 'POST /api/tracking/event',
        events: 'POST /api/tracking/events',
        session: 'POST /api/tracking/session',
      },
      events: {
        swipe: 'POST /api/events/swipe',
        match: 'POST /api/events/match',
        message: 'POST /api/events/message',
        session: 'POST /api/events/session',
        revenue: 'POST /api/events/revenue',
      },
      analytics: {
        funnelRates: 'GET /api/analytics/funnel/conversion-rates',
        attribution: 'GET /api/analytics/attribution/summary',
        campaigns: 'GET /api/analytics/campaigns/summary',
      },
      dashboard: {
        overview: 'GET /api/dashboard/overview',
        engagement: 'GET /api/dashboard/engagement',
        matchSuccess: 'GET /api/dashboard/match-success',
        revenue: 'GET /api/dashboard/revenue',
        realTime: 'GET /api/dashboard/real-time',
      },
    },
  });
});

// Import routes
import trackingRoutes from './api/routes/tracking.routes';
import analyticsRoutes from './api/routes/analytics.routes';
import dashboardRoutes from './api/routes/dashboard.routes';
import eventsRoutes from './api/routes/events.routes';

// Register routes
app.use('/api/v1/tracking', trackingRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/events', eventsRoutes);

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
    logger.info('Starting Analytics Service...');
    logger.info(`Environment: ${config.nodeEnv}`);

    // Initialize database connection
    logger.info('Initializing database connection...');
    await dbClient.initialize();
    logger.info('Database connection established');

    // Run migrations
    await dbClient.runMigrations();

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`Analytics Service running on port ${PORT}`);
      logger.info(`Database: ${config.database.host}:${config.database.port}/${config.database.name}`);
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
