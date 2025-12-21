import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { UserController } from './user.controller';
import { MatchingController } from './matching.controller';
import { MessagingController } from './messaging.controller';
import { PaymentController } from './payment.controller';
import { MediaController } from './media.controller';
import { NotificationController } from './notification.controller';
import { ModerationController } from './moderation.controller';
import { AnalyticsController } from './analytics.controller';
import { CsrfController } from './csrf.controller';
import { PlatformController } from './platform.controller';
import { AuditController } from './audit.controller';

@Module({
  controllers: [
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
  ],
})
export class ControllersModule {}
