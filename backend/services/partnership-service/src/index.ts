import 'reflect-metadata';
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createLogger, createValidator, commonValidations } from '@flamoral/backend-shared';
import { db, testConnection } from './infrastructure/database/connection';

// Import routes
import partnershipRoutes from './api/routes';

// Load environment variables
dotenv.config();

// Initialize logger
const logger = createLogger('partnership-service');

// Validate environment variables at startup
const validator = createValidator('partnership-service', [
  commonValidations.nodeEnv,
  commonValidations.port(3011),
  commonValidations.jwtAccessSecret,
  commonValidations.dbHost,
  commonValidations.dbPassword,
  {
    name: 'OPENTABLE_API_KEY',
    required: false,
    description: 'OpenTable API key for restaurant reservations',
    sensitive: true,
  },
  {
    name: 'RESY_API_KEY',
    required: false,
    description: 'Resy API key for restaurant reservations',
    sensitive: true,
  },
  {
    name: 'TICKETMASTER_API_KEY',
    required: false,
    description: 'Ticketmaster Discovery API key',
    sensitive: true,
  },
  {
    name: 'EVENTBRITE_API_TOKEN',
    required: false,
    description: 'Eventbrite private API token',
    sensitive: true,
  },
  {
    name: 'FLOWERS_API_KEY',
    required: false,
    description: '1-800-Flowers API key',
    sensitive: true,
  },
]);

// Only validate in production
if (process.env.NODE_ENV === 'production') {
  validator.validateOrThrow();
} else {
  validator.validate();
}

// Create Express app
const app: Application = express();
const PORT = process.env.PORT || 3011;

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
];

app.use(helmet());
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next) => {
  logger.debug(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
  next();
});

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  const checks = {
    database: false,
  };

  try {
    checks.database = await testConnection();
  } catch (e) {
    logger.error('Database health check failed', e);
  }

  const healthy = Object.values(checks).every(v => v);
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    service: 'partnership-service',
    timestamp: new Date().toISOString(),
    checks,
  });
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'Flamoral Partnership Service',
    version: '1.0.0',
    status: 'running',
    features: [
      'Restaurant Reservations (OpenTable, Resy)',
      'Event Tickets (Ticketmaster, Eventbrite)',
      'Gift Delivery (1-800-Flowers)',
      'Affiliate Tracking & Commissions',
      'Date Planning Suggestions',
    ],
  });
});

// Mount partnership routes
app.use('/api/v1/partnerships', partnershipRoutes);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: any) => {
  logger.error('Unhandled error:', err);

  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
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

    logger.info('Database connected successfully');

    // Start server
    app.listen(PORT, () => {
      logger.info(`Partnership Service running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  await db.destroy();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  await db.destroy();
  process.exit(0);
});

start();

export default app;
