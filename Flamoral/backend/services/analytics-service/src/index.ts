/**
 * Analytics Service - Main Entry Point
 */

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import config from './config';
import { dbClient } from './infrastructure/database/db-client';
import { appInsights } from './infrastructure/monitoring/app-insights';
import eventQueueService from './infrastructure/queue/event-queue.service';
import eventStreamService from './infrastructure/streaming/event-stream.service';
import aggregationScheduler from './infrastructure/scheduler/aggregation-scheduler';

// Load environment variables
dotenv.config();

// Initialize Application Insights
appInsights.initialize();

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

// Import telemetry middleware
import telemetryMiddleware from './api/middleware/telemetry.middleware';

// Request logging and telemetry middleware
app.use((req: Request, res: Response, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});
app.use(telemetryMiddleware);

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  try {
    const dbHealthy = await dbClient.healthCheck();
    const poolStats = dbClient.getPoolStats();
    const queueHealthy = await eventQueueService.healthCheck();
    const streamHealthy = await eventStreamService.healthCheck();
    const schedulerStatus = aggregationScheduler.getStatus();

    const allHealthy = dbHealthy && queueHealthy && streamHealthy && schedulerStatus.initialized;

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'healthy' : 'degraded',
      service: 'analytics-service',
      timestamp: new Date().toISOString(),
      components: {
        database: {
          status: dbHealthy ? 'healthy' : 'unhealthy',
          pool: poolStats,
        },
        eventQueue: {
          status: queueHealthy ? 'healthy' : 'unhealthy',
        },
        eventStream: {
          status: streamHealthy ? 'healthy' : 'unhealthy',
        },
        scheduler: {
          status: schedulerStatus.initialized ? 'healthy' : 'unhealthy',
          tasks: {
            hourly: schedulerStatus.hourlyTaskRunning,
            daily: schedulerStatus.dailyTaskRunning,
            cleanup: schedulerStatus.cleanupTaskRunning,
          },
        },
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
import systemRoutes from './api/routes/system.routes';

// Register routes
app.use('/api/tracking', trackingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/system', systemRoutes);

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
  console.error('Error:', error);
  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Internal server error',
  });
});

// Initialize and start server
async function startServer() {
  try {
    console.log('Starting Analytics Service...');
    console.log(`Environment: ${config.nodeEnv}`);

    // Initialize database connection
    console.log('Initializing database connection...');
    await dbClient.initialize();
    console.log('Database connection established');

    // Run migrations
    await dbClient.runMigrations();

    // Initialize event queue service
    console.log('Initializing event queue service...');
    await eventQueueService.initialize();
    console.log('Event queue service initialized');

    // Initialize event stream service
    console.log('Initializing event stream service...');
    await eventStreamService.initialize();
    console.log('Event stream service initialized');

    // Initialize and start aggregation scheduler
    console.log('Initializing aggregation scheduler...');
    await aggregationScheduler.initialize();
    aggregationScheduler.start();
    console.log('Aggregation scheduler started');

    // Start HTTP server
    app.listen(PORT, () => {
      console.log(`Analytics Service running on port ${PORT}`);
      console.log(`Database: ${config.database.host}:${config.database.port}/${config.database.name}`);
      console.log(`Redis: ${config.redis.host}:${config.redis.port}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log('All services initialized successfully');
    });
  } catch (error: any) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');

  // Stop scheduler
  aggregationScheduler.stop();

  // Close queue service
  await eventQueueService.close();

  // Close stream service
  await eventStreamService.close();

  // Close database
  await dbClient.close();

  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');

  // Stop scheduler
  aggregationScheduler.stop();

  // Close queue service
  await eventQueueService.close();

  // Close stream service
  await eventStreamService.close();

  // Close database
  await dbClient.close();

  process.exit(0);
});

export default app;
