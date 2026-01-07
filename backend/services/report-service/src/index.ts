import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';

import { AppModule } from './app.module';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3014;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || '*',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );

  // Set global prefix for API routes
  app.setGlobalPrefix('api/v1');

  await app.listen(PORT);

  console.log(`Report Service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health endpoint: http://localhost:${PORT}/health`);
  console.log(`API endpoints available at http://localhost:${PORT}/api/v1`);
}

bootstrap().catch((error) => {
  console.error('Failed to start Report Service:', error);
  process.exit(1);
});
