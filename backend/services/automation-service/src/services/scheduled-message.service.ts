import { v4 as uuidv4 } from 'uuid';
import cron from 'node-cron';
import db from '../infrastructure/database/knex';
import { TABLES, ScheduledMessage } from '../models';
import {
  CreateScheduledMessageDto,
  UpdateScheduledMessageDto,
  ScheduledMessageResponseDto,
  MatchWarmupSequenceDto,
} from '../dtos';
import config from '../config';
import { ServiceClient } from './service-client';

/**
 * Scheduled Message Service
 * Handles scheduling and sending of automated messages
 */
export class ScheduledMessageService {
  private messagingClient: ServiceClient;
  private notificationClient: ServiceClient;
  private activeCronJobs: Map<string, any> = new Map();

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
   * Create a scheduled message
   */
  async createScheduledMessage(dto: CreateScheduledMessageDto): Promise<ScheduledMessageResponseDto> {
    try {
      const id = uuidv4();

      const scheduledMessage: ScheduledMessage = {
        id,
        user_id: dto.userId,
        match_id: dto.matchId || null,
        conversation_id: dto.conversationId || null,
        message_type: dto.messageType,
        schedule_type: dto.scheduleType,
        scheduled_for: dto.scheduledFor,
        cron_expression: dto.cronExpression || null,
        content: dto.content || '',
        template_id: dto.templateId || null,
        template_variables: dto.templateVariables || {},
        channel: dto.channel,
        status: 'pending',
        is_active: dto.isActive !== false,
        last_sent_at: null,
        next_send_at: dto.scheduledFor,
        send_count: 0,
        error_message: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      await db(TABLES.SCHEDULED_MESSAGES).insert(scheduledMessage);

      // Schedule the job if active
      if (scheduledMessage.is_active) {
        await this.scheduleJob(scheduledMessage);
      }

      return this.mapToDto(scheduledMessage);
    } catch (error: any) {
      console.error('[ScheduledMessage] Create failed:', error.message);
      throw error;
    }
  }

  /**
   * Update a scheduled message
   */
  async updateScheduledMessage(
    id: string,
    dto: UpdateScheduledMessageDto
  ): Promise<ScheduledMessageResponseDto> {
    try {
      const updates: any = {
        ...dto,
        updated_at: new Date(),
      };

      await db(TABLES.SCHEDULED_MESSAGES).where({ id }).update(updates);

      const updated = await this.getScheduledMessage(id);
      if (!updated) {
        throw new Error('Scheduled message not found');
      }

      // Reschedule if changed
      if (dto.isActive !== undefined || dto.scheduledFor || dto.cronExpression) {
        this.cancelJob(id);
        if (updated.is_active) {
          await this.scheduleJob(updated);
        }
      }

      return this.mapToDto(updated);
    } catch (error: any) {
      console.error('[ScheduledMessage] Update failed:', error.message);
      throw error;
    }
  }

  /**
   * Delete a scheduled message
   */
  async deleteScheduledMessage(id: string): Promise<void> {
    this.cancelJob(id);
    await db(TABLES.SCHEDULED_MESSAGES).where({ id }).delete();
  }

  /**
   * Create match warmup sequence
   */
  async createMatchWarmupSequence(dto: MatchWarmupSequenceDto): Promise<ScheduledMessageResponseDto[]> {
    const results: ScheduledMessageResponseDto[] = [];

    for (const warmupMsg of dto.sequence) {
      const scheduledFor = new Date(Date.now() + warmupMsg.delayHours * 60 * 60 * 1000);

      const scheduled = await this.createScheduledMessage({
        userId: dto.userId,
        matchId: dto.matchId,
        conversationId: dto.conversationId,
        messageType: 'MATCH_WARMUP' as any,
        scheduleType: 'ONCE' as any,
        scheduledFor,
        content: warmupMsg.content,
        channel: warmupMsg.channel,
        isActive: true,
      });

      results.push(scheduled);
    }

    return results;
  }

  /**
   * Schedule a job for sending the message
   */
  private async scheduleJob(message: ScheduledMessage): Promise<void> {
    try {
      if (message.schedule_type === 'ONCE') {
        // Schedule one-time message
        const delay = new Date(message.scheduled_for).getTime() - Date.now();
        if (delay > 0) {
          const timeoutId = setTimeout(() => {
            this.sendMessage(message.id);
          }, delay);

          this.activeCronJobs.set(message.id, { type: 'timeout', id: timeoutId });
        }
      } else if (message.cron_expression) {
        // Schedule recurring message
        const task = cron.schedule(message.cron_expression, () => {
          this.sendMessage(message.id);
        });

        this.activeCronJobs.set(message.id, { type: 'cron', task });
      }
    } catch (error: any) {
      console.error('[ScheduledMessage] Schedule job failed:', error.message);
    }
  }

  /**
   * Cancel a scheduled job
   */
  private cancelJob(messageId: string): void {
    const job = this.activeCronJobs.get(messageId);
    if (job) {
      if (job.type === 'timeout') {
        clearTimeout(job.id);
      } else if (job.type === 'cron') {
        job.task.stop();
      }
      this.activeCronJobs.delete(messageId);
    }
  }

  /**
   * Send the scheduled message
   */
  private async sendMessage(messageId: string): Promise<void> {
    try {
      const message = await this.getScheduledMessage(messageId);
      if (!message || !message.is_active) {
        return;
      }

      // Send based on channel
      if (message.channel === 'message' && message.conversation_id) {
        await this.messagingClient.post('/api/internal/messages/send-system', {
          conversationId: message.conversation_id,
          userId: message.user_id,
          content: message.content,
          type: 'automation',
        });
      } else if (['push', 'email', 'sms'].includes(message.channel)) {
        await this.notificationClient.post('/api/internal/notifications/send', {
          userId: message.user_id,
          type: message.message_type,
          title: this.getNotificationTitle(message.message_type),
          body: message.content,
          channel: message.channel,
        });
      }

      // Update message record
      const updates: any = {
        status: 'sent',
        last_sent_at: new Date(),
        send_count: db.raw('send_count + 1'),
      };

      // Calculate next send time for recurring messages
      if (message.schedule_type !== 'ONCE' && message.cron_expression) {
        updates.next_send_at = this.calculateNextSendTime(message.cron_expression);
      } else {
        updates.is_active = false;
      }

      await db(TABLES.SCHEDULED_MESSAGES).where({ id: messageId }).update(updates);
    } catch (error: any) {
      console.error('[ScheduledMessage] Send failed:', error.message);

      await db(TABLES.SCHEDULED_MESSAGES)
        .where({ id: messageId })
        .update({
          status: 'failed',
          error_message: error.message,
        });
    }
  }

  /**
   * Initialize all pending scheduled messages
   */
  async initializeScheduledJobs(): Promise<void> {
    try {
      const pendingMessages = await db(TABLES.SCHEDULED_MESSAGES)
        .where({ is_active: true, status: 'pending' })
        .select('*');

      for (const message of pendingMessages) {
        await this.scheduleJob(message);
      }

      console.log(`[ScheduledMessage] Initialized ${pendingMessages.length} scheduled jobs`);
    } catch (error: any) {
      console.error('[ScheduledMessage] Initialize jobs failed:', error.message);
    }
  }

  /**
   * Helper methods
   */
  private async getScheduledMessage(id: string): Promise<ScheduledMessage | null> {
    const message = await db(TABLES.SCHEDULED_MESSAGES).where({ id }).first();
    return message || null;
  }

  private getNotificationTitle(messageType: string): string {
    const titles: Record<string, string> = {
      engagement_nudge: 'Your matches are waiting!',
      match_warmup: 'New match alert',
      weekly_digest: 'Your weekly dating summary',
      daily_summary: 'Today on Flamoral',
      reminder: 'Reminder',
    };

    return titles[messageType] || 'Notification';
  }

  private calculateNextSendTime(cronExpression: string): Date {
    // Simple calculation - in production, use a proper cron parser
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }

  private mapToDto(message: ScheduledMessage): ScheduledMessageResponseDto {
    return {
      id: message.id,
      userId: message.user_id,
      matchId: message.match_id,
      conversationId: message.conversation_id,
      messageType: message.message_type,
      scheduleType: message.schedule_type,
      scheduledFor: message.scheduled_for,
      cronExpression: message.cron_expression,
      content: message.content,
      channel: message.channel,
      status: message.status,
      isActive: message.is_active,
      lastSentAt: message.last_sent_at,
      nextSendAt: message.next_send_at,
      sendCount: message.send_count,
      errorMessage: message.error_message,
      createdAt: message.created_at,
      updatedAt: message.updated_at,
    };
  }
}
