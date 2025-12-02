import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { TracingMiddleware } from './middleware/tracing.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // WebSocket adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  // Security - Helmet
  const enableHelmet = configService.get<boolean>('ENABLE_HELMET') !== false;
  if (enableHelmet) {
    app.use(
      helmet({
        contentSecurityPolicy: process.env.NODE_ENV === 'production',
        crossOriginEmbedderPolicy: false,
      }),
    );
  }

  // Compression
  const compressionEnabled = configService.get<boolean>('COMPRESSION_ENABLED') !== false;
  if (compressionEnabled) {
    app.use(compression());
  }

  // CORS
  const corsOrigins = configService.get<string[]>('cors.origins') || ['*'];
  const corsCredentials = configService.get<boolean>('cors.credentials') || true;

  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    credentials: corsCredentials,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Request-ID',
      'X-Correlation-ID',
    ],
    exposedHeaders: [
      'X-Request-ID',
      'X-Correlation-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'X-Response-Time',
    ],
  });

  // Apply tracing middleware globally
  const tracingMiddleware = app.get(TracingMiddleware);
  app.use(tracingMiddleware.use.bind(tracingMiddleware));

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
    }),
  );

  // Global filters and interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // Swagger API documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Heartly API Gateway')
    .setDescription('The Heartly Dating App API documentation')
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
      'JWT-auth',
    )
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management endpoints')
    .addTag('profiles', 'Profile management endpoints')
    .addTag('discovery', 'Profile discovery and matching')
    .addTag('matches', 'Match management')
    .addTag('messages', 'Messaging endpoints')
    .addTag('subscriptions', 'Subscription management')
    .addTag('health', 'Health check endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get<number>('PORT') || 4000;
  await app.listen(port);

  console.log(`🚀 Heartly API Gateway running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  console.log(`🔌 WebSocket endpoint: ws://localhost:${port}/ws`);
}

bootstrap();
