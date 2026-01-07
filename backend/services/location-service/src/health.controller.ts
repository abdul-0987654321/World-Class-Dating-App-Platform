import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('health')
  getHealth() {
    return {
      status: 'healthy',
      service: 'location-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        service: true,
      },
    };
  }

  @Get()
  getRoot() {
    return {
      service: 'Flamoral Location Service',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: '/health',
        location: '/api/v1/location',
        nearby: '/api/v1/location/nearby',
        distance: '/api/v1/location/distance',
        privacy: '/api/v1/location/privacy',
      },
    };
  }
}
