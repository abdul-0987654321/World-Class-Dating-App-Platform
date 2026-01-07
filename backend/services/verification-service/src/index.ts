import 'reflect-metadata';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';

import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Security - Helmet
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production',
      crossOriginEmbedderPolicy: false,
    })
  );

  // Compression
  app.use(compression());

  // CORS - Allow internal services and admin panel
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:4000'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Internal-Service-Key', 'X-Request-ID'],
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // Swagger API documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Flamoral Verification Service API')
    .setDescription('Identity verification, photo verification, and document verification for the Flamoral dating platform')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth'
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-Internal-Service-Key',
        in: 'header',
        description: 'Internal service authentication key',
      },
      'Internal-Service-Key'
    )
    .addTag('verification', 'Identity and photo verification')
    .addTag('health', 'Health check endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3018;
  await app.listen(port);

  logger.log(`Verification Service running on: http://localhost:${port}`);
  logger.log(`API Documentation: http://localhost:${port}/api/docs`);
  logger.log(`Health endpoint: http://localhost:${port}/health`);
}

bootstrap();
