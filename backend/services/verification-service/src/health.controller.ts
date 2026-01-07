import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  MemoryHealthIndicator,
} from '@nestjs/terminus';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @HealthCheck()
  async check() {
    return this.health.check([
      // Check memory heap usage (max 150MB)
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      // Check RSS memory (max 300MB)
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),
    ]);
  }

  @Get()
  @ApiOperation({ summary: 'Service info endpoint' })
  getServiceInfo() {
    return {
      service: 'Flamoral Verification Service',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: '/health',
        docs: '/api/docs',
        verification: '/api/v1/verification',
      },
    };
  }
}
