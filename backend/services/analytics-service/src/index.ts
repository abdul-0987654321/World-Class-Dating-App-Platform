/**
 * Analytics Service - Main Entry Point
 */

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import config from './config';
import { dbClient } from './infrastructure/database/db-client';

// Load environment variables
dotenv.config();

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
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
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
    service: 'ConnectSphere Analytics Service',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      tracking: {
        event: 'POST /api/tracking/event',
        events: 'POST /api/tracking/events',
        session: 'POST /api/tracking/session',
      },
      analytics: {
        funnelRates: 'GET /api/analytics/funnel/conversion-rates',
        attribution: 'GET /api/analytics/attribution/summary',
        campaigns: 'GET /api/analytics/campaigns/summary',
      },
    },
  });
});

// Import routes (we'll create these next)
import trackingRoutes from './api/routes/tracking.routes';
import analyticsRoutes from './api/routes/analytics.routes';

// Register routes
app.use('/api/tracking', trackingRoutes);
app.use('/api/analytics', analyticsRoutes);

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

    // Start HTTP server
    app.listen(PORT, () => {
      console.log(`Analytics Service running on port ${PORT}`);
      console.log(`Database: ${config.database.host}:${config.database.port}/${config.database.name}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
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
  await dbClient.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await dbClient.close();
  process.exit(0);
});

export default app;
