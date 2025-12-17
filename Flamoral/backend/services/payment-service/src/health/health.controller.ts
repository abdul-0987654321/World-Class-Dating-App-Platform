import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  TypeOrmHealthIndicator,
  HealthCheckResult,
} from '@nestjs/terminus';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
  dependencies: {
    database: string;
    redis: string;
  };
  uptime: number;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async check(): Promise<HealthResponse> {
    const dependencies = {
      database: 'ok',
      redis: 'ok',
    };

    // Check database
    try {
      await this.db.pingCheck('database');
    } catch (error) {
      dependencies.database = 'error';
    }

    // Check Redis
    try {
      await this.redis.ping();
    } catch (error) {
      dependencies.redis = 'error';
    }

    const status = dependencies.database === 'ok' && dependencies.redis === 'ok'
      ? 'ok'
      : 'degraded';

    return {
      status,
      service: 'payment-service',
      timestamp: new Date().toISOString(),
      dependencies,
      uptime: process.uptime(),
    };
  }

  @Get('detailed')
  @HealthCheck()
  @ApiOperation({ summary: 'Detailed health check with NestJS Terminus' })
  checkDetailed(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.db.pingCheck('database'),
    ]);
  }
}
