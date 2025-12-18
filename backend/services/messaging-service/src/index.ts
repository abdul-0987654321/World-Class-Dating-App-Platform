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
import { createValidator, commonValidations } from '../../../shared/utils/env-validator';

// Load environment variables
dotenv.config();

// Initialize logger
const logger = createLogger('messaging-service');

// Validate environment variables at startup
const validator = createValidator('messaging-service', [
  commonValidations.nodeEnv,
  commonValidations.port(3003),
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
const PORT = process.env.PORT || 3003;

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
    // Initialize Cosmos DB connection
    logger.info('Initializing Cosmos DB connection...');
    await cosmosClient.initialize();
    logger.info('Cosmos DB connection established');

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
  await cosmosClient.close();
  httpServer.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  await cosmosClient.close();
  httpServer.close(() => {
    process.exit(0);
  });
});

export default app;
