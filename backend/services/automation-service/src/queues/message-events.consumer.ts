import { createLogger } from '@flamoral/backend-shared';

import config from '../config';
import { GhostingDetectionService } from '../services/ghosting-detection.service';

import { rabbitmqClient } from './rabbitmq-client';

const logger = createLogger('automation-service:message-events');

/**
 * Message Events Consumer
 * Listens to message events for ghosting detection and conversation analysis
 */
export class MessageEventsConsumer {
  private ghostingService: GhostingDetectionService;

  constructor() {
    this.ghostingService = new GhostingDetectionService();
  }

  /**
   * Start consuming message events
   */
  async start(): Promise<void> {
    try {
      await rabbitmqClient.subscribe(
        config.rabbitmq.queues.message,
        ['message.sent', 'message.read', 'conversation.updated'],
        this.handleMessageEvent.bind(this)
      );

      logger.info('Started listening to message events');
    } catch (error: any) {
      logger.error('Failed to start', { error: error.message });
      throw error;
    }
  }

  /**
   * Handle message event
   */
  private async handleMessageEvent(event: any): Promise<void> {
    try {
      logger.info('Received event', { eventType: event.type });

      switch (event.type) {
        case 'message.sent':
          await this.handleMessageSent(event.data);
          break;
        case 'message.read':
          await this.handleMessageRead(event.data);
          break;
        case 'conversation.updated':
          await this.handleConversationUpdated(event.data);
          break;
        default:
          logger.warn('Unknown event type', { eventType: event.type });
      }
    } catch (error: any) {
      logger.error('Event handling failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Handle message sent event
   */
  private async handleMessageSent(data: any): Promise<void> {
    const { conversationId, senderId, recipientId } = data;

    // Check if this resolves a ghosting situation
    if (config.automation.enableGhostingDetection) {
      try {
        await this.ghostingService.markReEngagementSuccessful(conversationId);
      } catch (error: any) {
        logger.error('Ghosting resolution failed', { error: error.message });
      }
    }
  }

  /**
   * Handle message read event
   */
  private async handleMessageRead(data: any): Promise<void> {
    const { conversationId, messageId, readBy } = data;

    // Update conversation health metrics
    // This could trigger engagement scoring updates
  }

  /**
   * Handle conversation updated event
   */
  private async handleConversationUpdated(data: any): Promise<void> {
    const { conversationId } = data;

    // Check for ghosting if enabled
    if (config.automation.enableGhostingDetection) {
      try {
        await this.ghostingService.detectGhosting(conversationId);
      } catch (error: any) {
        logger.error('Ghosting detection failed', { error: error.message });
      }
    }
  }
}
