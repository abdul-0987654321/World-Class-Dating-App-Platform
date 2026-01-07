import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';

import { WorkerModule } from './worker/worker.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Health checks
    TerminusModule,

    // Worker module for background job processing
    WorkerModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
