import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthCheckService,
  HealthCheck,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';

import { Public } from '../decorators/public.decorator';
import { SkipRateLimit } from '../decorators/rate-limit.decorator';
import { ProxyService } from '../services/proxy.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly configService: ConfigService,
    private readonly proxyService: ProxyService
  ) {}

  @Public()
  @SkipRateLimit()
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // Memory check - heap should not exceed 500MB
      () => this.memory.checkHeap('memory_heap', 500 * 1024 * 1024),

      // RSS memory should not exceed 1GB
      () => this.memory.checkRSS('memory_rss', 1024 * 1024 * 1024),
    ]);
  }

  @Public()
  @SkipRateLimit()
  @Get('ready')
  async readiness() {
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      environment: this.configService.get<string>('nodeEnv'),
    };
  }

  @Public()
  @SkipRateLimit()
  @Get('live')
  async liveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Public()
  @SkipRateLimit()
  @Get('services')
  async servicesHealth() {
    const serviceNames = this.proxyService.getServiceNames();
    const results: Record<string, any> = {};

    for (const name of serviceNames) {
      const isHealthy = await this.proxyService.healthCheck(name);
      results[name] = {
        healthy: isHealthy,
      };
    }

    const allHealthy = Object.values(results).every((service) => service.healthy);

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      services: results,
      timestamp: new Date().toISOString(),
    };
  }
}
