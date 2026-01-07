import { Module } from '@nestjs/common';
import { ProfileModule } from './profile/profile.module';
import { HealthController } from './health.controller';

@Module({
  imports: [ProfileModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
