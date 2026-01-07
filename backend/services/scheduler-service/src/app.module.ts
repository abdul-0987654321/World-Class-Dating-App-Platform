import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { SchedulerModule } from './scheduler/scheduler.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    SchedulerModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
