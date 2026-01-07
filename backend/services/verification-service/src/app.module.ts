import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';

import { HealthController } from './health.controller';
import { VerificationModule } from './verification/verification.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Health checks
    TerminusModule,

    // Verification feature module
    VerificationModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
