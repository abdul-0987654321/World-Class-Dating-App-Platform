import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { createServer } from 'http';
import cron from 'node-cron';
import { createLogger } from '@flamoral/shared';
import config from './config';
import { initializeDatabase, closeDatabase } from './infrastructure/database/knex';
import { initializeRedis, closeRedis } from './infrastructure/cache/redis';
import { rabbitMQ } from './infrastructure/messaging/rabbitmq';
import { SocketManager } from './infrastructure/websocket/socket-manager';
import { MessageAutomationService } from './services/message-automation.service';
import automationRoutes from './routes';
import apiRoutes from './api/routes';

// Load environment variables
dotenv.config();

// Initialize logger
const logger = createLogger('automation-service');

// Create Express app
const app: Application = express();
const PORT = config.service.port;

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: config.cors.origins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Socket Manager instance
let socketManager: SocketManager;

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.cors.origins,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'automation-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'Flamoral Automation Service',
    version: '1.0.0',
    status: 'running',
    features: {
      autoDmFlows: config.automation.enableAutoDmFlows,
      icebreakerSuggestions: config.automation.enableIcebreakerSuggestions,
      ghostingDetection: config.automation.enableGhostingDetection,
      scheduledMessages: config.automation.enableScheduledMessages,
      aiReplyAssistant: config.automation.enableAiReplyAssistant,
    },
    endpoints: {
      health: '/health',
      api: '/api',
      icebreakers: '/api/icebreakers',
      replyAssistant: '/api/reply-assistant',
      scheduledMessages: '/api/scheduled-messages',
    },
  });
});

// Mount API routes
app.use('/api', apiRoutes);
app.use('/api/automation', automationRoutes);

// Setup RabbitMQ event handlers
async function setupEventHandlers(): Promise<void> {
  try {
    const messageAutomationService = new MessageAutomationService();

    // Subscribe to match events
    await rabbitMQ.subscribe('match_events', async (event) => {
      logger.info('Match event received', { eventType: event.type });

      if (event.type === 'match.created' && socketManager) {
        await socketManager.sendIcebreakerNotification(event.data.userId, {
          matchId: event.data.matchId,
          matchUserId: event.data.matchUserId,
        });
      }
    });

    // Subscribe to message events
    await rabbitMQ.subscribe('message_events', async (event) => {
      logger.info('Message event received', { eventType: event.type });

      if (event.type === 'message.received') {
        const result = await messageAutomationService.processIncomingMessage(
          event.data.recipientId,
          event.data.senderId,
          event.data.content,
          event.data.conversationId
        );

        if (result.shouldAutoRespond && result.response) {
          await rabbitMQ.publish('message.send', {
            senderId: event.data.recipientId,
            recipientId: event.data.senderId,
            content: result.response,
            type: 'text',
            metadata: { automated: true },
          });
        }
      }
    });

    // Bind queues
    await rabbitMQ.bindQueue('match_events', 'match.*');
    await rabbitMQ.bindQueue('message_events', 'message.*');

    logger.info('Event handlers setup completed');
  } catch (error: any) {
    logger.error('Failed to setup event handlers', { error: error.message });
    throw error;
  }
}

// Setup scheduled jobs
function setupScheduledJobs(): void {
  const messageAutomationService = new MessageAutomationService();

  cron.schedule('* * * * *', async () => {
    try {
      await messageAutomationService.processDueMessages();
    } catch (error: any) {
      logger.error('Failed to process due messages', { error: error.message });
    }
  });

  logger.info('Scheduled jobs setup completed');
}

// Initialize services and start server
async function startServer() {
  try {
    logger.info('Starting Automation Service', {
      env: config.service.env,
      port: PORT,
    });

    // Initialize database
    logger.info('Initializing database...');
    await initializeDatabase();

    // Initialize Redis
    logger.info('Initializing Redis...');
    await initializeRedis();

    // Initialize RabbitMQ
    logger.info('Initializing RabbitMQ...');
    await rabbitMQ.initialize();

    // Setup event handlers
    await setupEventHandlers();

    // Initialize Socket Manager
    socketManager = new SocketManager(io);
    logger.info('Socket Manager initialized');

    // Setup scheduled jobs
    setupScheduledJobs();

    // Start HTTP server
    httpServer.listen(PORT, () => {
      logger.info(`Automation Service running on port ${PORT}`);
      logger.info(`Environment: ${config.service.env}`);
      logger.info(`WebSocket endpoint: ws://localhost:${PORT}`);
    });
  } catch (error: any) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully...`);

  try {
    // Close HTTP server
    httpServer.close(() => {
      logger.info('HTTP server closed');
    });

    // Close RabbitMQ connection
    await rabbitMQ.close();

    // Close Redis connection
    await closeRedis();

    // Close database connection
    await closeDatabase();

    logger.info('Shutdown complete');
    process.exit(0);
  } catch (error: any) {
    logger.error('Error during shutdown', { error: error.message });
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('[AutomationService] Uncaught exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[AutomationService] Unhandled rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start the server
startServer();

export default app;
