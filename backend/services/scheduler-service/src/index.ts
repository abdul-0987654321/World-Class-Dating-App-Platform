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

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || '*',
    credentials: true,
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
