import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import db from '../infrastructure/database/knex';
import { cache } from '../infrastructure/cache/redis';
import { rabbitMQ } from '../infrastructure/messaging/rabbitmq';
import config from '../config';
import { createLogger } from '@flamoral/backend-shared';

const logger = createLogger('automation-service:message-automation');

export interface AutoResponseTemplate {
  id: string;
  userId: string;
  trigger: string;
  response: string;
  enabled: boolean;
  conditions?: {
    timeOfDay?: string[];
    conversationContext?: string;
    userStatus?: string;
  };
}

export interface MessageSchedule {
  id: string;
  userId: string;
  recipientId: string;
  message: string;
  scheduledAt: Date;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  timezone?: string;
}

/**
 * Message Automation Service
 * Handles auto-responses, message scheduling, and timing optimization
 */
export class MessageAutomationService {
  private nlpServiceUrl: string;

  constructor() {
    this.nlpServiceUrl = config.services.ai;
  }

  /**
   * Create auto-response template
   */
  async createAutoResponseTemplate(
    userId: string,
    template: Partial<AutoResponseTemplate>
  ): Promise<AutoResponseTemplate> {
    try {
      const autoResponse: AutoResponseTemplate = {
        id: uuidv4(),
        userId,
        trigger: template.trigger || '',
        response: template.response || '',
        enabled: template.enabled ?? true,
        conditions: template.conditions,
      };

      // Store in cache for fast lookup
      const cacheKey = `auto_response:${userId}`;
      await cache.set(cacheKey, autoResponse, 86400); // 24 hours

      logger.info('Auto-response template created', {
        userId,
        templateId: autoResponse.id,
      });

      return autoResponse;
    } catch (error: any) {
      logger.error('Failed to create auto-response template', {
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Process incoming message and check for auto-response triggers
   */
  async processIncomingMessage(
    userId: string,
    senderId: string,
    message: string,
    conversationId: string
  ): Promise<{ shouldAutoRespond: boolean; response?: string }> {
    try {
      // Check if user has auto-responses enabled
      const cacheKey = `auto_response:${userId}`;
      const templates = await cache.get<AutoResponseTemplate[]>(cacheKey);

      if (!templates || templates.length === 0) {
        return { shouldAutoRespond: false };
      }

      // Analyze message context using NLP service
      const context = await this.analyzeMessageContext(message, conversationId);

      // Find matching template
      const matchingTemplate = templates.find((template) =>
        this.matchesTemplate(template, message, context)
      );

      if (matchingTemplate && matchingTemplate.enabled) {
        return {
          shouldAutoRespond: true,
          response: await this.personalizeResponse(
            matchingTemplate.response,
            userId,
            senderId,
            context
          ),
        };
      }

      return { shouldAutoRespond: false };
    } catch (error: any) {
      logger.error('Failed to process incoming message', {
        userId,
        error: error.message,
      });
      return { shouldAutoRespond: false };
    }
  }

  /**
   * Schedule a message for optimal timing
   */
  async scheduleMessage(
    userId: string,
    recipientId: string,
    message: string,
    options?: {
      preferredTime?: Date;
      useOptimalTiming?: boolean;
      timezone?: string;
    }
  ): Promise<MessageSchedule> {
    try {
      let scheduledAt: Date;

      if (options?.useOptimalTiming) {
        // Calculate optimal send time based on recipient's activity patterns
        scheduledAt = await this.calculateOptimalSendTime(recipientId, options.timezone);
      } else {
        scheduledAt = options?.preferredTime || new Date();
      }

      const schedule: MessageSchedule = {
        id: uuidv4(),
        userId,
        recipientId,
        message,
        scheduledAt,
        status: 'pending',
        timezone: options?.timezone,
      };

      // Store in database
      await db('scheduled_messages').insert({
        id: schedule.id,
        user_id: userId,
        recipient_id: recipientId,
        message,
        scheduled_at: scheduledAt,
        status: 'pending',
        timezone: options?.timezone,
        created_at: new Date(),
      });

      // Queue for processing
      await rabbitMQ.sendToQueue('automation_scheduled_messages', {
        scheduleId: schedule.id,
        scheduledAt: scheduledAt.toISOString(),
      });

      logger.info('Message scheduled', {
        userId,
        recipientId,
        scheduledAt,
      });

      return schedule;
    } catch (error: any) {
      logger.error('Failed to schedule message', {
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Calculate optimal send time based on recipient's activity
   */
  private async calculateOptimalSendTime(
    recipientId: string,
    timezone?: string
  ): Promise<Date> {
    try {
      // Get recipient's activity patterns from analytics
      const response = await axios.get(
        `${config.services.analytics}/api/internal/users/${recipientId}/activity-patterns`,
        {
          headers: {
            'X-Service-API-Key': config.serviceAuth.apiKey,
          },
        }
      );

      const patterns = response.data;

      // Find the most active hour
      const optimalHour = patterns.mostActiveHour || 19; // Default to 7 PM

      // Calculate next occurrence of that hour
      const now = new Date();
      const optimalTime = new Date(now);
      optimalTime.setHours(optimalHour, 0, 0, 0);

      // If that time has passed today, schedule for tomorrow
      if (optimalTime <= now) {
        optimalTime.setDate(optimalTime.getDate() + 1);
      }

      logger.debug('Calculated optimal send time', {
        recipientId,
        optimalTime,
        optimalHour,
      });

      return optimalTime;
    } catch (error: any) {
      logger.warn('Failed to calculate optimal send time, using default', {
        error: error.message,
      });

      // Default to 1 hour from now
      const defaultTime = new Date();
      defaultTime.setHours(defaultTime.getHours() + 1);
      return defaultTime;
    }
  }

  /**
   * Analyze message context using NLP service
   */
  private async analyzeMessageContext(
    message: string,
    conversationId: string
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${this.nlpServiceUrl}/api/v1/analyze/context`,
        {
          text: message,
          conversationId,
        },
        {
          headers: {
            'X-Service-API-Key': config.serviceAuth.apiKey,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      logger.warn('Failed to analyze message context', {
        error: error.message,
      });
      return {
        sentiment: 'neutral',
        intent: 'unknown',
        topics: [],
      };
    }
  }

  /**
   * Check if message matches template
   */
  private matchesTemplate(
    template: AutoResponseTemplate,
    message: string,
    context: any
  ): boolean {
    // Simple keyword matching (can be enhanced with NLP)
    const messageLower = message.toLowerCase();
    const triggerLower = template.trigger.toLowerCase();

    if (messageLower.includes(triggerLower)) {
      // Check additional conditions if any
      if (template.conditions) {
        if (template.conditions.conversationContext) {
          if (context.context !== template.conditions.conversationContext) {
            return false;
          }
        }

        if (template.conditions.timeOfDay) {
          const currentHour = new Date().getHours();
          const timeRanges = template.conditions.timeOfDay.map((range) => {
            const [start, end] = range.split('-').map(Number);
            return { start, end };
          });

          const inTimeRange = timeRanges.some(
            (range) => currentHour >= range.start && currentHour < range.end
          );

          if (!inTimeRange) {
            return false;
          }
        }
      }

      return true;
    }

    return false;
  }

  /**
   * Personalize response with user data
   */
  private async personalizeResponse(
    response: string,
    userId: string,
    senderId: string,
    context: any
  ): Promise<string> {
    try {
      // Get user profile
      const userResponse = await axios.get(
        `${config.services.user}/api/internal/users/${senderId}`,
        {
          headers: {
            'X-Service-API-Key': config.serviceAuth.apiKey,
          },
        }
      );

      const senderProfile = userResponse.data;

      // Replace placeholders
      let personalized = response
        .replace(/\{name\}/g, senderProfile.firstName || 'there')
        .replace(/\{time\}/g, this.getGreeting())
        .replace(/\{topic\}/g, context.topics?.[0] || 'that');

      return personalized;
    } catch (error: any) {
      logger.warn('Failed to personalize response', {
        error: error.message,
      });
      return response;
    }
  }

  /**
   * Get time-appropriate greeting
   */
  private getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  /**
   * Cancel scheduled message
   */
  async cancelScheduledMessage(scheduleId: string, userId: string): Promise<void> {
    try {
      await db('scheduled_messages')
        .where({ id: scheduleId, user_id: userId })
        .update({
          status: 'cancelled',
          updated_at: new Date(),
        });

      logger.info('Scheduled message cancelled', { scheduleId, userId });
    } catch (error: any) {
      logger.error('Failed to cancel scheduled message', {
        scheduleId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get user's scheduled messages
   */
  async getUserScheduledMessages(userId: string): Promise<MessageSchedule[]> {
    try {
      const messages = await db('scheduled_messages')
        .where({ user_id: userId, status: 'pending' })
        .orderBy('scheduled_at', 'asc');

      return messages.map((msg: any) => ({
        id: msg.id,
        userId: msg.user_id,
        recipientId: msg.recipient_id,
        message: msg.message,
        scheduledAt: msg.scheduled_at,
        status: msg.status,
        timezone: msg.timezone,
      }));
    } catch (error: any) {
      logger.error('Failed to get scheduled messages', {
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Process due scheduled messages
   */
  async processDueMessages(): Promise<void> {
    try {
      const dueMessages = await db('scheduled_messages')
        .where('status', 'pending')
        .where('scheduled_at', '<=', new Date())
        .limit(100);

      for (const msg of dueMessages) {
        try {
          // Send message via messaging service
          await axios.post(
            `${config.services.messaging}/api/internal/messages/send`,
            {
              senderId: msg.user_id,
              recipientId: msg.recipient_id,
              content: msg.message,
              type: 'text',
              metadata: {
                automated: true,
                scheduleId: msg.id,
              },
            },
            {
              headers: {
                'X-Service-API-Key': config.serviceAuth.apiKey,
              },
            }
          );

          // Update status
          await db('scheduled_messages')
            .where({ id: msg.id })
            .update({
              status: 'sent',
              sent_at: new Date(),
              updated_at: new Date(),
            });

          logger.info('Scheduled message sent', {
            scheduleId: msg.id,
            userId: msg.user_id,
          });
        } catch (error: any) {
          logger.error('Failed to send scheduled message', {
            scheduleId: msg.id,
            error: error.message,
          });

          // Mark as failed
          await db('scheduled_messages')
            .where({ id: msg.id })
            .update({
              status: 'failed',
              error: error.message,
              updated_at: new Date(),
            });
        }
      }
    } catch (error: any) {
      logger.error('Failed to process due messages', {
        error: error.message,
      });
    }
  }
}
