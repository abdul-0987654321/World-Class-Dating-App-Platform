/**
 * Chat Moderation Routes
 * API endpoints for reporting, blocking, and content moderation
 */

import { Router, Request, Response } from 'express';

import conversationRepository from '../../domain/repositories/conversation.repository';
import { validateBody, ReportContentDto, BlockUserDto } from '../../dto';
import { chatModerationService, ReportReason } from '../../services/chat-moderation.service';
import { createLogger } from '../../utils/logger';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const logger = createLogger('moderation-routes');

/**
 * POST /api/moderation/report
 * Report a message or conversation
 */
router.post(
  '/report',
  authenticate,
  validateBody(ReportContentDto),
  async (req: Request, res: Response) => {
    try {
      const reporterId = (req as any).user?.id;
      const { conversationId, messageIds, reason, details, reportedUserId } = req.body;

      if (!reporterId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      if (!conversationId || !reason) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }

      // Validate reason
      const validReasons: ReportReason[] = [
        'harassment',
        'spam',
        'scam',
        'inappropriate_content',
        'impersonation',
        'threats',
        'underage',
        'solicitation',
        'other',
      ];

      if (!validReasons.includes(reason)) {
        return res.status(400).json({ success: false, error: 'Invalid report reason' });
      }

      // Verify reporter is participant in conversation
      const conversation = await conversationRepository.findById(conversationId);
      const isParticipant =
        conversation &&
        (conversation.participant1Id === reporterId || conversation.participant2Id === reporterId);
      if (!conversation || !isParticipant) {
        return res
          .status(403)
          .json({ success: false, error: 'Not authorized to report this conversation' });
      }

      // Get reported user ID if not provided
      let targetUserId = reportedUserId;
      if (!targetUserId) {
        targetUserId = conversationRepository.getOtherParticipant(conversation, reporterId);
      }

      const result = await chatModerationService.reportContent({
        reporterId,
        reportedUserId: targetUserId,
        conversationId,
        messageIds,
        reason,
        details,
      });

      if (result.success) {
        res.json({
          success: true,
          reportId: result.reportId,
          message: 'Report submitted successfully. Our team will review it within 24 hours.',
        });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error: any) {
      logger.error('Failed to submit report:', error);
      res.status(500).json({ success: false, error: 'Failed to submit report' });
    }
  }
);

/**
 * POST /api/moderation/block
 * Block a user from messaging
 */
router.post(
  '/block',
  authenticate,
  validateBody(BlockUserDto),
  async (req: Request, res: Response) => {
    try {
      const blockerId = (req as any).user?.id;
      const { userId: blockedId, conversationId } = req.body;

      if (!blockerId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      if (!blockedId) {
        return res.status(400).json({ success: false, error: 'Missing user ID to block' });
      }

      if (blockerId === blockedId) {
        return res.status(400).json({ success: false, error: 'Cannot block yourself' });
      }

      const result = await chatModerationService.blockUser(blockerId, blockedId, conversationId);

      if (result.success) {
        res.json({
          success: true,
          message: 'User blocked successfully. They will no longer be able to contact you.',
        });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error: any) {
      logger.error('Failed to block user:', error);
      res.status(500).json({ success: false, error: 'Failed to block user' });
    }
  }
);

/**
 * DELETE /api/moderation/block/:userId
 * Unblock a user
 */
router.delete('/block/:userId', authenticate, async (req: Request, res: Response) => {
  try {
    const blockerId = (req as any).user?.id;
    const blockedId = req.params.userId;

    if (!blockerId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Call user service to unblock
    const axios = require('axios');
    await axios.delete(
      `${process.env.USER_SERVICE_URL || 'http://user-service:3001'}/api/blocks/${blockedId}`,
      {
        data: { blockerId },
        timeout: 5000,
        headers: {
          'X-Service-Auth': process.env.INTERNAL_SERVICE_KEY || 'internal-service-key',
        },
      }
    );

    res.json({
      success: true,
      message: 'User unblocked successfully.',
    });
  } catch (error: any) {
    logger.error('Failed to unblock user:', error);
    res.status(500).json({ success: false, error: 'Failed to unblock user' });
  }
});

/**
 * GET /api/moderation/blocked
 * Get list of blocked users
 */
router.get('/blocked', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Call user service to get blocked users
    const axios = require('axios');
    const response = await axios.get(
      `${process.env.USER_SERVICE_URL || 'http://user-service:3001'}/api/blocks`,
      {
        params: { userId },
        timeout: 5000,
        headers: {
          'X-Service-Auth': process.env.INTERNAL_SERVICE_KEY || 'internal-service-key',
        },
      }
    );

    res.json({
      success: true,
      blockedUsers: response.data.blockedUsers || [],
    });
  } catch (error: any) {
    logger.error('Failed to get blocked users:', error);
    res.status(500).json({ success: false, error: 'Failed to get blocked users' });
  }
});

/**
 * GET /api/moderation/check/:userId
 * Check if a user is blocked
 */
router.get('/check/:userId', authenticate, async (req: Request, res: Response) => {
  try {
    const currentUserId = (req as any).user?.id;
    const targetUserId = req.params.userId;

    if (!currentUserId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const isBlocked = await chatModerationService.isBlocked(currentUserId, targetUserId);

    res.json({
      success: true,
      isBlocked,
    });
  } catch (error: any) {
    logger.error('Failed to check block status:', error);
    res.status(500).json({ success: false, error: 'Failed to check block status' });
  }
});

/**
 * GET /api/moderation/safety-tips
 * Get safety tips for users
 */
router.get('/safety-tips', async (req: Request, res: Response) => {
  const safetyTips = {
    general: [
      'Never share personal financial information',
      'Meet in public places for first dates',
      "Tell a friend where you're going",
      'Trust your instincts - if something feels off, it probably is',
      'Take your time getting to know someone before meeting in person',
    ],
    spotScams: [
      'Be wary of profiles that seem too good to be true',
      'Watch out for requests for money, no matter the reason',
      'Be cautious of people who avoid video calls or meeting in person',
      "Don't click on suspicious links",
      'Report users who ask you to move to other platforms immediately',
    ],
    reporting: [
      'You can report any user from their profile or chat',
      'Reports are reviewed by our safety team within 24 hours',
      'You can block any user at any time',
      'Your reports are confidential and help keep our community safe',
    ],
  };

  res.json({
    success: true,
    tips: safetyTips,
  });
});

export default router;
