import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('health')
  healthCheck() {
    return {
      status: 'healthy',
      service: 'profile-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get()
  root() {
    return {
      service: 'Flamoral Profile Service',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: '/health',
        profile: '/api/v1/profile',
        photos: '/api/v1/profile/photos',
        preferences: '/api/v1/profile/preferences',
        completeness: '/api/v1/profile/completeness',
      },
    };
  }
}
