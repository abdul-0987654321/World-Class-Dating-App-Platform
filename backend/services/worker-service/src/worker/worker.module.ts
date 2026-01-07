import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { WorkerController } from './worker.controller';
import { WorkerService } from './worker.service';

@Module({
  imports: [ConfigModule],
  controllers: [WorkerController],
  providers: [WorkerService],
  exports: [WorkerService],
})
export class WorkerModule {}
