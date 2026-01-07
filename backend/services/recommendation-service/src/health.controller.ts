import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'healthy',
      service: 'recommendation-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        memory: this.checkMemory(),
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

  private checkMemory(): boolean {
    const used = process.memoryUsage();
    const heapUsedMB = used.heapUsed / 1024 / 1024;
    // Return true if heap usage is under 500MB
    return heapUsedMB < 500;
  }
}
