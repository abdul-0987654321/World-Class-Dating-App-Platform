/**
 * Flamoral Backend Server
 * Main entry point for REST + GraphQL + WebSocket servers
 */

import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';
import { createGraphQLServer } from './api/graphql';
import { createWebSocketServer } from './api/websocket';
import { logger } from './utils/logger';
import { connectDatabases, disconnectDatabases } from './config/database.config';
import { connectRedis } from './config/redis.config';
import { connectQueue } from './config/queue.config';
import { EnvValidator } from './utils/envValidator';

const REST_PORT = process.env.PORT || 3000;
const GRAPHQL_PORT = process.env.GRAPHQL_PORT || 4000;
const WS_PORT = process.env.WS_PORT || 5000;

async function startServer() {
  try {
    logger.info('Starting Flamoral Backend...');

    // Validate environment variables first
    logger.info('Validating environment configuration...');
    if (!EnvValidator.validateAndSetDefaults()) {
      logger.error('Environment validation failed. Cannot start server.');
      process.exit(1);
    }
    logger.info('Environment validation passed');

    // Connect to databases
    logger.info('Connecting to databases...');
    await connectDatabases();
    await connectRedis();
    await connectQueue();
    logger.info('All database connections established');

    // Create and start REST API server
    const app = createApp();
    const restServer = app.listen(REST_PORT, () => {
      logger.info(`REST API server running on port ${REST_PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`API Documentation: http://localhost:${REST_PORT}/api-docs`);
    });

    // Create and start GraphQL server
    const graphqlServer = await createGraphQLServer();
    await graphqlServer.listen(Number(GRAPHQL_PORT));
    logger.info(`GraphQL server running on port ${GRAPHQL_PORT}`);
    logger.info(`GraphQL Playground: http://localhost:${GRAPHQL_PORT}/graphql`);

    // Create and start WebSocket server
    const wsServer = createWebSocketServer();
    wsServer.listen(WS_PORT, () => {
      logger.info(`WebSocket server running on port ${WS_PORT}`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      // Close servers
      restServer.close(() => logger.info('REST server closed'));
      await graphqlServer.stop();
      logger.info('GraphQL server closed');
      wsServer.close(() => logger.info('WebSocket server closed'));

      // Disconnect from databases
      await disconnectDatabases();
      logger.info('All database connections closed');

      process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
