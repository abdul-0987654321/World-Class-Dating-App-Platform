import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { HealthController } from './health.controller';
import { SubscriptionModule } from './subscription/subscription.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Feature modules
    SubscriptionModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
