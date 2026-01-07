import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';

import { AppModule } from './app.module';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3016;

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Security middleware
  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CORS_ORIGINS?.split(',') || '*',
      credentials: true,
    })
  );

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Health check endpoint at root level
  app.getHttpAdapter().get('/health', (_req: any, res: any) => {
    res.status(200).json({
      status: 'healthy',
      service: 'search-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Root endpoint
  app.getHttpAdapter().get('/', (_req: any, res: any) => {
    res.json({
      service: 'Flamoral Search Service',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: '/health',
        search: '/api/v1/search',
        index: '/api/v1/search/index',
        suggestions: '/api/v1/search/suggestions',
      },
    });
  });

  await app.listen(PORT);

  console.log(`Search Service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API endpoints available at http://localhost:${PORT}/api/v1/search`);
}

bootstrap().catch((error) => {
  console.error('Failed to start Search Service:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});
