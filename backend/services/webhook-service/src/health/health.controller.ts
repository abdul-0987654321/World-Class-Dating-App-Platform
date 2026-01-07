import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'healthy',
      service: 'webhook-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        service: true,
      },
    };
  }

  @Get('ready')
  readiness() {
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  @Get('live')
  liveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
