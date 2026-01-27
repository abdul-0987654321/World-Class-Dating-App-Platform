import { Module } from '@nestjs/common';

import { AnalyticsController } from './analytics.controller';
import { AuditController } from './audit.controller';
import { AuthController } from './auth.controller';
import { CallsController } from './calls.controller';
import { CommunityController } from './community.controller';
import { CsrfController } from './csrf.controller';
import { GemController } from './gem.controller';
import { MatchingController } from './matching.controller';
import { MediaController } from './media.controller';
import { MessagingController } from './messaging.controller';
import { PaymentController } from './payment.controller';
import { NotificationController } from './notification.controller';
import { ModerationController } from './moderation.controller';
import { PlatformController } from './platform.controller';
import { RootController } from './root.controller';
import { SafetyController } from './safety.controller';
import { UserController } from './user.controller';
import { VerificationController } from './verification.controller';

@Module({
  controllers: [
    RootController,
    AuthController,
    UserController,
    MatchingController,
    MessagingController,
    PaymentController,
    MediaController,
    NotificationController,
    ModerationController,
    AnalyticsController,
    CsrfController,
    PlatformController,
    AuditController,
    CallsController,
    VerificationController,
    SafetyController,
    GemController,
    CommunityController,
  ],
})
export class ControllersModule {}
