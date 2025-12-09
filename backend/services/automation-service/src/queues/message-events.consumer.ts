import { rabbitmqClient } from './rabbitmq-client';
import { GhostingDetectionService } from '../services/ghosting-detection.service';
import config from '../config';

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

      console.log('[MessageEventsConsumer] Started listening to message events');
    } catch (error: any) {
      console.error('[MessageEventsConsumer] Failed to start:', error.message);
      throw error;
    }
  }

  /**
   * Handle message event
   */
  private async handleMessageEvent(event: any): Promise<void> {
    try {
      console.log('[MessageEventsConsumer] Received event:', event.type);

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
          console.warn('[MessageEventsConsumer] Unknown event type:', event.type);
      }
    } catch (error: any) {
      console.error('[MessageEventsConsumer] Event handling failed:', error.message);
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
        console.error('[MessageEventsConsumer] Ghosting resolution failed:', error.message);
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
        console.error('[MessageEventsConsumer] Ghosting detection failed:', error.message);
      }
    }
  }
}
