import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import dotenv from 'dotenv';

import { AppModule } from './app.module';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3015;
const logger = new Logger('SchedulerService');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // CORS configuration - production domains required
  const isProduction = process.env.NODE_ENV === 'production';
  const corsOrigins = process.env.CORS_ORIGINS?.split(',') || (
    isProduction
      ? ['https://flamoral.com', 'https://www.flamoral.com', 'https://app.flamoral.com']
      : ['http://localhost:3000', 'http://localhost:5173']
  );

  // Enable CORS
  app.enableCors({
    origin: corsOrigins,
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
  });

  // Health endpoint
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get('/health', (_req: any, res: any) => {
    res.status(200).json({
      status: 'healthy',
      service: 'scheduler-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  await app.listen(PORT);

  logger.log(`Scheduler Service running on port ${PORT}`);
  logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`Health check available at http://localhost:${PORT}/health`);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

bootstrap().catch((err) => {
  logger.error('Failed to start Scheduler Service:', err);
  process.exit(1);
});
