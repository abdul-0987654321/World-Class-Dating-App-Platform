import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';

import { AppModule } from './app.module';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3019;
const logger = new Logger('WebhookService');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Enable raw body for webhook signature verification
    rawBody: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || '*',
    credentials: true,
  });

  await app.listen(PORT);

  logger.log(`Webhook Service running on port ${PORT}`);
  logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`Health check available at http://localhost:${PORT}/health`);
}

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  logger.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

bootstrap().catch((err) => {
  logger.error('Failed to start Webhook Service', err);
  process.exit(1);
});
