import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { createLogger } from './utils/logger';
import { SocketManager } from './socket/socket-manager';
import { CallSignalingHandler } from './socket/call-signaling.handler';
import { VideoCallService } from './services/video-call.service';
import cosmosClient from './infrastructure/database/cosmos-client';
import redisClient from './infrastructure/cache/redis';
import apiRoutes from './api/routes';
import internalRoutes from './api/routes/internal.routes';
import config from './config';

// Load environment variables
dotenv.config();

// Initialize logger
const logger = createLogger('messaging-service');

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

// Initialize Socket Manager (for messaging)
const socketManager = new SocketManager(io);
logger.info('Socket Manager initialized');

// Initialize Video Call Service
let videoCallService: VideoCallService | null = null;
let callSignalingHandler: CallSignalingHandler | null = null;

if (config.agora?.appId && config.agora?.appCertificate) {
  try {
    videoCallService = new VideoCallService(redisClient, {
      appId: config.agora.appId,
      appCertificate: config.agora.appCertificate,
      tokenExpiryTime: config.agora.tokenExpiryTime || 3600,
    });

    callSignalingHandler = new CallSignalingHandler(io, videoCallService);
    logger.info('Video Call Service initialized');

    // Setup call signaling handlers for connections
    io.on('connection', (socket) => {
      // Only setup call handlers if user is authenticated
      const userId = socket.handshake.auth.userId;
      if (userId && callSignalingHandler) {
        callSignalingHandler.setupHandlers(socket);
        logger.debug(`Call signaling handlers setup for user ${userId}`);
      }
    });
  } catch (error: any) {
    logger.error('Failed to initialize Video Call Service:', error);
    logger.warn('Video calling features will be disabled');
  }
} else {
  logger.warn('Agora credentials not configured - Video calling features disabled');
  logger.info('To enable video calling, set AGORA_APP_ID and AGORA_APP_CERTIFICATE in environment variables');
}

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
    videoCallsEnabled: !!videoCallService,
  });
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'Flamoral Messaging Service',
    version: '1.0.0',
    status: 'running',
    activeConnections: socketManager.getConnectedCount(),
    videoCallsEnabled: !!videoCallService,
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

// API endpoint to check video call service status
app.get('/api/video-calls/status', (req: Request, res: Response) => {
  res.json({
    enabled: !!videoCallService,
    connectedUsers: callSignalingHandler?.getConnectedUsersCount() || 0,
    agoraConfigured: !!(config.agora?.appId && config.agora?.appCertificate),
  });
});

// Initialize and start server
async function startServer() {
  try {
    // Initialize Redis connection
    try {
      await redisClient.connect();
      logger.info('Redis connection established');
    } catch (redisError: any) {
      logger.warn('Failed to connect to Redis:', redisError.message);
      logger.warn('Some features may be limited without Redis');
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
      logger.info(`Video Calling: ${videoCallService ? 'ENABLED' : 'DISABLED'}`);
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
    await redisClient.disconnect();
  } catch (err) {
    logger.warn('Error during shutdown:', err);
  }
  httpServer.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  try {
    await cosmosClient.close();
    await redisClient.disconnect();
  } catch (err) {
    logger.warn('Error during shutdown:', err);
  }
  httpServer.close(() => {
    process.exit(0);
  });
});

export default app;
