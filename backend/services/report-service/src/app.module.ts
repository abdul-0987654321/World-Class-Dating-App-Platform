import { Module } from '@nestjs/common';
import { Controller, Get } from '@nestjs/common';

import { ReportModule } from './report/report.module';

@Controller()
class HealthController {
  @Get('health')
  health() {
    return {
      status: 'healthy',
      service: 'report-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get()
  root() {
    return {
      service: 'Flamoral Report Service',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: '/health',
        reports: '/api/v1/reports',
      },
    };
  }
}

@Module({
  imports: [ReportModule],
  controllers: [HealthController],
})
export class AppModule {}
