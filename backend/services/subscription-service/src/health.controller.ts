import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('health')
  health() {
    return {
      status: 'healthy',
      service: 'subscription-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get()
  root() {
    return {
      service: 'Flamoral Subscription Service',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: '/health',
        subscriptions: '/api/v1/subscriptions',
      },
    };
  }
}
