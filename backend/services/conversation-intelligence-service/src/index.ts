/**
 * Conversation Intelligence Service - Main Entry Point
 * Connection scoring, ghost prevention, and intent signaling
 */

import 'reflect-metadata';
import { createValidator, commonValidations, createLogger } from '@flamoral/backend-shared';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';

import conversationRoutes from './api/routes/conversation.routes';
import config from './config';
import { dbClient } from './infrastructure/database/db-client';

const logger = createLogger('conversation-intelligence-service');

dotenv.config();

const validator = createValidator('conversation-intelligence-service', [
  commonValidations.nodeEnv,
  commonValidations.port(3032),
  commonValidations.jwtAccessSecret,
  commonValidations.jwtRefreshSecret,
  commonValidations.databaseUrl,
  commonValidations.dbHost,
  commonValidations.dbPort,
  {
    name: 'DB_NAME',
    required: true,
    description: 'PostgreSQL database name',
  },
  {
    name: 'DB_USER',
    required: true,
    description: 'PostgreSQL database user',
  },
  commonValidations.dbPassword,
  {
    name: 'SERVICE_API_KEY',
    required: true,
    description: 'Service-to-service API key',
    minLength: 32,
    sensitive: true,
  },
]);
validator.validateOrThrow();

// Ensure either DATABASE_URL or DB_HOST+DB_PASSWORD is set
if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
  throw new Error('[conversation-intelligence-service] Either DATABASE_URL or DB_HOST + DB_PASSWORD must be set');
}

const app: Application = express();
const PORT = config.port;

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Service-Key',
      'X-Request-ID',
      'X-Correlation-ID',
    ],
    exposedHeaders: ['X-Request-ID', 'X-Correlation-ID'],
    maxAge: 86400,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request logging
app.use((req: Request, res: Response, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', async (req: Request, res: Response) => {
  try {
    const dbHealthy = await dbClient.healthCheck();
    const poolStats = dbClient.getPoolStats();

    res.status(200).json({
      status: dbHealthy ? 'healthy' : 'unhealthy',
      service: 'conversation-intelligence-service',
      timestamp: new Date().toISOString(),
      database: {
        connected: dbHealthy,
        pool: poolStats,
      },
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'conversation-intelligence-service',
      error: error.message,
    });
  }
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'Flamoral Conversation Intelligence Service',
    version: '1.0.0',
    status: 'running',
    description:
      'Connection scoring, conversation analysis, ghost prevention, and intent signaling',
    endpoints: {
      health: '/health',
      connectionScore: {
        analyze: 'POST /api/v1/conversation/analyze',
        getScore: 'GET /api/v1/conversation/:conversationId/score',
        getAnalysis: 'GET /api/v1/conversation/:conversationId/analysis',
        getSuggestions: 'GET /api/v1/conversation/:conversationId/suggestions',
        dismissSuggestion: 'POST /api/v1/conversation/suggestions/:suggestionId/dismiss',
      },
      ghostPrevention: {
        assessRisk: 'GET /api/v1/conversation/:conversationId/ghost-risk',
        gracefulExit: 'POST /api/v1/conversation/:conversationId/graceful-exit',
        exitTemplates: 'GET /api/v1/conversation/exit-templates',
        feedback: 'GET /api/v1/conversation/feedback',
      },
      intent: {
        update: 'POST /api/v1/conversation/intent',
        get: 'GET /api/v1/conversation/intent',
        checkMatch: 'GET /api/v1/conversation/:conversationId/intent-match',
        options: 'GET /api/v1/conversation/intent-options',
        infer: 'GET /api/v1/conversation/:conversationId/infer-intent',
      },
    },
  });
});

// Routes
app.use('/api/v1/conversation', conversationRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
  });
});

// Error handler
app.use((error: any, req: Request, res: Response, next: any) => {
  logger.error('Error:', error);
  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Internal server error',
  });
});

// Start server
async function startServer() {
  try {
    logger.info('Starting Conversation Intelligence Service...');
    logger.info(`Environment: ${config.nodeEnv}`);

    await dbClient.initialize();
    logger.info('Database connection established');

    await dbClient.runMigrations();

    app.listen(PORT, () => {
      logger.info(`Conversation Intelligence Service running on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error: any) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received: closing server');
  await dbClient.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received: closing server');
  await dbClient.close();
  process.exit(0);
});

export default app;
