import 'reflect-metadata';
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';
import { createLogger } from './utils/logger';
import { SocketManager } from './socket/socket-manager';
import cosmosClient from './infrastructure/database/cosmos-client';
import apiRoutes from './api/routes';
import internalRoutes from './api/routes/internal.routes';
import { createValidator, commonValidations } from '@flamoral/backend-shared';

// Load environment variables
dotenv.config();

// Initialize logger
const logger = createLogger('messaging-service');

// Track service readiness state
let isReady = false;
let isShuttingDown = false;

// Validate environment variables at startup
const validator = createValidator('messaging-service', [
  commonValidations.nodeEnv,
  commonValidations.port(3004),
  commonValidations.jwtAccessSecret,
  commonValidations.cosmosEndpoint,
  commonValidations.cosmosKey,
  {
    name: 'ENCRYPTION_KEY',
    required: true,
    description: 'Message encryption key for E2E encryption',
    minLength: 32,
    sensitive: true,
  },
]);
validator.validateOrThrow();

// Create Express app
const app: Application = express();
const PORT = process.env.PORT || 3004;

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// JWT Authentication Middleware for Socket.IO
io.use((socket, next) => {
  try {
    // Extract token from auth object or authorization header
    const token = socket.handshake.auth?.token ||
                  socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      logger.warn('WebSocket connection rejected: No token provided');
      return next(new Error('Authentication required'));
    }

    // Verify JWT token
    const jwtSecret = process.env.JWT_ACCESS_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_ACCESS_SECRET not configured');
      return next(new Error('Server configuration error'));
    }

    const decoded = jwt.verify(token, jwtSecret) as any;

    // Extract user ID from token payload
    const userId = decoded.sub || decoded.userId;
    if (!userId) {
      logger.warn('WebSocket connection rejected: No userId in token');
      return next(new Error('Invalid token payload'));
    }

    // Attach userId to socket data for use in handlers
    socket.data.userId = userId;
    logger.info(`WebSocket authentication successful for user: ${userId}`);

    next();
  } catch (error: any) {
    logger.warn(`WebSocket authentication failed: ${error.message}`);
    if (error.name === 'TokenExpiredError') {
      return next(new Error('Token expired'));
    } else if (error.name === 'JsonWebTokenError') {
      return next(new Error('Invalid token'));
    }
    return next(new Error('Authentication failed'));
  }
});

// Initialize Socket Manager
const socketManager = new SocketManager(io);
logger.info('Socket Manager initialized with JWT authentication');

// Middleware
app.use(helmet());
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Liveness probe endpoint - returns 200 if the process is alive
// This should be lightweight and always succeed unless the process is in a bad state
app.get('/health', (req: Request, res: Response) => {
  // During shutdown, fail liveness to prevent new traffic
  if (isShuttingDown) {
    return res.status(503).json({
      status: 'shutting_down',
      service: 'messaging-service',
      timestamp: new Date().toISOString(),
    });
  }

  res.status(200).json({
    status: 'healthy',
    service: 'messaging-service',
    timestamp: new Date().toISOString(),
    connections: socketManager.getConnectedCount(),
  });
});

// Readiness probe endpoint - returns 200 only when fully ready to serve traffic
app.get('/ready', (req: Request, res: Response) => {
  if (!isReady) {
    return res.status(503).json({
      status: 'not_ready',
      service: 'messaging-service',
      timestamp: new Date().toISOString(),
      details: 'Service is still initializing',
    });
  }

  if (isShuttingDown) {
    return res.status(503).json({
      status: 'shutting_down',
      service: 'messaging-service',
      timestamp: new Date().toISOString(),
    });
  }

  // Check if Cosmos DB is still connected
  if (!cosmosClient.isInitialized()) {
    return res.status(503).json({
      status: 'not_ready',
      service: 'messaging-service',
      timestamp: new Date().toISOString(),
      details: 'Database connection not initialized',
    });
  }

  res.status(200).json({
    status: 'ready',
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
      api: '/api/v1',
      conversations: '/api/v1/conversations',
      messages: '/api/v1/messages',
      websocket: `ws://localhost:${PORT}`,
    },
  });
});

// Mount API routes
app.use('/api/v1', apiRoutes);

// Internal API Routes (service-to-service)
app.use('/api/v1/internal/messages', internalRoutes);

// API endpoint to check user online status
app.get('/api/v1/users/:userId/status', async (req: Request, res: Response) => {
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
    // Start HTTP server FIRST so health checks can pass during initialization
    // This is critical for Kubernetes liveness probes
    await new Promise<void>((resolve) => {
      httpServer.listen(PORT, () => {
        logger.info(`Messaging Service HTTP server started on port ${PORT}`);
        logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info(`WebSocket endpoint: ws://localhost:${PORT}`);
        resolve();
      });
    });

    // Now initialize Cosmos DB connection with retry logic
    logger.info('Initializing Cosmos DB connection...');
    const maxRetries = 5;
    const retryDelayMs = 5000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await cosmosClient.initialize();
        logger.info('Cosmos DB connection established');
        break;
      } catch (error: any) {
        if (attempt === maxRetries) {
          logger.error(`Failed to initialize Cosmos DB after ${maxRetries} attempts:`, error);
          throw error;
        }
        logger.warn(`Cosmos DB initialization attempt ${attempt}/${maxRetries} failed, retrying in ${retryDelayMs}ms...`, error.message);
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
      }
    }

    // Mark service as ready for traffic
    isReady = true;
    logger.info('Messaging Service is fully initialized and ready to accept traffic');
  } catch (error: any) {
    logger.error('Failed to start server:', error);
    // Don't exit immediately - allow liveness probes to fail gracefully
    // This gives Kubernetes time to properly track the failure
    isReady = false;
    setTimeout(() => process.exit(1), 5000);
  }
}

// Start the server
startServer();

// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  if (isShuttingDown) {
    logger.warn(`Received ${signal} but shutdown already in progress`);
    return;
  }

  isShuttingDown = true;
  isReady = false;
  logger.info(`${signal} signal received: starting graceful shutdown`);

  // Give time for in-flight requests to complete
  const shutdownTimeout = parseInt(process.env.SHUTDOWN_TIMEOUT_MS || '15000', 10);

  // Set a hard timeout to force exit if graceful shutdown takes too long
  const forceExitTimer = setTimeout(() => {
    logger.error('Graceful shutdown timeout exceeded, forcing exit');
    process.exit(1);
  }, shutdownTimeout);

  try {
    // Close the HTTP server to stop accepting new connections
    await new Promise<void>((resolve, reject) => {
      httpServer.close((err) => {
        if (err) {
          logger.error('Error closing HTTP server:', err);
          reject(err);
        } else {
          logger.info('HTTP server closed');
          resolve();
        }
      });
    });

    // Close database connection
    await cosmosClient.close();
    logger.info('Database connections closed');

    clearTimeout(forceExitTimer);
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error: any) {
    logger.error('Error during graceful shutdown:', error);
    clearTimeout(forceExitTimer);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
