import { createLogger } from '@flamoral/backend-shared';
import { v4 as uuidv4 } from 'uuid';

import config from '../config';
import { GhostingDetectionDto, ReEngagementFlowDto } from '../dtos';
import db from '../infrastructure/database/knex';
import { TABLES, GhostingDetection, ReEngagementAttempt } from '../models';

import { ServiceClient } from './service-client';

const logger = createLogger('automation-service:ghosting-detection');

/**
 * Ghosting Detection Service
 * Detects when users are being ghosted and triggers re-engagement flows
 */
export class GhostingDetectionService {
  private messagingClient: ServiceClient;
  private notificationClient: ServiceClient;

  constructor() {
    this.messagingClient = new ServiceClient({
      baseURL: config.services.messaging,
      serviceName: 'automation-service',
    });
    this.notificationClient = new ServiceClient({
      baseURL: config.services.notification,
      serviceName: 'automation-service',
    });
  }

  /**
   * Check for ghosting in a conversation
   */
  async detectGhosting(conversationId: string): Promise<GhostingDetectionDto | null> {
    try {
      // Get conversation details
      const conversation = await this.getConversation(conversationId);
      if (!conversation) {
        return null;
      }

      const { userId, matchUserId, lastMessageAt, lastMessageFromUserId, messageCount } =
        conversation;

      // Calculate hours since last reply
      const hoursSinceLastReply = this.calculateHoursSince(lastMessageAt);

      // Check if threshold is met
      const isGhosted = hoursSinceLastReply >= config.ghosting.thresholdHours;

      if (!isGhosted) {
        return null;
      }

      // Check if already detected
      const existing = await this.getActiveGhostingDetection(conversationId);
      if (existing) {
        return this.mapToDto(existing);
      }

      // Create ghosting detection record
      const detection: GhostingDetection = {
        id: uuidv4(),
        conversation_id: conversationId,
        user_id: userId,
        match_user_id: matchUserId,
        last_message_at: lastMessageAt,
        last_message_from_user_id: lastMessageFromUserId,
        message_count: messageCount,
        hours_since_last_reply: hoursSinceLastReply,
        is_ghosted: true,
        detected_at: new Date(),
        resolved_at: null,
        resolution_type: null,
        created_at: new Date(),
      };

      await db(TABLES.GHOSTING_DETECTIONS).insert(detection);

      // Trigger re-engagement flow
      await this.triggerReEngagement(detection);

      return this.mapToDto(detection);
    } catch (error: any) {
      logger.error('Detection failed', { error: error.message });
      return null;
    }
  }

  /**
   * Trigger re-engagement flow
   */
  private async triggerReEngagement(detection: GhostingDetection): Promise<void> {
    try {
      // Check how many attempts already made
      const previousAttempts = await this.getReEngagementAttempts(detection.id);

      if (previousAttempts.length >= config.ghosting.maxReEngagementAttempts) {
        logger.info('Max re-engagement attempts reached');
        return;
      }

      const attemptNumber = previousAttempts.length + 1;

      // Calculate when to send re-engagement message
      const scheduledFor = new Date(
        Date.now() + config.ghosting.reEngagementDelayHours * 60 * 60 * 1000
      );

      // Generate re-engagement message suggestion
      const message = this.generateReEngagementMessage(attemptNumber, detection);

      // Create re-engagement attempt record
      const attempt: ReEngagementAttempt = {
        id: uuidv4(),
        ghosting_detection_id: detection.id,
        conversation_id: detection.conversation_id,
        user_id: detection.user_id,
        match_user_id: detection.match_user_id,
        attempt_number: attemptNumber,
        message_sent: message,
        channel: 'push',
        scheduled_for: scheduledFor,
        sent_at: null,
        was_successful: false,
        response_received_at: null,
        created_at: new Date(),
      };

      await db(TABLES.RE_ENGAGEMENT_ATTEMPTS).insert(attempt);

      // Schedule notification
      await this.scheduleReEngagementNotification(attempt, message);
    } catch (error: any) {
      logger.error('Failed to trigger re-engagement', { error: error.message });
    }
  }

  /**
   * Generate re-engagement message
   */
  private generateReEngagementMessage(attemptNumber: number, detection: GhostingDetection): string {
    const messages = [
      "Don't let this connection fade! Your match might be waiting to hear from you.",
      'Still interested? A simple message can reignite the spark!',
      "It's been a while - maybe they're waiting for you to reach out?",
    ];

    return messages[attemptNumber - 1] || messages[0];
  }

  /**
   * Schedule re-engagement notification
   */
  private async scheduleReEngagementNotification(
    attempt: ReEngagementAttempt,
    message: string
  ): Promise<void> {
    await this.notificationClient.post('/api/internal/notifications/send', {
      userId: attempt.user_id,
      type: 're_engagement',
      title: 'Missing a connection?',
      body: message,
      data: {
        conversationId: attempt.conversation_id,
        matchUserId: attempt.match_user_id,
        type: 're_engagement',
      },
      channel: 'push',
    });
  }

  /**
   * Mark ghosting as resolved
   */
  async resolveGhosting(conversationId: string, resolutionType: string): Promise<void> {
    await db(TABLES.GHOSTING_DETECTIONS)
      .where({
        conversation_id: conversationId,
        is_ghosted: true,
      })
      .update({
        is_ghosted: false,
        resolved_at: new Date(),
        resolution_type: resolutionType,
      });
  }

  /**
   * Mark re-engagement as successful
   */
  async markReEngagementSuccessful(conversationId: string): Promise<void> {
    const detection = await this.getActiveGhostingDetection(conversationId);
    if (!detection) {
      return;
    }

    await db(TABLES.RE_ENGAGEMENT_ATTEMPTS).where({ ghosting_detection_id: detection.id }).update({
      was_successful: true,
      response_received_at: new Date(),
    });

    await this.resolveGhosting(conversationId, 're_engaged');
  }

  /**
   * Helper methods
   */
  private async getConversation(conversationId: string): Promise<any> {
    const response = await this.messagingClient.get(
      `/api/internal/messages/conversation/${conversationId}`
    );
    return response.data;
  }

  private async getActiveGhostingDetection(
    conversationId: string
  ): Promise<GhostingDetection | null> {
    const detection = await db(TABLES.GHOSTING_DETECTIONS)
      .where({
        conversation_id: conversationId,
        is_ghosted: true,
      })
      .orderBy('detected_at', 'desc')
      .first();

    return detection || null;
  }

  private async getReEngagementAttempts(
    ghostingDetectionId: string
  ): Promise<ReEngagementAttempt[]> {
    return await db(TABLES.RE_ENGAGEMENT_ATTEMPTS)
      .where({ ghosting_detection_id: ghostingDetectionId })
      .orderBy('attempt_number', 'asc');
  }

  private calculateHoursSince(date: Date): number {
    const now = Date.now();
    const then = new Date(date).getTime();
    return Math.floor((now - then) / (1000 * 60 * 60));
  }

  private mapToDto(detection: GhostingDetection): GhostingDetectionDto {
    return {
      conversationId: detection.conversation_id,
      userId: detection.user_id,
      matchUserId: detection.match_user_id,
      lastMessageAt: detection.last_message_at,
      lastMessageFromUserId: detection.last_message_from_user_id,
      messageCount: detection.message_count,
      isGhosted: detection.is_ghosted,
      hoursSinceLastReply: detection.hours_since_last_reply,
    };
  }
}
