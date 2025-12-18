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
import { createValidator, commonValidations } from '../../../shared/utils/env-validator';

// Load environment variables
dotenv.config();

// Validate environment variables at startup
const validator = createValidator('automation-service', [
  commonValidations.nodeEnv,
  commonValidations.port(3009),
  commonValidations.jwtAccessSecret,
  commonValidations.dbHost,
  commonValidations.dbPort,
  commonValidations.dbPassword,
  {
    name: 'DB_NAME',
    required: true,
    description: 'PostgreSQL database name for automation data',
  },
  {
    name: 'DB_USER',
    required: true,
    description: 'PostgreSQL database user',
  },
  {
    name: 'OPENAI_API_KEY',
    required: true,
    description: 'OpenAI API key for AI-powered automation features',
    minLength: 20,
    sensitive: true,
  },
  {
    name: 'RABBITMQ_URL',
    required: true,
    description: 'RabbitMQ connection URL for message queuing',
  },
  commonValidations.redisHost,
  commonValidations.redisPort,
]);
validator.validateOrThrow();

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
app.get('/health', async (req: Request, res: Response) => {
  const checks = {
    database: false,
    redis: false,
    rabbitmq: false,
  };

  try {
    // Check database - we'll need to import knex instance
    const db = await import('./infrastructure/database/knex');
    if (db && db.default) {
      await db.default.raw('SELECT 1');
      checks.database = true;
    }
  } catch (e) {
    logger.error('Database health check failed', e);
  }

  try {
    // Check Redis
    const redis = await import('./infrastructure/cache/redis');
    if (redis && redis.getRedisClient) {
      const client = redis.getRedisClient();
      if (client) {
        await client.ping();
        checks.redis = true;
      }
    }
  } catch (e) {
    logger.error('Redis health check failed', e);
  }

  try {
    // Check RabbitMQ
    if (rabbitMQ && rabbitMQ.isConnected()) {
      checks.rabbitmq = true;
    }
  } catch (e) {
    logger.error('RabbitMQ health check failed', e);
  }

  const healthy = Object.values(checks).every(v => v);
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    service: 'automation-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    checks,
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
app.use('/api/v1', apiRoutes);
app.use('/api/v1/automation', automationRoutes);

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
