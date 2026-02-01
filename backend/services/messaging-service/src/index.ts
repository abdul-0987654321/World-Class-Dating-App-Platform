import 'reflect-metadata';
import { createServer } from 'http';

import { createValidator, commonValidations } from '@flamoral/backend-shared';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

import apiRoutes from './api/routes';
import { authenticate, AuthRequest } from './api/middleware/auth.middleware';
import internalRoutes from './api/routes/internal.routes';
import { postgresClient } from './infrastructure/database/postgres-client';
import { SocketManager } from './socket/socket-manager';
import { createLogger } from './utils/logger';

// Load environment variables
dotenv.config();

// Initialize logger
const logger = createLogger('messaging-service');

// Track service readiness state
let isReady = false;
let isShuttingDown = false;
let isDegradedMode = false;

// Validate environment variables at startup
const validator = createValidator('messaging-service', [
  commonValidations.nodeEnv,
  commonValidations.port(3005),
  commonValidations.jwtAccessSecret,
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
const PORT = process.env.PORT || 3005;

// Create HTTP server
const httpServer = createServer(app);

// CORS allowed origins - production domains required
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || (
  isProduction
    ? ['https://flamoral.com', 'https://www.flamoral.com', 'https://app.flamoral.com']
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000']
);

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
  },
});

// JWT Authentication Middleware for Socket.IO
io.use((socket, next) => {
  try {
    // Extract token from auth object or authorization header
    const token =
      socket.handshake.auth?.token ||
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
app.use(
  cors({
    origin: allowedOrigins,
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
      'X-CSRF-Token',
    ],
    maxAge: 86400, // 24 hours - cache preflight
  })
);
app.use(express.json({ limit: '5mb' })); // Allow larger payloads for media messages
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Correlation ID middleware - add to every request for distributed tracing
app.use((req: Request, res: Response, next: NextFunction) => {
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
  (req as any).correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  next();
});

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

  // In degraded mode, service is ready but with limited functionality
  // This allows the pod to receive traffic for non-database features (WebSocket, etc.)
  if (isDegradedMode) {
    return res.status(200).json({
      status: 'ready_degraded',
      service: 'messaging-service',
      timestamp: new Date().toISOString(),
      connections: socketManager.getConnectedCount(),
      details: 'Running in degraded mode - database features limited',
    });
  }

  // Check if PostgreSQL is still connected (only when NOT in degraded mode)
  if (!postgresClient.isInitialized()) {
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
      success: true,
      data: {
        userId,
        online: socketManager.isUserOnline(userId),
        status,
      },
    });
  } catch (error: any) {
    const correlationId = (req as any).correlationId || uuidv4();
    logger.error('Failed to get user status:', { error: error.message, correlationId });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get user status',
        correlationId,
        timestamp: new Date().toISOString(),
      },
    });
  }
});

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
app.use((err: Error & { status?: number; statusCode?: number; code?: string }, req: Request, res: Response, _next: NextFunction) => {
  const correlationId = (req as any).correlationId || uuidv4();
  const statusCode = err.status || err.statusCode || 500;

  // Determine error code
  let errorCode = err.code || 'INTERNAL_ERROR';
  if (!err.code) {
    if (statusCode === 400) errorCode = 'VALIDATION_FAILED';
    else if (statusCode === 401) errorCode = 'AUTH_TOKEN_INVALID';
    else if (statusCode === 403) errorCode = 'PERM_DENIED';
    else if (statusCode === 404) errorCode = 'RESOURCE_NOT_FOUND';
    else if (statusCode === 429) errorCode = 'RATE_LIMIT_EXCEEDED';
  }

  // Log server errors with full details
  if (statusCode >= 500) {
    logger.error('Server error:', {
      error: err.message,
      stack: err.stack,
      correlationId,
      path: req.path,
      method: req.method,
    });
  } else {
    logger.warn('Client error:', {
      error: err.message,
      correlationId,
      path: req.path,
      method: req.method,
    });
  }

  // Sanitize message for production
  const message = isProduction && statusCode >= 500
    ? 'An unexpected error occurred. Please try again.'
    : err.message || 'Internal server error';

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

    // Now initialize PostgreSQL connection with retry logic
    logger.info('Initializing PostgreSQL connection...');
    const maxRetries = 3;
    const retryDelayMs = 2000;
    const connectionTimeoutMs = 10000; // 10 second timeout per attempt
    const allowDegradedMode = process.env.ALLOW_DEGRADED_MODE === 'true';

    // If degraded mode is allowed, set isReady immediately so readiness probe passes
    // Database features will be limited until PostgreSQL connects
    if (allowDegradedMode) {
      isDegradedMode = true;
      isReady = true;
      logger.info(
        'Service ready in DEGRADED MODE - PostgreSQL connection will be attempted in background'
      );
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Add timeout wrapper to prevent long-running connection attempts
        const initPromise = postgresClient.initialize();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Connection timeout')), connectionTimeoutMs)
        );
        await Promise.race([initPromise, timeoutPromise]);
        logger.info('PostgreSQL connection established');
        isDegradedMode = false; // Exit degraded mode on successful connection
        break;
      } catch (error: any) {
        if (attempt === maxRetries) {
          logger.error(`Failed to initialize PostgreSQL after ${maxRetries} attempts:`, error);
          if (allowDegradedMode) {
            logger.warn('Continuing in DEGRADED MODE - messaging features will be limited');
            // isDegradedMode already true from above
            // Don't throw - continue without PostgreSQL
          } else {
            throw error;
          }
        } else {
          logger.warn(
            `PostgreSQL initialization attempt ${attempt}/${maxRetries} failed, retrying in ${retryDelayMs}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        }
      }
    }

    // Mark service as ready for traffic (if not already ready from degraded mode)
    if (!isReady) {
      isReady = true;
    }
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
    await postgresClient.close();
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
