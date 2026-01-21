import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { BlindProfileService } from './blind-profile.service';
import { EmotionalAvailabilityService } from './emotional-availability.service';

@Module({
  controllers: [ProfileController],
  providers: [ProfileService, BlindProfileService, EmotionalAvailabilityService],
  exports: [ProfileService, BlindProfileService, EmotionalAvailabilityService],
})
export class ProfileModule {}
