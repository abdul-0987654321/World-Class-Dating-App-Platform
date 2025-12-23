import { Request, Response } from 'express';
import { MessageAutomationService } from '../services/message-automation.service';
import { createLogger } from '@flamoral/backend-shared';

const logger = createLogger('automation-service:message-automation-controller');

export class MessageAutomationController {
  private messageAutomationService: MessageAutomationService;

  constructor() {
    this.messageAutomationService = new MessageAutomationService();
  }

  /**
   * Create auto-response template
   * POST /api/automation/auto-response
   */
  createAutoResponse = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id || req.user?.userId;
      const { trigger, response, enabled, conditions } = req.body;

      if (!trigger || !response) {
        res.status(400).json({
          error: 'Trigger and response are required',
        });
        return;
      }

      const template = await this.messageAutomationService.createAutoResponseTemplate(
        userId,
        {
          trigger,
          response,
          enabled,
          conditions,
        }
      );

      res.status(201).json({
        success: true,
        data: template,
      });
    } catch (error: any) {
      logger.error('Failed to create auto-response', {
        error: error.message,
      });
      res.status(500).json({
        error: 'Failed to create auto-response template',
      });
    }
  };

  /**
   * Schedule a message
   * POST /api/automation/schedule-message
   */
  scheduleMessage = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id || req.user?.userId;
      const {
        recipientId,
        message,
        scheduledAt,
        useOptimalTiming,
        timezone,
      } = req.body;

      if (!recipientId || !message) {
        res.status(400).json({
          error: 'Recipient ID and message are required',
        });
        return;
      }

      const schedule = await this.messageAutomationService.scheduleMessage(
        userId,
        recipientId,
        message,
        {
          preferredTime: scheduledAt ? new Date(scheduledAt) : undefined,
          useOptimalTiming,
          timezone,
        }
      );

      res.status(201).json({
        success: true,
        data: schedule,
      });
    } catch (error: any) {
      logger.error('Failed to schedule message', {
        error: error.message,
      });
      res.status(500).json({
        error: 'Failed to schedule message',
      });
    }
  };

  /**
   * Get user's scheduled messages
   * GET /api/automation/scheduled-messages
   */
  getScheduledMessages = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id || req.user?.userId;

      const messages = await this.messageAutomationService.getUserScheduledMessages(
        userId
      );

      res.json({
        success: true,
        data: messages,
      });
    } catch (error: any) {
      logger.error('Failed to get scheduled messages', {
        error: error.message,
      });
      res.status(500).json({
        error: 'Failed to get scheduled messages',
      });
    }
  };

  /**
   * Cancel scheduled message
   * DELETE /api/automation/scheduled-messages/:scheduleId
   */
  cancelScheduledMessage = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id || req.user?.userId;
      const { scheduleId } = req.params;

      await this.messageAutomationService.cancelScheduledMessage(
        scheduleId,
        userId
      );

      res.json({
        success: true,
        message: 'Scheduled message cancelled',
      });
    } catch (error: any) {
      logger.error('Failed to cancel scheduled message', {
        error: error.message,
      });
      res.status(500).json({
        error: 'Failed to cancel scheduled message',
      });
    }
  };
}
