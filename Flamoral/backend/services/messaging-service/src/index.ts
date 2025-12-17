import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { createLogger } from './utils/logger';
import { SocketManager } from './socket/socket-manager';
import cosmosClient from './infrastructure/database/cosmos-client';
import { redisClient } from './infrastructure/cache/redis';
import apiRoutes from './api/routes';
import internalRoutes from './api/routes/internal.routes';

// Load environment variables
dotenv.config();

// Initialize logger
const logger = createLogger('messaging-service');

// Global error handlers - MUST be early to catch all unhandled errors
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  logger.error('[MESSAGING-SERVICE] Unhandled Promise Rejection:', reason);
  if (reason instanceof Error) {
    logger.error('[MESSAGING-SERVICE] Stack trace:', reason.stack);
  }
  // Don't exit - let the service continue but alert monitoring
});

process.on('uncaughtException', (error: Error) => {
  logger.error('[MESSAGING-SERVICE] Uncaught Exception:', error.message);
  logger.error('[MESSAGING-SERVICE] Stack trace:', error.stack);
  // For uncaught exceptions, we should exit after logging
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Create Express app
const app: Application = express();
const PORT = process.env.PORT || 3004;

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO with comprehensive CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'https://flamoral.com',
  'https://www.flamoral.com',
  'https://admin.flamoral.com',
  'https://app.flamoral.com',
  'https://flamoral.vercel.app',
];

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, native WebSocket)
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
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Initialize Socket Manager
const socketManager = new SocketManager(io);
logger.info('Socket Manager initialized');

// Middleware
app.use(helmet());
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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token', 'X-API-Key'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'messaging-service',
    timestamp: new Date().toISOString(),
    connections: socketManager.getConnectedCount(),
  });
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'Flamoral Messaging Service',
    version: '1.0.0',
    status: 'running',
    activeConnections: socketManager.getConnectedCount(),
    endpoints: {
      health: '/health',
      api: '/api',
      conversations: '/api/conversations',
      messages: '/api/messages',
      websocket: `ws://localhost:${PORT}`,
    },
  });
});

// Mount API routes
app.use('/api', apiRoutes);

// Internal API Routes (service-to-service)
app.use('/api/internal/messages', internalRoutes);

// API endpoint to check user online status
app.get('/api/users/:userId/status', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const status = await socketManager.getOnlineStatus(userId);

    res.json({
      userId,
      online: socketManager.isUserOnline(userId),
      status,
    });
  } catch (error: any) {
    logger.error('Failed to get user status:', error);
    res.status(500).json({ error: 'Failed to get user status' });
  }
});

// Initialize and start server
async function startServer() {
  try {
    // Initialize Redis connection (optional)
    if (process.env.REDIS_HOST) {
      logger.info('Initializing Redis connection...');
      try {
        await redisClient.connect();
        logger.info('Redis connection established');
      } catch (redisError: any) {
        logger.warn('Failed to initialize Redis, continuing without it:', redisError.message);
      }
    } else {
      logger.warn('Redis not configured - running without Redis support (some features may be limited)');
    }

    // Initialize Cosmos DB connection (optional)
    if (process.env.COSMOS_ENDPOINT && process.env.COSMOS_KEY) {
      logger.info('Initializing Cosmos DB connection...');
      try {
        await cosmosClient.initialize();
        logger.info('Cosmos DB connection established');
      } catch (cosmosError: any) {
        logger.warn('Failed to initialize Cosmos DB, continuing without it:', cosmosError.message);
      }
    } else {
      logger.warn('Cosmos DB not configured - running without Cosmos DB support (some features may be limited)');
    }

    // Start HTTP server
    httpServer.listen(PORT, () => {
      logger.info(`Messaging Service running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`WebSocket endpoint: ws://localhost:${PORT}`);
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
  try {
    await redisClient.disconnect();
    await cosmosClient.close();
  } catch (err) {
    logger.warn('Error closing connections:', err);
  }
  httpServer.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  try {
    await redisClient.disconnect();
    await cosmosClient.close();
  } catch (err) {
    logger.warn('Error closing connections:', err);
  }
  httpServer.close(() => {
    process.exit(0);
  });
});

export default app;
