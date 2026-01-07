import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { WebhookModule } from './webhook/webhook.module';

@Module({
  imports: [WebhookModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
