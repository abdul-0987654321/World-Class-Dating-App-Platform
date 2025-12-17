/**
 * Standardized CORS Configuration for All Flamoral Microservices
 *
 * This file contains the recommended CORS configuration that should be
 * applied consistently across all microservices in the Flamoral platform.
 *
 * USAGE:
 * Copy this configuration to each microservice's main.ts file.
 * Ensure CORS_ORIGINS environment variable is properly set.
 */

import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

export function setupCORS(app: any, configService: ConfigService) {
  // Get allowed origins from environment configuration
  const corsOriginsString = configService.get<string>('CORS_ORIGINS');
  const corsOrigins = corsOriginsString
    ? corsOriginsString.split(',').map(origin => origin.trim())
    : [
        'http://localhost:3000',
        'http://localhost:4000',
        'http://localhost:5173',
        'http://localhost:5174',
        'https://flamoral.com',
        'https://www.flamoral.com',
        'https://app.flamoral.com',
        'https://admin.flamoral.com',
      ];

  const corsCredentials = configService.get<boolean>('CORS_CREDENTIALS') !== false;

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
      'X-Internal-Service-Key',
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
    optionsSuccessStatus: 204,
    maxAge: 86400, // 24 hours - cache preflight requests
  });
}

/**
 * Example usage in main.ts:
 *
 * import { setupCORS } from './cors.config';
 *
 * async function bootstrap() {
 *   const app = await NestFactory.create(AppModule);
 *   const configService = app.get(ConfigService);
 *
 *   setupCORS(app, configService);
 *
 *   // ... rest of bootstrap
 * }
 */
