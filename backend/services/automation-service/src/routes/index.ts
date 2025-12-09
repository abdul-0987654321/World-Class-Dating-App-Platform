import { Router } from 'express';
import { authenticateUser } from '../middleware/auth.middleware';
import { MessageAutomationController } from '../controllers/message-automation.controller';
import { SmartReplyController } from '../controllers/smart-reply.controller';
import { IcebreakerService } from '../services/icebreaker.service';

const router = Router();

// Initialize controllers
const messageAutomationController = new MessageAutomationController();
const smartReplyController = new SmartReplyController();

/**
 * Message Automation Routes
 */
router.post(
  '/auto-response',
  authenticateUser,
  messageAutomationController.createAutoResponse
);

router.post(
  '/schedule-message',
  authenticateUser,
  messageAutomationController.scheduleMessage
);

router.get(
  '/scheduled-messages',
  authenticateUser,
  messageAutomationController.getScheduledMessages
);

router.delete(
  '/scheduled-messages/:scheduleId',
  authenticateUser,
  messageAutomationController.cancelScheduledMessage
);

/**
 * Smart Reply Routes
 */
router.post(
  '/smart-replies',
  authenticateUser,
  smartReplyController.generateSmartReplies
);

router.post(
  '/conversation-starters',
  authenticateUser,
  smartReplyController.generateConversationStarters
);

router.post(
  '/analyze-message',
  authenticateUser,
  smartReplyController.analyzeMessage
);

router.post(
  '/rewrite-message',
  authenticateUser,
  smartReplyController.rewriteMessage
);

/**
 * Icebreaker Routes
 */
const icebreakerService = new IcebreakerService();

router.post('/icebreakers', authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { matchUserId, matchId, tone, includeEmoji } = req.body;

    if (!matchUserId || !matchId) {
      return res.status(400).json({
        error: 'Match user ID and match ID are required',
      });
    }

    const icebreakers = await icebreakerService.generateIcebreakers({
      userId,
      matchUserId,
      matchId,
      tone: tone || 'casual',
      includeEmoji: includeEmoji ?? true,
    });

    res.json({
      success: true,
      data: icebreakers,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to generate icebreakers',
    });
  }
});

router.post('/icebreakers/:suggestionId/mark-used', authenticateUser, async (req, res) => {
  try {
    const { suggestionId } = req.params;
    await icebreakerService.markAsUsed(suggestionId);

    res.json({
      success: true,
      message: 'Icebreaker marked as used',
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to mark icebreaker as used',
    });
  }
});

export default router;
