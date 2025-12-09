import { Request, Response } from 'express';
import { SmartReplyService } from '../services/smart-reply.service';
import { createLogger } from '@flamoral/shared';

const logger = createLogger('automation-service:smart-reply-controller');

export class SmartReplyController {
  private smartReplyService: SmartReplyService;

  constructor() {
    this.smartReplyService = new SmartReplyService();
  }

  /**
   * Generate smart reply suggestions
   * POST /api/automation/smart-replies
   */
  generateSmartReplies = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id || req.user?.userId;
      const { conversationId, lastMessage, conversationHistory } = req.body;

      if (!conversationId || !lastMessage) {
        res.status(400).json({
          error: 'Conversation ID and last message are required',
        });
        return;
      }

      const suggestions = await this.smartReplyService.generateSmartReplies(
        userId,
        conversationId,
        lastMessage,
        conversationHistory || []
      );

      res.json({
        success: true,
        data: {
          suggestions,
          conversationId,
        },
      });
    } catch (error: any) {
      logger.error('Failed to generate smart replies', {
        error: error.message,
      });
      res.status(500).json({
        error: 'Failed to generate smart replies',
      });
    }
  };

  /**
   * Generate conversation starters
   * POST /api/automation/conversation-starters
   */
  generateConversationStarters = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const userId = req.user?.id || req.user?.userId;
      const { matchUserId, matchId } = req.body;

      if (!matchUserId) {
        res.status(400).json({
          error: 'Match user ID is required',
        });
        return;
      }

      const starters = await this.smartReplyService.generateConversationStarters(
        userId,
        matchUserId,
        matchId
      );

      res.json({
        success: true,
        data: {
          starters,
          matchUserId,
        },
      });
    } catch (error: any) {
      logger.error('Failed to generate conversation starters', {
        error: error.message,
      });
      res.status(500).json({
        error: 'Failed to generate conversation starters',
      });
    }
  };

  /**
   * Analyze message effectiveness
   * POST /api/automation/analyze-message
   */
  analyzeMessage = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id || req.user?.userId;
      const { message } = req.body;

      if (!message) {
        res.status(400).json({
          error: 'Message is required',
        });
        return;
      }

      const analysis = await this.smartReplyService.analyzeMessage(
        userId,
        message
      );

      res.json({
        success: true,
        data: analysis,
      });
    } catch (error: any) {
      logger.error('Failed to analyze message', {
        error: error.message,
      });
      res.status(500).json({
        error: 'Failed to analyze message',
      });
    }
  };

  /**
   * Rewrite message in different tone
   * POST /api/automation/rewrite-message
   */
  rewriteMessage = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id || req.user?.userId;
      const { message, targetTone } = req.body;

      if (!message || !targetTone) {
        res.status(400).json({
          error: 'Message and target tone are required',
        });
        return;
      }

      const validTones = ['casual', 'flirty', 'friendly', 'formal', 'playful'];
      if (!validTones.includes(targetTone)) {
        res.status(400).json({
          error: `Invalid tone. Must be one of: ${validTones.join(', ')}`,
        });
        return;
      }

      const rewrites = await this.smartReplyService.rewriteMessage(
        userId,
        message,
        targetTone
      );

      res.json({
        success: true,
        data: {
          original: message,
          targetTone,
          rewrites,
        },
      });
    } catch (error: any) {
      logger.error('Failed to rewrite message', {
        error: error.message,
      });
      res.status(500).json({
        error: 'Failed to rewrite message',
      });
    }
  };
}
