/**
 * Analytics Service Client
 * Handles communication with the analytics service for event tracking
 */

import { ServiceClient, createLogger } from '@flamoral/backend-shared';

import config from '../../config';

const logger = createLogger('analytics-service-client');

interface TrackEventDto {
  eventType: string;
  eventName: string;
  userId?: string;
  sessionId?: string;
  [key: string]: any;
}

interface UpdateFunnelStepDto {
  sessionId: string;
  userId: string;
  step: string;
}

export class AnalyticsServiceClient {
  private client: ServiceClient;
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.services.analyticsServiceUrl;
    this.client = new ServiceClient({
      baseUrl: this.baseUrl,
      serviceName: 'matching-service',
      timeout: 5000,
    });
  }

  /**
   * Track a custom event
   */
  async trackEvent(data: TrackEventDto): Promise<void> {
    try {
      await this.client.post('/api/tracking/event', data);
      logger.info(`Event tracked: ${data.eventType}.${data.eventName}`);
    } catch (error: any) {
      // Don't throw - analytics are non-critical
      logger.warn(`Failed to track event ${data.eventType}.${data.eventName}: ${error.message}`);
    }
  }

  /**
   * Track a match event
   */
  async trackMatch(data: {
    userId: string;
    matchedUserId: string;
    matchId: string;
    isFirstMatch?: boolean;
    timeSinceRegistration?: number;
  }): Promise<void> {
    await this.trackEvent({
      eventType: 'engagement',
      eventName: data.isFirstMatch ? 'first_match' : 'match_created',
      userId: data.userId,
      matchedUserId: data.matchedUserId,
      matchId: data.matchId,
      timeSinceRegistration: data.timeSinceRegistration,
    });
  }

  /**
   * Track a swipe event
   */
  async trackSwipe(data: {
    userId: string;
    targetUserId: string;
    action: 'like' | 'pass' | 'super_like';
    matched?: boolean;
  }): Promise<void> {
    await this.trackEvent({
      eventType: 'engagement',
      eventName: `swipe_${data.action}`,
      userId: data.userId,
      targetUserId: data.targetUserId,
      action: data.action,
      matched: data.matched,
    });
  }

  /**
   * Track undo swipe event
   */
  async trackUndoSwipe(data: {
    userId: string;
    targetUserId: string;
    previousAction: 'like' | 'pass' | 'super_like';
  }): Promise<void> {
    await this.trackEvent({
      eventType: 'engagement',
      eventName: 'swipe_undo',
      userId: data.userId,
      targetUserId: data.targetUserId,
      previousAction: data.previousAction,
    });
  }

  /**
   * Update funnel step (for first match tracking)
   */
  async updateFunnelStep(data: UpdateFunnelStepDto): Promise<void> {
    try {
      await this.client.post('/api/tracking/funnel/step', data);
      logger.info(`Funnel step updated: ${data.step} for user ${data.userId}`);
    } catch (error: any) {
      logger.warn(`Failed to update funnel step: ${error.message}`);
    }
  }

  /**
   * Track first match in funnel
   */
  async trackFirstMatchFunnel(userId: string, matchId: string, sessionId?: string): Promise<void> {
    if (sessionId) {
      await this.updateFunnelStep({
        sessionId,
        userId,
        step: 'firstMatchAt',
      });
    }

    await this.trackEvent({
      eventType: 'engagement',
      eventName: 'first_match',
      userId,
      matchId,
    });
  }
}

export default new AnalyticsServiceClient();
