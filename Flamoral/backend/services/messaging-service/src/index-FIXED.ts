import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { createLogger } from './utils/logger';
import { SocketManager } from './socket/socket-manager';
import cosmosClient from './infrastructure/database/cosmos-client';
import apiRoutes from './api/routes';
import internalRoutes from './api/routes/internal.routes';

// Load environment variables
dotenv.config();

// Initialize logger
const logger = createLogger('messaging-service');

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

// Initialize Socket Manager
const socketManager = new SocketManager(io);
logger.info('Socket Manager initialized');

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
    await cosmosClient.close();
  } catch (err) {
    logger.warn('Error closing Cosmos DB:', err);
  }
  httpServer.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  try {
    await cosmosClient.close();
  } catch (err) {
    logger.warn('Error closing Cosmos DB:', err);
  }
  httpServer.close(() => {
    process.exit(0);
  });
});

export default app;
