import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health/health.controller';
import configuration from './config';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [() => configuration],
      envFilePath: ['.env.local', '.env'],
    }),

    // Health checks
    TerminusModule,
  ],
  controllers: [
    HealthController,
  ],
  providers: [],
})
export class AppModule {}
