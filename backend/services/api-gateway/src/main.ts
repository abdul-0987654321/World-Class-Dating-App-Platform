import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { json, raw } from 'body-parser';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { CsrfMiddleware } from './middleware/csrf.middleware';
import { SecurityHeadersMiddleware } from './middleware/security-headers.middleware';
import { TracingMiddleware } from './middleware/tracing.middleware';
import logger from './utils/logger';

async function bootstrap() {
  // Create NestJS app with raw body option disabled (we'll handle it manually)
  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // Disable default body parser to handle raw body for webhooks
  });
  const configService = app.get(ConfigService);

  // WebSocket adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  // Cookie parser - Required for CSRF protection
  app.use(cookieParser());

  // Raw body parsing for webhook routes (required for Stripe signature verification)
  // This must come BEFORE JSON parsing
  app.use('/api/v1/webhooks', raw({ type: 'application/json' }));

  // JSON body parsing for all other routes
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Skip JSON parsing for webhook routes (already handled by raw parser above)
    if (req.path.startsWith('/api/v1/webhooks')) {
      return next();
    }
    json({ limit: '10mb' })(req, res, next);
  });

  // Security Headers Middleware - Comprehensive CSP and security headers
  const securityHeadersMiddleware = app.get(SecurityHeadersMiddleware);
  app.use(securityHeadersMiddleware.use.bind(securityHeadersMiddleware));

  // Security - Helmet (disabled CSP as we handle it in SecurityHeadersMiddleware)
  const enableHelmet = configService.get<boolean>('ENABLE_HELMET') !== false;
  if (enableHelmet) {
    app.use(
      helmet({
        contentSecurityPolicy: false, // Handled by SecurityHeadersMiddleware
        crossOriginEmbedderPolicy: false,
        crossOriginOpenerPolicy: false, // Handled by SecurityHeadersMiddleware
        crossOriginResourcePolicy: false, // Handled by SecurityHeadersMiddleware
        hsts: false, // Handled by SecurityHeadersMiddleware with better config
        frameguard: false, // Handled by SecurityHeadersMiddleware
        noSniff: false, // Handled by SecurityHeadersMiddleware
        xssFilter: false, // Handled by SecurityHeadersMiddleware
        referrerPolicy: false, // Handled by SecurityHeadersMiddleware
        permittedCrossDomainPolicies: false, // Handled by SecurityHeadersMiddleware
      })
    );
  }

  // Compression
  const compressionEnabled = configService.get<boolean>('COMPRESSION_ENABLED') !== false;
  if (compressionEnabled) {
    app.use(compression());
  }

  // CORS - Enhanced configuration for CSRF protection
  const isProduction = configService.get<string>('nodeEnv') === 'production';
  const corsOrigins =
    configService.get<string[]>('cors.origins') ||
    (isProduction
      ? [
          'https://flamoral.com',
          'https://www.flamoral.com',
          'https://app.flamoral.com',
          'https://api.flamoral.com',
        ]
      : ['http://localhost:5173', 'http://localhost:3000']);
  const corsCredentials = configService.get<boolean>('cors.credentials') !== false; // Default to true for cookie-based auth

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      // Check if origin is allowed
      if (corsOrigins.includes('*') || corsOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    credentials: corsCredentials, // Required for cookies
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Request-ID',
      'X-Correlation-ID',
      'X-CSRF-Token', // Allow CSRF token header
      'x-csrf-token',
      'stripe-signature', // Allow Stripe webhook signature header
      'x-paystack-signature', // Allow Paystack webhook signature header
      'verif-hash', // Allow Flutterwave webhook signature header
      'svix-id', // Clerk webhook headers (Svix)
      'svix-timestamp',
      'svix-signature',
    ],
    exposedHeaders: [
      'X-Request-ID',
      'X-Correlation-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'X-Response-Time',
      'X-CSRF-Token', // Expose CSRF token to client
    ],
    maxAge: 86400, // 24 hours
  });

  // Apply tracing middleware globally
  const tracingMiddleware = app.get(TracingMiddleware);
  app.use(tracingMiddleware.use.bind(tracingMiddleware));

  // CSRF Protection Middleware
  const csrfMiddleware = app.get(CsrfMiddleware);
  app.use(csrfMiddleware.use.bind(csrfMiddleware));

  // Global prefix - exclude health endpoints for Docker/K8s health checks
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'health/ready', 'health/live', 'health/services'],
  });

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

  // Global filters and interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());

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
      'JWT-auth'
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

  logger.info(`Flamoral API Gateway v2.0.0 running on port ${port}`);
  logger.info(`Environment: ${configService.get<string>('NODE_ENV') || 'development'}`);
  logger.info(`API Documentation: http://localhost:${port}/api/docs`);
  logger.info(`Health endpoint: http://localhost:${port}/health`);
}

bootstrap();
