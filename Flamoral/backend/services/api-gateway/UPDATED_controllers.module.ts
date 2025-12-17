import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { UserController } from './user.controller';
import { ProfilesController } from './profiles.controller';
import { MatchingController } from './matching.controller';
import { MessagingController } from './messaging.controller';
import { PaymentController } from './payment.controller';
import { MediaController } from './media.controller';
import { NotificationController } from './notification.controller';
import { ModerationController } from './moderation.controller';
import { AnalyticsController } from './analytics.controller';
import { CsrfController } from './csrf.controller';
import { SafetyController } from './safety.controller';
import { AdminController } from './admin.controller';
import { AdvertisingController } from './advertising.controller';
import { AIController } from './ai.controller';
import { OAuthController } from './oauth.controller';
import { PolicyController } from './policy.controller';
import { AutomationController } from './automation.controller';
import { WorkflowController } from './workflow.controller';

@Module({
  controllers: [
    // Authentication & Authorization
    AuthController,
    OAuthController,

    // User & Profile Management
    UserController,
    ProfilesController,

    // Discovery & Matching
    MatchingController,

    // Communication
    MessagingController,

    // Payments & Subscriptions
    PaymentController,

    // Media Management
    MediaController,

    // Notifications
    NotificationController,

    // Content Moderation
    ModerationController,

    // Analytics & Insights
    AnalyticsController,

    // AI Services
    AIController,

    // Advertising
    AdvertisingController,

    // Admin
    AdminController,

    // Security
    CsrfController,
    SafetyController,

    // Policy Management
    PolicyController,

    // Automation
    AutomationController,

    // Workflow Engine
    WorkflowController,
  ],
})
export class ControllersModule {}
