import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { config } from './config';
import logger from './utils/logger';
import { testConnection, closePool } from './infrastructure/database/pool';
import redisCache from './infrastructure/cache/redis';
import apiRoutes from './api/routes';
import { generalLimiter } from './api/middleware/rate-limit.middleware';

// Load environment variables
dotenv.config();

// Global error handlers - MUST be first to catch all unhandled errors
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  console.error('[AUTH-SERVICE] Unhandled Promise Rejection:', reason);
  // Log with stack trace if available
  if (reason instanceof Error) {
    console.error('[AUTH-SERVICE] Stack trace:', reason.stack);
  }
  // Don't exit - let the service continue but alert monitoring
});

process.on('uncaughtException', (error: Error) => {
  console.error('[AUTH-SERVICE] Uncaught Exception:', error.message);
  console.error('[AUTH-SERVICE] Stack trace:', error.stack);
  // For uncaught exceptions, we should exit after logging
  // Give time for logs to flush
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Create Express app
const app: Application = express();

// Security middleware
app.use(helmet());

// Cookie parser middleware - MUST be before routes
app.use(cookieParser());

// CORS configuration for cross-origin requests
const allowedOrigins = config.cors.origins || [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'https://flamoral.com',
  'https://www.flamoral.com',
  'https://admin.flamoral.com',
  'https://app.flamoral.com',
  'https://flamoral.vercel.app',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, server-to-server)
    if (!origin) return callback(null, true);

    // Check if origin matches allowed patterns
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin === '*') return true;
      if (allowedOrigin.includes('*')) {
        const pattern = allowedOrigin.replace(/\*/g, '.*');
        return new RegExp(`^${pattern}$`).test(origin);
      }
      return allowedOrigin === origin;
    });

    callback(null, isAllowed);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Service-Key', 'X-Requested-With', 'X-CSRF-Token', 'X-API-Key'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use(generalLimiter);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
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
      auth: '/api/auth',
      docs: '/api/docs',
    },
  });
});

// Mount API routes
app.use('/api', apiRoutes);

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
