import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import { ThrottlerModule } from '@nestjs/throttler';

import configuration from './config/configuration';
import { validationSchema } from './config/validation';
import { ControllersModule } from './controllers/controllers.module';
import { RateLimitAdminController } from './controllers/rate-limit-admin.controller';
import { SecurityController } from './controllers/security.controller';
import { ComprehensiveRateLimitGuard } from './guards/comprehensive-rate-limit.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RedisThrottlerGuard } from './guards/redis-throttler.guard';
import { RolesGuard } from './guards/roles.guard';
import { HealthModule } from './health/health.module';
import { AdvancedRateLimiterMiddleware } from './middleware/advanced-rate-limiter.middleware';
import { CsrfMiddleware } from './middleware/csrf.middleware';
import { GpcMiddleware } from './middleware/gpc.middleware';
import { IdempotencyMiddleware } from './middleware/idempotency.middleware';
import { SecurityHeadersMiddleware } from './middleware/security-headers.middleware';
import { TracingMiddleware } from './middleware/tracing.middleware';
import { DDoSProtectionService } from './services/ddos-protection.service';
import { ProxyModule } from './services/proxy.module';
import { WebsocketModule } from './websocket/websocket.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('throttle.ttl') || 60000,
          limit: config.get<number>('throttle.limit') || 100,
        },
      ],
    }),

    // Health checks
    TerminusModule,
    HealthModule,

    // Proxy service for microservice communication
    ProxyModule,

    // REST API Controllers
    ControllersModule,

    // WebSocket Gateway
    WebsocketModule,
  ],
  controllers: [
    // Admin controllers for rate limit management
    RateLimitAdminController,
    // Security controller for CSP reporting
    SecurityController,
  ],
  providers: [
    // Tracing middleware
    TracingMiddleware,

    // Security headers middleware
    SecurityHeadersMiddleware,

    // CSRF protection middleware
    CsrfMiddleware,

    // GPC (Global Privacy Control) detection middleware - CCPA/CPRA
    GpcMiddleware,

    // Advanced rate limiting middleware
    AdvancedRateLimiterMiddleware,

    // DDoS protection service
    DDoSProtectionService,

    // Global comprehensive rate limiting (replaces RedisThrottlerGuard)
    {
      provide: APP_GUARD,
      useClass: ComprehensiveRateLimitGuard,
    },
    // Global JWT authentication
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Global RBAC enforcement - checks roles after JWT authentication
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },

    // Idempotency middleware
    IdempotencyMiddleware,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Apply GPC detection middleware to all routes
    consumer.apply(GpcMiddleware).forRoutes("*");

    // Apply idempotency middleware to payment-related routes
    consumer.apply(IdempotencyMiddleware).forRoutes(
      'api/v1/payments/*',
      'api/v1/subscriptions/*',
      'api/v1/coins/*',
      'api/v1/boosts/*'
    );
  }
}
