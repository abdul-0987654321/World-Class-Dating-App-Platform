import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import configuration from './config/configuration';
import { validationSchema } from './config/validation';
import { HealthModule } from './health/health.module';
import { ProxyModule } from './services/proxy.module';
import { ControllersModule } from './controllers/controllers.module';
import { WebsocketModule } from './websocket/websocket.module';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RedisThrottlerGuard } from './guards/redis-throttler.guard';
import { TracingMiddleware } from './middleware/tracing.middleware';

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
  providers: [
    // Tracing middleware
    TracingMiddleware,

    // Global Redis-based rate limiting
    {
      provide: APP_GUARD,
      useClass: RedisThrottlerGuard,
    },
    // Global JWT authentication
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
