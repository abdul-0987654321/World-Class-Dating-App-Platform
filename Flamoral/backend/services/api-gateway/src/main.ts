import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, RequestMethod } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { TracingMiddleware } from './middleware/tracing.middleware';
import { SecurityHeadersMiddleware } from './middleware/security-headers.middleware';
import { CacheControlMiddleware } from './middleware/cache-control.middleware';
import { CsrfMiddleware } from './middleware/csrf.middleware';
import cookieParser from 'cookie-parser';
import { RedisIoAdapter } from './adapters/redis-io.adapter';

// Global error handlers - MUST be first to catch all unhandled errors
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  console.error('[API-GATEWAY] Unhandled Promise Rejection:', reason);
  if (reason instanceof Error) {
    console.error('[API-GATEWAY] Stack trace:', reason.stack);
  }
  // Don't exit - let the service continue but alert monitoring
});

process.on('uncaughtException', (error: Error) => {
  console.error('[API-GATEWAY] Uncaught Exception:', error.message);
  console.error('[API-GATEWAY] Stack trace:', error.stack);
  // For uncaught exceptions, we should exit after logging
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Redis-enabled WebSocket adapter for horizontal scaling
  const redisIoAdapter = new RedisIoAdapter(app, configService);

  // Try to connect to Redis, fall back to standalone mode if unavailable
  try {
    await redisIoAdapter.connectToRedis();
  } catch (error) {
    console.warn('⚠️ Failed to connect to Redis for Socket.IO adapter:', error.message);
    console.warn('⚠️ Running Socket.IO in standalone mode (no horizontal scaling)');
  }

  app.useWebSocketAdapter(redisIoAdapter);

  // Cookie parser - Required for CSRF protection
  app.use(cookieParser());

  // Cache Control Middleware - Set appropriate caching headers
  const cacheControlMiddleware = app.get(CacheControlMiddleware);
  app.use(cacheControlMiddleware.use.bind(cacheControlMiddleware));

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
      }),
    );
  }

  // Compression
  const compressionEnabled = configService.get<boolean>('COMPRESSION_ENABLED') !== false;
  if (compressionEnabled) {
    app.use(compression());
  }

  // CORS - Enhanced configuration for cross-origin requests and CSRF protection
  const corsOrigins = configService.get<string[]>('cors.origins') || [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5174',
    'https://flamoral.com',
    'https://www.flamoral.com',
    'https://admin.flamoral.com',
    'https://app.flamoral.com',
    'https://flamoral.vercel.app',
    'https://*.flamoral.com', // Allow all subdomains
  ];
  const corsCredentials = configService.get<boolean>('cors.credentials') !== false;

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, curl, server-to-server)
      if (!origin) return callback(null, true);

      // Check if origin matches allowed patterns
      const isAllowed = corsOrigins.some(allowedOrigin => {
        if (allowedOrigin === '*') return true;
        if (allowedOrigin.includes('*')) {
          // Handle wildcard subdomains like https://*.flamoral.com
          const pattern = allowedOrigin.replace(/\*/g, '.*');
          return new RegExp(`^${pattern}$`).test(origin);
        }
        return allowedOrigin === origin;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`CORS: Origin ${origin} not allowed`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    credentials: corsCredentials, // Required for cookies and authentication
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Request-ID',
      'X-Correlation-ID',
      'X-CSRF-Token',
      'x-csrf-token',
      'X-API-Key',
      'X-Device-ID',
      'X-Platform',
      'Accept',
      'Accept-Language',
      'Accept-Encoding',
      'Cache-Control',
      'Pragma',
    ],
    exposedHeaders: [
      'X-Request-ID',
      'X-Correlation-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'X-Response-Time',
      'X-CSRF-Token',
      'Set-Cookie',
    ],
    preflightContinue: false,
    optionsSuccessStatus: 204, // Some legacy browsers (IE11, various SmartTVs) choke on 204
    maxAge: 86400, // 24 hours - cache preflight requests
  });

  // Apply tracing middleware globally
  const tracingMiddleware = app.get(TracingMiddleware);
  app.use(tracingMiddleware.use.bind(tracingMiddleware));

  // CSRF Protection Middleware
  const csrfMiddleware = app.get(CsrfMiddleware);
  app.use(csrfMiddleware.use.bind(csrfMiddleware));

  // Global prefix - api/v1 to match frontend expectations
  // Routes will be: /api/v1/api/auth/*, /api/v1/api/users/*, etc.
  // Exclude health routes from global prefix so they remain at /health
  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'health', method: RequestMethod.ALL },
      { path: 'health/(.*)', method: RequestMethod.ALL },
    ],
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
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const wsProtocol = process.env.NODE_ENV === 'production' ? 'wss' : 'ws';

  await app.listen(port);

  console.log(`🚀 Heartly API Gateway running on: ${protocol}://localhost:${port}`);
  console.log(`📚 API Documentation: ${protocol}://localhost:${port}/api/docs`);
  console.log(`🔌 WebSocket endpoint: ${wsProtocol}://localhost:${port}/socket.io`);
  console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap();
