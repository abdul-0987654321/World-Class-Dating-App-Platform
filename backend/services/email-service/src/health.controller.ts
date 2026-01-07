import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('health')
  healthCheck() {
    return {
      status: 'healthy',
      service: 'email-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
    };
  }

  @Get()
  root() {
    return {
      service: 'Flamoral Email Service',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: '/health',
        sendEmail: 'POST /email/send',
        sendWelcome: 'POST /email/welcome',
        sendPasswordReset: 'POST /email/password-reset',
        sendMatchNotification: 'POST /email/match-notification',
        sendVerification: 'POST /email/verification',
      },
    };
  }
}
