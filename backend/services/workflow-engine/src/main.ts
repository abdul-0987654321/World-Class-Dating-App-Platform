import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

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
    origin: ['http://localhost:3000', 'http://localhost:4000'],
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
    .setTitle('Flamoral Workflow Engine API')
    .setDescription('Visual workflow builder system for dating automation (Zapier/n8n style)')
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
    .addTag('workflows', 'Workflow management')
    .addTag('execution', 'Workflow execution and history')
    .addTag('analytics', 'Workflow analytics and performance')
    .addTag('health', 'Health check endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get<number>('port') || 3011;
  await app.listen(port);

  console.log(`🚀 Workflow Engine running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  console.log(`🔄 Workflow automation active`);
}

bootstrap();
