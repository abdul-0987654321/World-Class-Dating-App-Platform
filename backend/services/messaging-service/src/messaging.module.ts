import { Module } from '@nestjs/common';

// Tier 2 Engagement Services
import { VulnerabilityWindowService } from './services/vulnerability-window.service';
import { ConversationMomentumService } from './services/conversation-momentum.service';
import { MicroDateService, createMicroDateService } from './services/micro-date.service';
import { GhostingPreventionService } from './services/ghosting-prevention.service';

// Controller
import { EngagementController } from './controllers/engagement.controller';

// Infrastructure
import redisClient from './infrastructure/cache/redis';

/**
 * Factory provider for MicroDateService
 * MicroDateService requires a Redis client to be injected
 */
const microDateServiceFactory = {
  provide: MicroDateService,
  useFactory: () => {
    return createMicroDateService(redisClient);
  },
};

/**
 * MessagingModule
 *
 * This module registers the Tier 2 engagement services for the messaging service:
 * - VulnerabilityWindowService: Time-limited deeper sharing feature for meaningful connection moments
 * - ConversationMomentumService: Real-time conversation momentum tracking and analysis
 * - MicroDateService: 15-minute video date booking for low-commitment first meetings
 * - GhostingPreventionService: Proactive re-engagement system for fading conversations
 *
 * All services are exported to be available for use by other modules.
 */
@Module({
  controllers: [EngagementController],
  providers: [
    VulnerabilityWindowService,
    ConversationMomentumService,
    microDateServiceFactory,
    GhostingPreventionService,
  ],
  exports: [
    VulnerabilityWindowService,
    ConversationMomentumService,
    MicroDateService,
    GhostingPreventionService,
  ],
})
export class MessagingModule {}
